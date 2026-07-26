import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { STORAGE_BUCKET } from "@/lib/constants";
import { signPhotoList } from "@/lib/sign-storage";
import { getSignedUrlExpiry } from "@/lib/tier";

/**
 * GET /api/mobile/reveal/[slug]  (mobile BFF, public)
 *
 * Bearer-free twin of the SSR reveal page's data load (getInviteBySlug). The
 * invite-photos bucket is private, so the mobile app can't sign photo URLs with
 * its anon key — this route does it server-side and returns the reveal payload
 * with ready-to-render signed photo URLs, mirroring the web reveal exactly
 * (tier-aware TTL, gated on is_active + expires_at + deleted_at).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const admin = createAdminClient();
  const { data: invite, error } = await admin
    .from("invites")
    .select(
      "*, invite_photos(id, storage_path, caption, rotation_deg, sort_order), invite_questions(id, question_text, yes_label, no_label, require_answer, sort_order, attached_photo_index)"
    )
    .eq("slug", slug)
    .single();

  if (error || !invite) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isExpired =
    invite.expires_at && new Date(invite.expires_at as string) < new Date();
  if (invite.is_active === false || isExpired || invite.deleted_at) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rawPhotos = ((invite.invite_photos as {
    id: string;
    storage_path: string;
    caption: string;
    rotation_deg: number;
    sort_order: number;
  }[]) || []).sort((a, b) => a.sort_order - b.sort_order);

  const ttl = getSignedUrlExpiry(invite.is_paid ? "plus" : "free");
  const signed = await signPhotoList(STORAGE_BUCKET, rawPhotos, ttl, {
    inviteId: invite.id as string,
    inviteSlug: slug,
  });
  const photos = signed.map((p) => ({
    id: p.id as string,
    caption: p.caption,
    rotation_deg: p.rotation_deg,
    sort_order: p.sort_order,
    url: p.url,
  }));

  let contributions: {
    id: string;
    contributor_name: string;
    message: string | null;
  }[] = [];
  if (invite.accept_contributions) {
    const { data: contribs } = await admin
      .from("invite_contributions")
      .select("id, contributor_name, message")
      .eq("invite_id", invite.id)
      .eq("approved", true)
      .order("created_at");
    contributions = contribs ?? [];
  }

  // Strip the joined arrays off the invite before returning it flat.
  const { invite_photos, invite_questions, ...inviteRow } = invite as Record<string, unknown>;
  void invite_photos;

  return NextResponse.json({
    invite: inviteRow,
    photos,
    questions: (invite_questions as unknown[]) ?? [],
    contributions,
  });
}
