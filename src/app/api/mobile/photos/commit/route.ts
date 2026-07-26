import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { STORAGE_BUCKET, MAX_PHOTOS } from "@/lib/constants";
import { scanImage } from "@/lib/moderation";
import { logAudit } from "@/lib/audit";
import { getBearerUser } from "@/lib/mobile-auth";

/**
 * POST /api/mobile/photos/commit  (mobile BFF)
 *
 * Bearer-authed twin of the finalizeInvite server action's photo phase. For an
 * invite the caller owns, each pending upload is moderated (fail-open, same
 * Sightengine path as web), moved from pending/ to its canonical location, and
 * recorded in invite_photos. On a moderation flag we remove the pending files
 * and reject the batch — but, unlike web finalize, we do NOT delete the invite
 * (the app creates the invite + questions before photos, so a re-try shouldn't
 * nuke that work).
 *
 * Body: { inviteId: string; photos: { path, caption, rotationDeg }[] }
 * Returns: { ok: true, count } | { error, rejectedIndex? }
 */
interface PendingPhoto {
  path: string;
  caption?: string;
  rotationDeg?: number;
}

export async function POST(request: NextRequest) {
  const user = await getBearerUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { inviteId?: string; photos?: PendingPhoto[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { inviteId, photos } = body;
  if (!inviteId || typeof inviteId !== "string" || inviteId.length > 64) {
    return NextResponse.json({ error: "Invalid inviteId" }, { status: 400 });
  }
  if (!Array.isArray(photos) || photos.length === 0) {
    return NextResponse.json({ error: "No photos to commit" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("invites")
    .select("id")
    .eq("id", inviteId)
    .eq("creator_id", user.id)
    .single();
  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  const safePhotos = photos.slice(0, MAX_PHOTOS);
  const allowedPrefix = `pending/${user.id}/${inviteId}/`;
  for (const p of safePhotos) {
    if (typeof p.path !== "string" || !p.path.startsWith(allowedPrefix)) {
      return NextResponse.json({ error: "Invalid photo path" }, { status: 400 });
    }
  }

  const pendingPaths = safePhotos.map((p) => p.path);
  const canonicalPaths: string[] = [];
  const records: {
    invite_id: string;
    storage_path: string;
    caption: string;
    rotation_deg: number;
    sort_order: number;
  }[] = [];

  for (let i = 0; i < safePhotos.length; i++) {
    const { path: pendingPath, caption = "", rotationDeg = 0 } = safePhotos[i];
    const canonicalPath = pendingPath.replace(/^pending\//, "");

    // Short-lived signed URL just for the Sightengine scan. Fail OPEN.
    const { data: signed } = await admin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(pendingPath, 60 * 5);
    if (signed?.signedUrl) {
      const { safe, reason } = await scanImage(signed.signedUrl);
      if (!safe) {
        await admin.storage.from(STORAGE_BUCKET).remove([...pendingPaths, ...canonicalPaths]);
        const rejectedReason = reason ?? "unknown";
        const rejectedIndex = i;
        after(async () => {
          await logAudit({
            userId: user.id,
            action: "photo.rejected",
            meta: { reason: rejectedReason, source: "mobile", count_before_reject: rejectedIndex },
          });
        });
        return NextResponse.json(
          {
            error:
              "One of your photos was flagged by our content filter. Please try a different photo.",
            rejectedIndex,
          },
          { status: 422 }
        );
      }
    }

    const { error: copyError } = await admin.storage
      .from(STORAGE_BUCKET)
      .copy(pendingPath, canonicalPath);
    if (copyError) {
      await admin.storage.from(STORAGE_BUCKET).remove([...pendingPaths, ...canonicalPaths]);
      return NextResponse.json({ error: "Failed to process photo. Please try again." }, { status: 500 });
    }

    await admin.storage.from(STORAGE_BUCKET).remove([pendingPath]);
    canonicalPaths.push(canonicalPath);
    records.push({
      invite_id: inviteId,
      storage_path: canonicalPath,
      caption: String(caption).slice(0, 120),
      rotation_deg: Math.max(-8, Math.min(8, Number(rotationDeg) || 0)),
      sort_order: i,
    });
  }

  if (records.length > 0) {
    const { error: insertError } = await admin.from("invite_photos").insert(records);
    if (insertError) {
      return NextResponse.json({ error: "Failed to save photos." }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, count: records.length });
}
