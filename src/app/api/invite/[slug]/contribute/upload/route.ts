import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit, getIp } from "@/lib/rate-limit";
import { STORAGE_BUCKET, PHOTO_MAX_SIZE_MB } from "@/lib/constants";

/**
 * Anonymous photo upload helper for the contribute form.
 *
 * The invite-photos bucket is private and the contribute UI has no session
 * to use the client SDK directly. We accept the multipart upload here,
 * verify the invite is open for contributions, and write the file via the
 * service-role client. A short-lived signed URL is returned so the caller
 * can pass it to the contribute POST for moderation + storage in the
 * `invite_contributions.photo_url` column.
 *
 * Hardening:
 *   - Strict MIME allowlist (no SVG — XSS surface, no AVIF — not needed).
 *   - Size cap matches the create-wizard limit (1 MB after client-side
 *     browser-image-compression) plus a generous 25 % buffer for raw
 *     uploads from devices that skip compression.
 *   - Rate limit shares the same `contribute:` key family as the insert
 *     route so a script can't burn through uploads to amplify spam.
 */
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
const ALLOWED_EXT: Record<(typeof ALLOWED_MIME)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_BYTES = Math.round(PHOTO_MAX_SIZE_MB * 1024 * 1024 * 1.25);
const SIGNED_URL_TTL = 60 * 60; // 1 hour — long enough to scan and insert

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const ip = getIp(req.headers);

  // Slightly looser than the insert endpoint (20 vs 10) — a single
  // contributor may retry an upload after compression on a flaky connection.
  const allowed = await rateLimit(`contribute:upload:${ip}`, 20, 3600_000);
  if (!allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const supabase = createAdminClient();
  const { data: invite } = await supabase
    .from("invites")
    .select("id, accept_contributions, is_active, expires_at")
    .eq("slug", slug)
    .maybeSingle();
  if (!invite) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!invite.is_active || (invite.expires_at && new Date(invite.expires_at) < new Date())) {
    return NextResponse.json({ error: "inactive" }, { status: 410 });
  }
  if (!invite.accept_contributions) {
    return NextResponse.json({ error: "not_accepting" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "bad_input" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }
  if (!ALLOWED_MIME.includes(file.type as (typeof ALLOWED_MIME)[number])) {
    return NextResponse.json({ error: "bad_mime" }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  const ext = ALLOWED_EXT[file.type as (typeof ALLOWED_MIME)[number]];
  const path = `contributions/${slug}/${nanoid()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    console.error("[contribute/upload] upload failed:", uploadError.message);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }

  const { data: signed } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (!signed?.signedUrl) {
    return NextResponse.json({ error: "sign_failed" }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl, path });
}
