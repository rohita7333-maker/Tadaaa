"use server";

import { cache } from "react";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { createInviteSchema, inviteQuestionsSchema } from "@/lib/schemas";
import { generateInviteSlug } from "@/lib/utils";
import {
  STORAGE_BUCKET,
  SIGNED_URL_TTL_SECONDS,
} from "@/lib/constants";
import { getActiveTier, canCreateInvite, canUsePremiumTheme, getSignedUrlExpiry, monthlyInviteLimit } from "@/lib/tier";
import { signPhotoList, signStorageUrl, extractBucketPath } from "@/lib/sign-storage";
import { getThemeById } from "@/lib/themes";
import { trackServer } from "@/lib/analytics";
import { scanImage } from "@/lib/moderation";
import { logAudit } from "@/lib/audit";
import { validateGiftForUser } from "@/lib/gift-redemption";

const MAX_PHOTOS = 8;
import { revalidatePath } from "next/cache";
import { after } from "next/server";

// ---------------------------------------------------------------------------
// createInviteShell
// ---------------------------------------------------------------------------
// Phase 1 of the two-phase publish flow.  Creates the invite row + validates
// all metadata.  Does NOT accept photos — the client uploads photos directly
// to Supabase Storage using signed URLs from /api/photos/signed-upload-url,
// then calls finalizeInvite() to run moderation + insert invite_photos rows.
//
// This split eliminates the 1 MB Server Action body-size limit that fires when
// users upload multiple photos through FormData.
// ---------------------------------------------------------------------------
export async function createInviteShell(formData: FormData) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Gift redemption bypass: if a valid redeemed gift is attached, skip tier check.
  const rawGiftId = (formData.get("giftId") as string | null) || null;
  const validGift = await validateGiftForUser(adminClient, rawGiftId, user.id);

  // Check subscription tier and apply rate limits
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, subscription_expires_at")
    .eq("id", user.id)
    .single();

  const activeTier = getActiveTier(profile ?? null);

  if (!validGift && monthlyInviteLimit(activeTier) !== null) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("invites")
      .select("*", { count: "exact", head: true })
      .eq("creator_id", user.id)
      .gte("created_at", monthStart.toISOString())
      .eq("is_active", true);
    const check = canCreateInvite(activeTier, count ?? 0);
    if (!check.allowed) return { error: check.reason! };
  }

  const raw = {
    title: formData.get("title") as string,
    theme: formData.get("theme") as string,
    message: formData.get("message") as string,
    revealType: formData.get("revealType") as string,
    countdownDate: formData.get("countdownDate") as string | null,
    expiresAt: formData.get("expiresAt") as string | null,
  };

  const result = createInviteSchema.safeParse(raw);
  if (!result.success) return { error: result.error.issues[0].message };

  const { title, theme, message, revealType, countdownDate, expiresAt } = result.data;

  // Reject unknown themes outright. Reject premium themes for non-Unlimited users
  // unless they upgrade through Stripe checkout (which then sets is_paid).
  // Free users picking a premium theme directly via POST is blocked here.
  const themeMeta = getThemeById(theme);
  if (!themeMeta) {
    return { error: "Unknown theme" };
  }
  if (themeMeta.isPremium && !canUsePremiumTheme(activeTier, false)) {
    return {
      error:
        "Premium theme requires upgrade. Buy this theme on the pricing page or upgrade to Unlimited.",
    };
  }

  const VALID_OCCASIONS = ["date", "birthday", "festival", "mothers_day", "fathers_day", "apology", "custom"] as const;
  const rawOccasion = (formData.get("occasionType") as string) || "custom";
  const occasionType = VALID_OCCASIONS.includes(rawOccasion as typeof VALID_OCCASIONS[number]) ? rawOccasion : "custom";

  // Generate unique slug
  let slug = "";
  for (let i = 0; i < 3; i++) {
    const candidate = generateInviteSlug(theme);
    const { data: existing } = await supabase
      .from("invites")
      .select("id")
      .eq("slug", candidate)
      .single();
    if (!existing) { slug = candidate; break; }
  }
  if (!slug) return { error: "Failed to generate unique slug. Please try again." };

  // Accept contributions toggle — opt-in collaborative memory invites
  // (Task B2). Defaults to false so existing creates keep their
  // private-reveal behaviour.
  const acceptContributions =
    formData.get("acceptContributions") === "true";

  // Insert invite
  const { data: invite, error: insertError } = await supabase
    .from("invites")
    .insert({
      creator_id: user.id,
      slug,
      title,
      theme,
      message,
      reveal_type: revealType,
      countdown_date: countdownDate || null,
      expires_at: expiresAt || null,
      occasion_type: occasionType,
      accept_contributions: acceptContributions,
      is_active: false,
    })
    .select("id")
    .single();

  if (insertError || !invite) {
    return { error: "Failed to create invite. Please try again." };
  }

  // Track invite creation. No-ops when POSTHOG_API_KEY is unset. Keep props
  // PII-free — user.id only, no email or name. Defer the PostHog HTTP flush
  // off the critical path so it doesn't block the redirect (50-300ms saved).
  after(async () => {
    await trackServer(user.id, "invite_created", {
      theme,
      revealType,
      occasionType,
      inviteId: invite.id,
    });
  });

  // Save questions with yes/no labels + dodge flag.
  // Server-side validated: cap count, cap field lengths. Reject malformed JSON.
  const questionsJson = formData.get("questions") as string | null;
  if (questionsJson && questionsJson.length < 10_000) {
    try {
      const parsed = inviteQuestionsSchema.safeParse(JSON.parse(questionsJson));
      if (parsed.success) {
        const questions = parsed.data;
        const nonEmpty = questions.filter((q) => q.text.trim().length > 0);
        if (nonEmpty.length > 0) {
          // Determine enable_dodge_no from first question (invite-level)
          const enableDodge = nonEmpty[0].enableDodge ?? true;
          await supabase
            .from("invites")
            .update({ enable_dodge_no: enableDodge })
            .eq("id", invite.id);

          const records = nonEmpty.map((q, i) => ({
            invite_id: invite.id,
            question_text: q.text.slice(0, 100),
            require_answer: q.requireAnswer,
            yes_label: q.yesLabel || "Yes",
            no_label: q.noLabel || "No",
            sort_order: i,
            attached_photo_index: null,
          }));
          await supabase.from("invite_questions").insert(records);
        }
      }
    } catch (err) {
      console.error("[invite] Failed to parse questions JSON:", err);
    }
  }

  // Mark gift as used now that invite is confirmed created.
  // .eq("status", "redeemed") is an atomic guard: a race that already marked
  // it "used" simply produces 0 rows updated, which is safe to ignore.
  if (validGift) {
    await adminClient
      .from("gift_purchases")
      .update({ status: "used" })
      .eq("id", validGift.id)
      .eq("status", "redeemed");
  }

  revalidatePath("/dashboard");
  // Return inviteId so the client can request signed upload URLs, then call
  // finalizeInvite() once all photos are uploaded to Supabase Storage.
  return { inviteId: invite.id, slug };
}

// ---------------------------------------------------------------------------
// finalizeInvite
// ---------------------------------------------------------------------------
// Phase 2 of the two-phase publish flow.  Called after the client has
// uploaded all photos directly to Supabase Storage via signed URLs.
//
// Accepts an array of photo descriptors (storage path + caption + rotation).
// Runs moderation on each, rolls back everything on any rejection, then
// inserts invite_photos rows and returns the public-facing slug.
// ---------------------------------------------------------------------------
export interface PhotoDescriptor {
  path: string;
  caption: string;
  rotation_deg: number;
}

export async function finalizeInvite(
  inviteId: string,
  photos: PhotoDescriptor[]
) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify the invite belongs to this user and hasn't been finalised already.
  const { data: invite } = await supabase
    .from("invites")
    .select("id, slug, creator_id")
    .eq("id", inviteId)
    .eq("creator_id", user.id)
    .single();

  if (!invite) return { error: "Invite not found" };

  const safePhotos = photos.slice(0, MAX_PHOTOS);

  // Validate that each claimed storage path is under the pending/ prefix for
  // this user+invite. Accepts only paths created by the signed-URL route —
  // never a direct canonical path — so the copy+delete sequence below is the
  // only way a file moves to its final location.
  const allowedPrefix = `pending/${user.id}/${inviteId}/`;
  for (const p of safePhotos) {
    if (!p.path.startsWith(allowedPrefix)) {
      return { error: "Invalid photo path" };
    }
  }

  const uploadedPaths = safePhotos.map((p) => p.path);
  const photoRecords: {
    invite_id: string;
    storage_path: string;
    caption: string;
    rotation_deg: number;
    sort_order: number;
  }[] = [];

  // Track pending paths for rollback; canonical paths built during the loop.
  const canonicalPaths: string[] = [];

  for (let i = 0; i < safePhotos.length; i++) {
    const { path: pendingPath, caption, rotation_deg } = safePhotos[i];

    // Derive canonical path from the pending path structure.
    // pending/{userId}/{inviteId}/{index}.{ext} → {userId}/{inviteId}/{index}.{ext}
    const canonicalPath = pendingPath.replace(/^pending\//, "");

    // Sightengine needs to fetch the image. Generate a short-lived signed URL
    // just for the scan — 5 min is enough without leaving a usable link.
    // Fail OPEN if signing fails (same posture as a Sightengine outage).
    const { data: signed } = await adminClient.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(pendingPath, 60 * 5);
    const scanUrl = signed?.signedUrl;

    if (scanUrl) {
      const { safe, reason } = await scanImage(scanUrl);
      if (!safe) {
        // Roll back: delete all pending files + any canonicals already moved +
        // the parent invite row. Partial invites are worse than no invite.
        await adminClient.storage.from(STORAGE_BUCKET).remove([
          ...uploadedPaths,
          ...canonicalPaths,
        ]);
        await supabase.from("invites").delete().eq("id", inviteId);

        const rejectedReason = reason ?? "unknown";
        const rejectedIndex = i;
        after(async () => {
          await logAudit({
            userId: user.id,
            action: "photo.rejected",
            meta: {
              reason: rejectedReason,
              count_uploaded_before_reject: rejectedIndex,
            },
          });
        });

        return {
          error:
            "One of your photos was flagged by our content filter. Please try a different photo.",
        };
      }
    }

    // Moderation passed — move file from pending/ to canonical location.
    const { error: copyError } = await adminClient.storage
      .from(STORAGE_BUCKET)
      .copy(pendingPath, canonicalPath);

    if (copyError) {
      console.error("[finalizeInvite] Failed to copy pending file:", copyError);
      await adminClient.storage.from(STORAGE_BUCKET).remove([
        ...uploadedPaths,
        ...canonicalPaths,
      ]);
      await supabase.from("invites").delete().eq("id", inviteId);
      return { error: "Failed to process photo. Please try again." };
    }

    // Delete the pending file now that the canonical copy is in place.
    await adminClient.storage.from(STORAGE_BUCKET).remove([pendingPath]);
    canonicalPaths.push(canonicalPath);

    photoRecords.push({
      invite_id: inviteId,
      storage_path: canonicalPath,
      caption: caption.slice(0, 120),
      rotation_deg: Math.max(-8, Math.min(8, rotation_deg)),
      sort_order: i,
    });
  }

  if (photoRecords.length > 0) {
    await supabase.from("invite_photos").insert(photoRecords);
  }

  // Activate the invite — only reachable after all photos pass moderation.
  await supabase.from("invites").update({ is_active: true }).eq("id", inviteId);

  revalidatePath("/dashboard");
  return { slug: invite.slug as string, inviteId };
}

export async function deleteInvite(inviteId: string) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: invite } = await supabase
    .from("invites")
    .select("id, creator_id, video_storage_path")
    .eq("id", inviteId)
    .single();

  if (!invite || invite.creator_id !== user.id) return { error: "Not found" };

  const { data: photos } = await supabase
    .from("invite_photos")
    .select("storage_path")
    .eq("invite_id", inviteId);

  const toRemove: string[] = [];
  if (photos) {
    for (const p of photos) {
      if (p.storage_path) toRemove.push(p.storage_path);
    }
  }
  const videoPath = (invite as { video_storage_path?: string | null }).video_storage_path;
  if (videoPath) toRemove.push(videoPath);

  if (toRemove.length > 0) {
    const { error: storageErr } = await adminClient.storage
      .from(STORAGE_BUCKET)
      .remove(toRemove);
    if (storageErr) {
      console.error("[deleteInvite] storage cleanup failed:", storageErr);
      // Continue — DB delete is the authoritative user-facing action.
    }
  }

  await supabase.from("invites").delete().eq("id", inviteId);
  revalidatePath("/dashboard");
  return { success: true };
}

// Per-request memo: the surprise page calls getInviteBySlug twice (once in
// generateMetadata, once in the page body) and each call now includes a
// contributions SELECT on top of the photos/questions/video queries. React's
// cache() collapses both calls into a single execution per request — no TTL,
// no cross-user key collisions — so we halve the DB load on the hot path
// without any client-visible behaviour change.
const _getInviteBySlugCached = cache(_getInviteBySlugImpl);

export async function getInviteBySlug(slug: string) {
  return _getInviteBySlugCached(slug);
}

async function _getInviteBySlugImpl(slug: string) {
  const adminClient = createAdminClient();

  const { data: invite, error } = await adminClient
    .from("invites")
    .select(
      "*, invite_photos(id, storage_path, caption, rotation_deg, sort_order), invite_questions(id, question_text, yes_label, no_label, require_answer, sort_order, attached_photo_index)"
    )
    .eq("slug", slug)
    .single();

  if (error || !invite) return null;

  // Refuse to surface invites that have been disabled or expired.
  // Status-vs-is_active split-brain: check both. expires_at honoured even if
  // the cron has not yet run.
  const isExpired =
    (invite as { expires_at?: string | null }).expires_at &&
    new Date((invite as { expires_at: string }).expires_at) < new Date();
  const isDisabled =
    (invite as { is_active?: boolean }).is_active === false ||
    (invite as { status?: string }).status === "expired";

  if (isExpired || isDisabled) return null;

  const photos = (
    invite.invite_photos as {
      id: string;
      storage_path: string;
      caption: string;
      rotation_deg: number;
      sort_order: number;
    }[]
  ) || [];
  photos.sort((a, b) => a.sort_order - b.sort_order);

  // Sign photos using Promise.allSettled so one bad photo never aborts the
  // page. TTL is tier-aware: paid invites get 30-day links, free get 7-day.
  // React.cache() on the outer wrapper means this runs once per request.
  const inviteIsPaid = !!(invite as { is_paid?: boolean }).is_paid;
  const photoTtl = getSignedUrlExpiry(inviteIsPaid ? "plus" : "free");
  const signedPhotos = await signPhotoList(STORAGE_BUCKET, photos, photoTtl, {
    inviteId: invite.id,
    inviteSlug: slug,
  });

  const questions = (
    invite.invite_questions as {
      id: string;
      question_text: string;
      yes_label: string;
      no_label: string;
      require_answer: boolean;
      sort_order: number;
      attached_photo_index: number | null;
    }[]
  ) || [];
  questions.sort((a, b) => a.sort_order - b.sort_order);

  // Generate video URL if ready. Video lives in the moment-photos bucket;
  // 24h TTL is generous for a single page session.
  let videoUrl: string | null = null;
  const videoStoragePath = (invite as { video_storage_path?: string }).video_storage_path;
  if ((invite as { video_status?: string }).video_status === "ready" && videoStoragePath) {
    videoUrl = await signStorageUrl("moment-photos", videoStoragePath, 60 * 60 * 24, {
      inviteId: invite.id,
      inviteSlug: slug,
    });
  }

  // Fetch approved contributions (Task B2 — collaborative memory invites).
  // Skipped silently when the invite isn't opted in; surprise page treats
  // an empty array as "no contributions yet" and renders normally.
  let contributions: {
    contributor_name: string;
    message: string | null;
    photo_url: string | null;
  }[] = [];
  if ((invite as { accept_contributions?: boolean }).accept_contributions) {
    const { data: rows } = await adminClient
      .from("invite_contributions")
      .select("contributor_name, message, photo_url, created_at")
      .eq("invite_id", invite.id)
      .eq("approved", true)
      .order("created_at", { ascending: true });
    // Re-sign contribution photo URLs so they're valid for 1 hour from
    // this page render. The upload route stores a signed URL — we extract
    // the bucket path and re-sign it fresh. External URLs (null / different
    // domain) are passed through unchanged.
    const resignedRows = await Promise.allSettled(
      (rows ?? []).map(async (r) => {
        let freshPhotoUrl: string | null = r.photo_url;
        if (r.photo_url) {
          const path = extractBucketPath(STORAGE_BUCKET, r.photo_url);
          if (path) {
            freshPhotoUrl = await signStorageUrl(STORAGE_BUCKET, path, SIGNED_URL_TTL_SECONDS, {
              inviteId: invite.id,
              inviteSlug: slug,
            });
            // On signing failure, omit the photo rather than serve a stale URL
            if (!freshPhotoUrl) freshPhotoUrl = null;
          }
          // If path is null (external URL), keep r.photo_url as-is
        }
        return {
          contributor_name: r.contributor_name,
          message: r.message,
          photo_url: freshPhotoUrl,
        };
      })
    );
    contributions = resignedRows
      .filter((res): res is PromiseFulfilledResult<typeof contributions[0]> => res.status === "fulfilled")
      .map((res) => res.value);
  }

  return { ...invite, photos: signedPhotos, questions, videoUrl, contributions };
}
