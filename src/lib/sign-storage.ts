/**
 * sign-storage.ts — Supabase storage signing utilities.
 *
 * Extracted from the invite action so they can be unit-tested independently
 * of the full DB-query flow.
 *
 * Design decisions:
 *  - extractBucketPath: returns null for external / non-Supabase URLs so the
 *    caller can decide whether to skip or pass-through.
 *  - signStorageUrl: returns null on failure (caller chooses fallback or omit).
 *  - signPhotoList: uses Promise.allSettled so one bad photo never blocks the
 *    rest; failed photos are omitted rather than surfaced as broken images.
 */

import { createAdminClient } from "@/lib/supabase/server";

// Matches both signed and public Supabase storage URL patterns:
//   /storage/v1/object/sign/<bucket>/<path>
//   /storage/v1/object/public/<bucket>/<path>
const STORAGE_PATH_RE =
  /\/storage\/v1\/object\/(?:sign|public)\/([^/?]+)\/(.+?)(?:\?.*)?$/;

// Derived once at module load — used to reject SSRF attempts where a crafted
// URL has the /storage/v1/object/sign/<bucket>/ pathname but points to an
// attacker-controlled host. Falls back to SUPABASE_URL for server-only callers
// that don't have access to the public env.
const _supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const SUPABASE_HOST = _supabaseUrl ? new URL(_supabaseUrl).hostname : "";

/**
 * Extract the bucket-relative storage path from a Supabase storage URL.
 *
 * Returns null when:
 *   - the input is not a valid URL (e.g. already a bare path)
 *   - the URL hostname does not match the configured Supabase project (SSRF guard)
 *   - the URL belongs to a different bucket
 */
export function extractBucketPath(
  bucket: string,
  urlOrPath: string
): string | null {
  if (!urlOrPath) return null;

  let url: URL;
  try {
    url = new URL(urlOrPath);
  } catch {
    // Not a valid absolute URL — treat as external / legacy path
    return null;
  }

  // SSRF guard: reject any URL whose hostname is not our Supabase project.
  // When SUPABASE_HOST is empty (env not configured in test/CI) we skip the
  // check rather than blocking all URLs — the bucket/path check still applies.
  if (SUPABASE_HOST && url.hostname !== SUPABASE_HOST) return null;

  const match = STORAGE_PATH_RE.exec(url.pathname);
  if (!match) return null;

  const [, foundBucket, filePath] = match;
  if (foundBucket !== bucket) return null;

  return decodeURIComponent(filePath);
}

export interface SignContext {
  inviteId?: string;
  inviteSlug?: string;
}

/**
 * Sign a single storage path, returning the signed URL string or null on
 * failure. Never throws.
 *
 * Pass an optional `context` to include invite_id / invite slug in error logs,
 * making Sentry/CloudWatch traces actionable without scrubbing PII.
 */
export async function signStorageUrl(
  bucket: string,
  path: string,
  ttlSeconds: number,
  context?: SignContext
): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from(bucket)
      .createSignedUrl(path, ttlSeconds);

    if (error || !data?.signedUrl) {
      console.error(
        "[sign-storage] createSignedUrl failed:",
        error?.message ?? "no URL returned",
        { bucket, path, ...context }
      );
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error("[sign-storage] createSignedUrl threw:", err, { bucket, path, ...context });
    return null;
  }
}

export interface PhotoRecord {
  storage_path: string;
  caption: string;
  rotation_deg: number;
  sort_order: number;
  [key: string]: unknown;
}

export interface SignedPhoto extends PhotoRecord {
  url: string;
}

/**
 * Sign an array of photo records in parallel using Promise.allSettled.
 * Photos that fail to sign are omitted (not replaced with broken-image URLs).
 *
 * Pass an optional `context` to include invite_id in any per-photo error logs.
 */
export async function signPhotoList(
  bucket: string,
  photos: PhotoRecord[],
  ttlSeconds: number,
  context?: SignContext
): Promise<SignedPhoto[]> {
  if (photos.length === 0) return [];

  const results = await Promise.allSettled(
    photos.map(async (photo) => {
      const signedUrl = await signStorageUrl(bucket, photo.storage_path, ttlSeconds, context);
      if (!signedUrl) throw new Error(`Failed to sign ${photo.storage_path}`);
      return { ...photo, url: signedUrl } as SignedPhoto;
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<SignedPhoto> => r.status === "fulfilled")
    .map((r) => r.value);
}
