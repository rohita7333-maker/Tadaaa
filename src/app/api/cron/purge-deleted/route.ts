import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, createAdminClient } from "@/lib/supabase/server";
import { safeBearerCheck } from "@/lib/cron-auth";
import { STORAGE_BUCKET } from "@/lib/constants";

const PURGE_AFTER_DAYS = 30;

/**
 * GET /api/cron/purge-deleted
 *
 * GDPR-safe hard purge: removes storage files + DB rows for invites that
 * were soft-deleted more than PURGE_AFTER_DAYS (30) days ago.
 *
 * Soft delete (deleteInvite action) stamps deleted_at but keeps data.
 * This cron is the only place that hard-deletes rows and purges storage.
 *
 * Runs daily via Vercel Cron.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (!safeBearerCheck(request.headers.get("authorization"), cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();
  const adminClient = createAdminClient();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - PURGE_AFTER_DAYS);

  // Find invites due for purge
  const { data: toDelete, error: fetchErr } = await supabase
    .from("invites")
    .select("id, video_storage_path")
    .not("deleted_at", "is", null)
    .lt("deleted_at", cutoff.toISOString());

  if (fetchErr) {
    console.error("[cron:purge-deleted] fetch error:", fetchErr);
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  if (!toDelete || toDelete.length === 0) {
    return NextResponse.json({ purged: 0 });
  }

  const ids = toDelete.map((r) => r.id);
  let storageRemoved = 0;

  // Purge photos + videos from storage
  for (const invite of toDelete) {
    const { data: photos } = await supabase
      .from("invite_photos")
      .select("storage_path")
      .eq("invite_id", invite.id);

    const paths: string[] = [];
    if (photos) {
      for (const p of photos) {
        if (p.storage_path) paths.push(p.storage_path);
      }
    }
    const videoPath = (invite as { video_storage_path?: string | null }).video_storage_path;
    if (videoPath) paths.push(videoPath);

    if (paths.length > 0) {
      const { error: storageErr } = await adminClient.storage
        .from(STORAGE_BUCKET)
        .remove(paths);
      if (storageErr) {
        console.error("[cron:purge-deleted] storage remove failed:", invite.id, storageErr);
        // Continue — DB purge is authoritative. Storage orphans handled by sweep-orphans.
      } else {
        storageRemoved += paths.length;
      }
    }
  }

  // Hard-delete DB rows (cascades to invite_photos, invite_questions, invite_answers via FK)
  const { error: deleteErr } = await supabase
    .from("invites")
    .delete()
    .in("id", ids);

  if (deleteErr) {
    console.error("[cron:purge-deleted] DB delete error:", deleteErr);
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  return NextResponse.json({ purged: ids.length, storageRemoved });
}
