import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit, getRequestMeta } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GDPR Article 20 — data portability.
 *
 * Returns every row owned by the authenticated user as a downloadable JSON
 * file:
 *   - profile (profiles)
 *   - invites + their photos / questions / answers / rsvps
 *   - account_audit (this user's own audit trail)
 *
 * Auth: cookie-bound user client. RLS enforces ownership on every table —
 * the .eq() filters here are belt-and-braces, but the user client cannot see
 * rows that don't belong to them even if the filter were wrong.
 *
 * Sensitive fields NOT exported:
 *   - auth.users (password hashes, refresh tokens, MFA secrets) — we only
 *     emit { id, email } pulled from the verified session.
 *   - other users' data — every query is scoped to this user's invites or
 *     their own user_id.
 *
 * Rate limit: 5/day per user. Exports can be heavy and are easy to abuse as
 * a free read-amplifier for the DB.
 *
 * Audit: logs `account.export` after the response flushes (via `after()`),
 * so the user never waits on the audit insert.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 5 exports per rolling 24h window per user. Backed by Postgres so it
  // works across serverless instances.
  const allowed = await rateLimit(`export:${user.id}`, 5, 86_400_000);
  if (!allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  // Fetch invite ids once so downstream queries don't re-scan the invites
  // table four more times.
  const { data: inviteRows } = await supabase
    .from("invites")
    .select("id")
    .eq("creator_id", user.id);
  const inviteIds = (inviteRows ?? []).map((r) => r.id as string);

  const { data: questionRows } = inviteIds.length
    ? await supabase
        .from("invite_questions")
        .select("id")
        .in("invite_id", inviteIds)
    : { data: [] as Array<{ id: string }> };
  const questionIds = (questionRows ?? []).map((r) => r.id as string);

  const emptyResult = { data: [] as unknown[] };

  const [profile, invites, photos, questions, answers, rsvps, audit] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("invites").select("*").eq("creator_id", user.id),
      inviteIds.length
        ? supabase.from("invite_photos").select("*").in("invite_id", inviteIds)
        : Promise.resolve(emptyResult),
      inviteIds.length
        ? supabase
            .from("invite_questions")
            .select("*")
            .in("invite_id", inviteIds)
        : Promise.resolve(emptyResult),
      questionIds.length
        ? supabase
            .from("invite_answers")
            .select("*")
            .in("question_id", questionIds)
        : Promise.resolve(emptyResult),
      inviteIds.length
        ? supabase.from("invite_rsvps").select("*").in("invite_id", inviteIds)
        : Promise.resolve(emptyResult),
      supabase.from("account_audit").select("*").eq("user_id", user.id),
    ]);

  const meta = await getRequestMeta();
  after(async () => {
    await logAudit({
      userId: user.id,
      action: "account.export",
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });

  const payload = {
    exported_at: new Date().toISOString(),
    user: { id: user.id, email: user.email },
    profile: profile.data ?? null,
    invites: invites.data ?? [],
    photos: photos.data ?? [],
    questions: questions.data ?? [],
    answers: answers.data ?? [],
    rsvps: rsvps.data ?? [],
    audit: audit.data ?? [],
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="tadaaaa-export-${user.id}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
