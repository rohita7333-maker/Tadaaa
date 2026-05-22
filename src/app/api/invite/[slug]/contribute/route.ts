import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "crypto";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit, getIp } from "@/lib/rate-limit";
import { scanImage } from "@/lib/moderation";
import { logAudit } from "@/lib/audit";

/**
 * Collaborative memory invites — contribution endpoint.
 *
 * Anonymous: no session required. The owner opts in by setting
 * `invites.accept_contributions = true` in the create wizard. Each visitor
 * (hashed from IP + UA + invite_id) can contribute at most once per invite —
 * the duplicate INSERT collides on the UNIQUE constraint and we return a
 * graceful `{ ok: true, dedup: true }` so a double-tap on the submit button
 * never surfaces a scary error.
 *
 * Photo moderation runs BEFORE the insert and uses the same fail-open
 * Sightengine path as the main upload flow. Non-image messages skip
 * moderation entirely.
 *
 * Audit log entries omit contributor name + email by design — only flags
 * (has_photo / has_message) and invite_id are recorded so admins can spot
 * abuse patterns without leaking PII into the audit table.
 */
const Body = z.object({
  name: z.string().min(1).max(60),
  email: z.string().email().optional(),
  message: z.string().max(500).optional(),
  photoUrl: z.string().url().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const ip = getIp(req.headers);

  // 10 contributions per hour per IP. Sized for a family group on one Wi-Fi
  // network (everyone home for grandma's birthday) without enabling spam.
  const allowed = await rateLimit(`contribute:${ip}`, 10, 3600_000);
  if (!allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const supabase = createAdminClient();
  const { data: invite } = await supabase
    .from("invites")
    .select("id, accept_contributions, is_active, status")
    .eq("slug", slug)
    .maybeSingle();

  if (!invite) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!invite.is_active || invite.status === "expired") {
    return NextResponse.json({ error: "inactive" }, { status: 410 });
  }
  if (!invite.accept_contributions) {
    return NextResponse.json({ error: "not_accepting" }, { status: 403 });
  }

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "bad_input" }, { status: 400 });
  }

  // Require at least a message OR a photo — a name-only contribution would
  // render as a blank polaroid in the reveal.
  if (!parsed.message && !parsed.photoUrl) {
    return NextResponse.json({ error: "empty" }, { status: 400 });
  }

  if (parsed.photoUrl) {
    const scan = await scanImage(parsed.photoUrl);
    if (!scan.safe) {
      return NextResponse.json(
        { error: "photo_rejected", reason: scan.reason },
        { status: 422 }
      );
    }
  }

  // Visitor hash deduplicates submissions from same IP/UA on same invite.
  // Salted with invite.id so the same person on the same network can still
  // contribute to other invites independently.
  const visitorHash = createHash("sha256")
    .update(`${ip}:${req.headers.get("user-agent") ?? ""}:${invite.id}`)
    .digest("hex");

  const { error } = await supabase.from("invite_contributions").insert({
    invite_id: invite.id,
    contributor_name: parsed.name,
    contributor_email: parsed.email ?? null,
    message: parsed.message ?? null,
    photo_url: parsed.photoUrl ?? null,
    visitor_hash: visitorHash,
  });

  if (error?.code === "23505") {
    // UNIQUE collision — same visitor already contributed. Treat as success
    // so the UI doesn't error on accidental double-submits.
    return NextResponse.json({ ok: true, dedup: true });
  }
  if (error) {
    console.error("[contribute] insert failed:", error.message);
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  // Audit off the critical path. NO contributor name or email in meta —
  // those are PII. has_photo/has_message let admins spot patterns.
  const inviteId = invite.id;
  const hasPhoto = !!parsed.photoUrl;
  const hasMessage = !!parsed.message;
  after(async () => {
    await logAudit({
      userId: null,
      action: "contribution.received",
      ip,
      userAgent: req.headers.get("user-agent"),
      meta: {
        invite_id: inviteId,
        has_photo: hasPhoto,
        has_message: hasMessage,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
