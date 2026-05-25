import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { STORAGE_BUCKET } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";

const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "gif"];

/**
 * POST /api/photos/signed-upload-url
 *
 * Issues a short-lived signed upload URL so the browser can PUT a photo
 * directly to Supabase Storage without routing the binary through a Server
 * Action (which has a 1 MB body limit).
 *
 * Body: { inviteId: string; index: number; ext: string }
 * Returns: { path: string; signedUrl: string; token: string }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate-limit: cap signed URL requests to prevent storage abuse.
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const allowed = await rateLimit(`photo-upload:${user.id}:${ip}`, 40, 60_000);
  if (!allowed) {
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
  const ext = ALLOWED_EXT.includes((rawExt ?? "").toLowerCase())
    ? (rawExt as string).toLowerCase()
    : "jpg";

  // Verify the invite belongs to the requesting user before issuing a URL.
  const { data: invite } = await supabase
    .from("invites")
    .select("id")
    .eq("id", inviteId)
    .eq("creator_id", user.id)
    .single();

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  const path = `${user.id}/${inviteId}/${index}.${ext}`;

  // 10-minute TTL is enough for the upload even on a slow connection.
  const { data, error } = await adminClient.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    console.error("[signed-upload-url] Failed to create signed URL:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }

  return NextResponse.json({ path, signedUrl: data.signedUrl, token: data.token });
}
