import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, createAdminClient } from "@/lib/supabase/server";
import { safeBearerCheck } from "@/lib/cron-auth";
import { STORAGE_BUCKET } from "@/lib/constants";

const ORPHAN_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * GET /api/cron/sweep-orphans
 *
 * Deletes abandoned pending/ storage files and orphan invite rows.
 * Runs every 6 hours via Vercel Cron.
 *
 * A file is orphaned when a user calls createInviteShell (gets a signed URL),
 * uploads to pending/, but never calls finalizeInvite. The file sits in
 * pending/ indefinitely unless this cron runs.
 *
 * An invite row is orphaned when createInviteShell succeeds but finalizeInvite
 * is never called — the row stays is_active=false with no invite_photos joins.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (!safeBearerCheck(request.headers.get("authorization"), cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createAdminClient();
  const supabase = await createServiceClient();
  const cutoff = new Date(Date.now() - ORPHAN_TTL_MS);

  // ── Phase 1: sweep stale pending/ storage files ───────────────────────────
  let deletedFiles = 0;
  const stalePaths: string[] = [];

  try {
    // List top-level folders under pending/ (one per user)
    const { data: userFolders, error: listErr } = await adminClient.storage
      .from(STORAGE_BUCKET)
      .list("pending", { limit: 1000 });

    if (!listErr && userFolders) {
      for (const userFolder of userFolders) {
        const userPrefix = `pending/${userFolder.name}`;

        const { data: inviteFolders } = await adminClient.storage
          .from(STORAGE_BUCKET)
          .list(userPrefix, { limit: 1000 });

        if (!inviteFolders) continue;

        for (const inviteFolder of inviteFolders) {
          const invitePrefix = `${userPrefix}/${inviteFolder.name}`;

          const { data: files } = await adminClient.storage
            .from(STORAGE_BUCKET)
            .list(invitePrefix, { limit: 100 });

          if (!files) continue;

          for (const file of files) {
            if (!file.id) continue; // folder placeholder
            const createdAt = new Date(file.updated_at ?? file.created_at ?? 0);
            if (createdAt < cutoff) {
              stalePaths.push(`${invitePrefix}/${file.name}`);
            }
          }
        }
      }
    }

    if (stalePaths.length > 0) {
      await adminClient.storage.from(STORAGE_BUCKET).remove(stalePaths);
      deletedFiles = stalePaths.length;
    }
  } catch (err) {
    console.error("[cron:sweep-orphans] Storage sweep error:", err);
  }

  // ── Phase 2: delete orphan invite rows (no photos, older than TTL) ────────
  let deletedInvites = 0;

  try {
    // Find is_active=false invites with no invite_photos rows, created before cutoff.
    // Supabase doesn't support NOT EXISTS directly via the JS client, but we can
    // use a LEFT JOIN pattern via the REST API or filter on a count.
    // Simplest approach: find all candidate rows, then filter in JS.
    // For safety, we cap at 500 per sweep to bound the blast radius.
    const { data: orphans } = await supabase
      .from("invites")
      .select("id, creator_id, invite_photos(id)")
      .eq("is_active", false)
      .lt("created_at", cutoff.toISOString())
      .limit(500);

    if (orphans && orphans.length > 0) {
      const trueOrphans = orphans.filter(
        (row) => {
          const photos = (row as { invite_photos?: { id: string }[] }).invite_photos;
          return !photos || photos.length === 0;
        }
      );

      if (trueOrphans.length > 0) {
        const ids = trueOrphans.map((r) => r.id);
        await supabase.from("invites").delete().in("id", ids);
        deletedInvites = trueOrphans.length;
      }
    }
  } catch (err) {
    console.error("[cron:sweep-orphans] Invite sweep error:", err);
  }

  return NextResponse.json({ deletedFiles, deletedInvites });
}
