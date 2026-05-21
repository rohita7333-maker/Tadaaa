"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { STORAGE_BUCKET } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function getProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, avatar_url, notify_on_view, notify_on_answer, notify_occasions, subscription_tier, subscription_expires_at")
    .eq("id", user.id)
    .single();

  return data;
}

const ALLOWED_AVATAR_MIME = ["image/jpeg", "image/png", "image/webp"];
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // 5 avatar updates per hour — abuse cap on storage churn.
  if (!(await rateLimit(`avatar:${user.id}`, 5, 60 * 60 * 1000))) {
    return { error: "Too many avatar updates — try again later" };
  }

  const file = formData.get("avatar") as File;
  if (!file || !ALLOWED_AVATAR_MIME.includes(file.type)) {
    return { error: "Please upload a JPG, PNG, or WebP image" };
  }
  if (file.size > MAX_AVATAR_SIZE) {
    return { error: "Image must be under 2MB" };
  }

  const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
  const path = `avatars/${user.id}.${ext}`;

  const { error: uploadError } = await adminClient.storage
    .from("moment-photos")
    .upload(path, file, { contentType: file.type, upsert: true });

  if (uploadError) {
    console.error("Avatar upload failed:", uploadError);
    return { error: "Upload failed. Please try again." };
  }

  const { data: urlData } = adminClient.storage
    .from("moment-photos")
    .getPublicUrl(path);

  const avatarUrl = urlData.publicUrl + `?t=${Date.now()}`;

  await supabase.from("profiles").upsert({
    id: user.id,
    avatar_url: avatarUrl,
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: true, url: avatarUrl };
}

export async function updateNotifications(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const updates = {
    id: user.id,
    notify_on_view: formData.get("notify_on_view") === "on",
    notify_on_answer: formData.get("notify_on_answer") === "on",
    notify_occasions: formData.get("notify_occasions") === "on",
  };

  await supabase.from("profiles").upsert(updates);
  revalidatePath("/settings");
}

export async function deleteAccount() {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Gather all storage paths that need purging BEFORE the cascade fires.
  const toRemove: string[] = [];

  const { data: invites } = await supabase
    .from("invites")
    .select("id, video_storage_path")
    .eq("creator_id", user.id);

  const inviteIds = (invites ?? []).map((i) => i.id);
  for (const inv of invites ?? []) {
    const vp = (inv as { video_storage_path?: string | null }).video_storage_path;
    if (vp) toRemove.push(vp);
  }

  if (inviteIds.length > 0) {
    const { data: photos } = await supabase
      .from("invite_photos")
      .select("storage_path")
      .in("invite_id", inviteIds);
    for (const p of photos ?? []) {
      if (p.storage_path) toRemove.push(p.storage_path);
    }
  }

  // Avatar lives under avatars/<userId>.<ext> — try all known extensions.
  for (const ext of ["jpg", "png", "webp"]) {
    toRemove.push(`avatars/${user.id}.${ext}`);
  }

  if (toRemove.length > 0) {
    const { error: storageErr } = await adminClient.storage
      .from(STORAGE_BUCKET)
      .remove(toRemove);
    if (storageErr) {
      console.error("[deleteAccount] storage cleanup failed:", storageErr);
    }
  }

  // DB rows — cascade removes photos/questions/answers/rsvps via FK.
  await supabase.from("invites").delete().eq("creator_id", user.id);

  // End the session BEFORE removing the auth row so the cookie is invalidated.
  await supabase.auth.signOut();

  const { error } = await adminClient.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("deleteAccount error:", error);
    return { error: "Failed to delete account. Please contact support." };
  }

  // user row is gone — RLS `self-insert` policy still allows `user_id IS NULL`.
  // Stash the deleted id in meta so the audit row remains traceable.
  const deletedUserId = user.id;
  const meta = await getRequestMeta();
  after(async () => {
    await logAudit({
      userId: null,
      action: "account.delete",
      ip: meta.ip,
      userAgent: meta.userAgent,
      meta: { deleted_user_id: deletedUserId },
    });
  });

  redirect("/");
}
