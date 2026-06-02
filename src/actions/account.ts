"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { STORAGE_BUCKET } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";
import { logAudit, getRequestMeta } from "@/lib/audit";
import { signStorageUrl } from "@/lib/sign-storage";

// Avatars live in the private invite-photos bucket under avatars/<userId>.<ext>.
// We store the bare storage PATH in profiles.avatar_url and sign it on read
// (mirrors the invite-photo pattern) so a private bucket can still serve them.
const AVATAR_URL_TTL = 60 * 60 * 24 * 7; // 7 days — re-signed on every page load.

/**
 * Resolve a profiles.avatar_url value to a displayable URL.
 * - bare storage path (e.g. "avatars/<id>.jpg") → freshly signed URL
 * - already-absolute http(s) URL (legacy rows) → returned as-is
 * - null/empty → null
 */
export async function signedAvatarUrl(
  value: string | null | undefined
): Promise<string | null> {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return signStorageUrl(STORAGE_BUCKET, value, AVATAR_URL_TTL);
}

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
  // Unique filename per upload. A stable path + upsert reused the same storage
  // key, so the CDN/browser kept serving the OLD cached image — the new avatar
  // "uploaded" but never appeared in the display. A fresh path = a fresh URL.
  const path = `avatars/${user.id}-${Date.now()}.${ext}`;

  // Capture the previous path BEFORE swapping so we can purge it after.
  const { data: prev } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .single();

  const { error: uploadError } = await adminClient.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    console.error("Avatar upload failed:", uploadError);
    return { error: "Upload failed. Please try again." };
  }

  // Store the bare storage path; read sites sign it via signedAvatarUrl().
  // UPDATE (not upsert): the row exists from signup, and RLS exposes only an
  // UPDATE policy — an upsert's INSERT arm is denied by RLS and fails silently,
  // leaving avatar_url pointing at the stale OAuth photo.
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: path })
    .eq("id", user.id);

  if (profileError) {
    console.error("Avatar profile update failed:", profileError);
    return { error: "Upload failed. Please try again." };
  }

  // Best-effort purge of the prior object so old avatars don't accumulate.
  const oldPath = prev?.avatar_url;
  if (oldPath && oldPath !== path && !oldPath.startsWith("http")) {
    await adminClient.storage.from(STORAGE_BUCKET).remove([oldPath]);
  }

  revalidatePath("/settings");
  // "layout" type ensures the dashboard layout (which fetches avatar_url and
  // passes it to Navbar) is re-rendered on the next visit, not just the page.
  revalidatePath("/dashboard", "layout");

  const signedUrl = await signedAvatarUrl(path);
  return { success: true, url: signedUrl };
}

export async function updateNotifications(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const updates = {
    notify_on_view: formData.get("notify_on_view") === "on",
    notify_on_answer: formData.get("notify_on_answer") === "on",
    notify_occasions: formData.get("notify_occasions") === "on",
  };

  // UPDATE (not upsert): row exists from signup; RLS only allows UPDATE, so an
  // upsert's INSERT arm is denied and prefs would silently never save.
  await supabase.from("profiles").update(updates).eq("id", user.id);
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

  // Avatars live under avatars/<userId>-<ts>.<ext>. List & purge every match
  // (older rows may use the legacy avatars/<userId>.<ext> path — search covers both).
  const { data: avatarFiles } = await adminClient.storage
    .from(STORAGE_BUCKET)
    .list("avatars", { search: user.id });
  for (const f of avatarFiles ?? []) {
    toRemove.push(`avatars/${f.name}`);
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

  // User row is gone — logAudit detects userId === null and routes via the
  // service-role admin client (sql/account_audit.sql self-insert policy
  // requires auth.uid() = user_id, so user-context inserts would fail RLS).
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
