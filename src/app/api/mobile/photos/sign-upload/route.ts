import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { STORAGE_BUCKET } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";
import { getBearerUser } from "@/lib/mobile-auth";

/**
 * POST /api/mobile/photos/sign-upload  (mobile BFF)
 *
 * Bearer-authed twin of /api/photos/signed-upload-url: issues a short-lived
 * signed URL so the app can PUT a photo straight to the private invite-photos
 * bucket at `pending/{userId}/{inviteId}/{index}.{ext}`. The binary is moved to
 * its canonical location (after moderation) by /api/mobile/photos/commit.
 *
 * Body: { inviteId: string; index: number; ext: string }
 * Returns: { path, signedUrl, token }
 */
export async function POST(request: NextRequest) {
  const user = await getBearerUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!(await rateLimit(`m-photo-upload:${user.id}:${ip}`, 40, 60_000))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: { inviteId?: string; index?: number; ext?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { inviteId, index, ext: rawExt } = body;
  if (!inviteId || typeof inviteId !== "string" || inviteId.length > 64) {
    return NextResponse.json({ error: "Invalid inviteId" }, { status: 400 });
  }
  if (typeof index !== "number" || index < 0 || index > 7) {
    return NextResponse.json({ error: "Invalid index" }, { status: 400 });
  }
  const ext = (() => {
    switch ((rawExt ?? "").toLowerCase()) {
      case "jpg": return "jpg";
      case "jpeg": return "jpeg";
      case "png": return "png";
      case "webp": return "webp";
      case "gif": return "gif";
      default: return "jpg";
    }
  })();

  const admin = createAdminClient();

  // Verify the invite belongs to the requesting user before issuing a URL.
  const { data: invite } = await admin
    .from("invites")
    .select("id")
    .eq("id", inviteId)
    .eq("creator_id", user.id)
    .single();
  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  const path = `pending/${user.id}/${inviteId}/${index}.${ext}`;
  const { data, error } = await admin.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
  }

  return NextResponse.json({ path, signedUrl: data.signedUrl, token: data.token });
}
