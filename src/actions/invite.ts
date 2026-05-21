"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { createInviteSchema, inviteQuestionsSchema } from "@/lib/schemas";
import { generateInviteSlug } from "@/lib/utils";
import { STORAGE_BUCKET, FREE_INVITE_MONTHLY_LIMIT } from "@/lib/constants";
import { getThemeById } from "@/lib/themes";
import { trackServer } from "@/lib/analytics";

const MAX_PHOTOS = 8;
import { revalidatePath } from "next/cache";
import { after } from "next/server";

export async function createInvite(formData: FormData) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Check subscription tier and apply rate limits
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, subscription_expires_at")
    .eq("id", user.id)
    .single();

  const tier = profile?.subscription_tier ?? "free";
  const isUnlimited =
    tier === "unlimited" &&
    (!profile?.subscription_expires_at ||
      new Date(profile.subscription_expires_at) > new Date());

  if (!isUnlimited) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("invites")
      .select("*", { count: "exact", head: true })
      .eq("creator_id", user.id)
      .gte("created_at", monthStart.toISOString());
    if ((count ?? 0) >= FREE_INVITE_MONTHLY_LIMIT) {
      return {
        error: `Monthly limit reached. Free plan allows ${FREE_INVITE_MONTHLY_LIMIT} surprises per month. Upgrade to Unlimited for more!`,
      };
    }
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
  if (themeMeta.isPremium && !isUnlimited) {
    return {
      error:
        "Premium theme requires upgrade. Buy this theme on the pricing page or upgrade to Unlimited.",
    };
  }

  const VALID_OCCASIONS = ["date", "birthday", "festival", "mothers_day", "apology", "custom"] as const;
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

  // Upload photos with caption + rotation
  const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "gif"];
  const photoCount = Math.min(parseInt(formData.get("photoCount") as string) || 0, MAX_PHOTOS);
  const photoRecords: {
    invite_id: string;
    storage_path: string;
    caption: string;
    rotation_deg: number;
    sort_order: number;
  }[] = [];

  for (let i = 0; i < photoCount; i++) {
    const file = formData.get(`photo_${i}`) as File;
    if (!file) continue;

    if (!ALLOWED_MIME.includes(file.type)) continue;
    const rawExt = (file.name.split(".").pop() ?? "").toLowerCase();
    const ext = ALLOWED_EXT.includes(rawExt) ? rawExt : "jpg";
    const path = `${user.id}/${invite.id}/${i}.${ext}`;

    const { error: uploadError } = await adminClient.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error(`Failed to upload photo ${i}:`, uploadError);
      continue;
    }

    const caption = (formData.get(`photo_caption_${i}`) as string) || "";
    const rotationRaw = formData.get(`photo_rotation_${i}`);
    const rotation_deg = rotationRaw ? parseFloat(String(rotationRaw)) : 0;

    photoRecords.push({
      invite_id: invite.id,
      storage_path: path,
      caption: caption.slice(0, 120),
      rotation_deg: Math.max(-8, Math.min(8, rotation_deg)),
      sort_order: i,
    });
  }

  if (photoRecords.length > 0) {
    await supabase.from("invite_photos").insert(photoRecords);
  }

  // Save questions with yes/no labels + dodge flag.
  // Server-side validated: cap count, cap field lengths. Reject malformed JSON.
  const questionsJson = formData.get("questions") as string | null;
  if (questionsJson && questionsJson.length < 10_000) {
    try {
      const parsed = inviteQuestionsSchema.safeParse(JSON.parse(questionsJson));
      if (!parsed.success) {
        // Skip silently; questions are optional. Could surface error here if desired.
        return { slug, inviteId: invite.id };
      }
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
    } catch (err) {
      console.error("[invite] Failed to parse questions JSON:", err);
    }
  }

  revalidatePath("/dashboard");
  return { slug, inviteId: invite.id };
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

export async function getInviteBySlug(slug: string) {
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

  const signedPhotos = await Promise.all(
    photos.map(async (p) => {
      const { data } = await adminClient.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(
          p.storage_path,
          invite.is_paid ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7
        );
      return { ...p, url: data?.signedUrl || "" };
    })
  );

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

  // Generate video URL if ready
  let videoUrl: string | null = null;
  if ((invite as { video_status?: string }).video_status === "ready" && (invite as { video_storage_path?: string }).video_storage_path) {
    const { data: videoData } = await adminClient.storage
      .from("moment-photos")
      .createSignedUrl((invite as { video_storage_path: string }).video_storage_path, 60 * 60 * 24);
    videoUrl = videoData?.signedUrl || null;
  }

  return { ...invite, photos: signedPhotos, questions, videoUrl };
}
