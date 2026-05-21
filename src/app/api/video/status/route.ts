import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const inviteId = request.nextUrl.searchParams.get("inviteId");
  if (!inviteId) {
    return NextResponse.json({ error: "inviteId required" }, { status: 400 });
  }

  const { data: invite } = await supabase
    .from("invites")
    .select("video_status, video_storage_path, creator_id")
    .eq("id", inviteId)
    .single();

  if (!invite || invite.creator_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let videoUrl: string | null = null;
  if (invite.video_status === "ready" && invite.video_storage_path) {
    const adminClient = createAdminClient();
    const { data } = await adminClient.storage
      .from("moment-photos")
      .createSignedUrl(invite.video_storage_path, 60 * 60 * 24);
    videoUrl = data?.signedUrl || null;
  }

  return NextResponse.json({
    status: invite.video_status || "none",
    videoUrl,
  });
}
