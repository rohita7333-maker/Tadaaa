/**
 * video-share.ts
 *
 * Pure orchestration logic for the "Share Video" button.
 * Keeping this separate from the React component lets us test it in the
 * node/vitest environment without jsdom or React Testing Library.
 *
 * Outcomes:
 *   "shared"     — navigator.share() resolved successfully
 *   "downloaded" — file was saved via anchor-click fallback
 *   "rendering"  — video not ready; generate job triggered; show toast
 *   "cancelled"  — user explicitly cancelled the native share sheet (AbortError)
 *   "error"      — unrecoverable fetch/network error
 */

import { APP_URL } from "@/lib/constants";

export type VideoShareOutcome =
  | "shared"
  | "downloaded"
  | "rendering"
  | "cancelled"
  | "error";

export interface VideoShareResult {
  outcome: VideoShareOutcome;
  /** Human-readable message suitable for a toast. null = silent (no toast). */
  message: string | null;
}

export interface VideoShareArgs {
  inviteId: string;
  title: string;
  /** PostHog capture helper — same signature as the one in ShareButtons */
  capture: (event: string, props?: Record<string, unknown>) => void;
}

// ---------------------------------------------------------------------------
// SSRF guard — built once at module load time
// ---------------------------------------------------------------------------

/**
 * Derives the set of allowed video source hostnames.
 * - Same hostname as APP_URL (e.g. localhost, tadaaaa.com)
 * - Supabase storage host derived from NEXT_PUBLIC_SUPABASE_URL
 *   (e.g. xrlmnlknymgakswsbawk.supabase.co)
 */
function buildAllowedVideoHosts(): Set<string> {
  const hosts = new Set<string>();

  try {
    const appHost = new URL(APP_URL).hostname;
    if (appHost) hosts.add(appHost);
  } catch {
    // misconfigured APP_URL — skip
  }

  const supabaseUrl =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_SUPABASE_URL
      : undefined;
  if (supabaseUrl) {
    try {
      const supabaseHost = new URL(supabaseUrl).hostname;
      if (supabaseHost) hosts.add(supabaseHost);
    } catch {
      // misconfigured SUPABASE_URL — skip
    }
  }

  return hosts;
}

export const ALLOWED_VIDEO_HOSTS: Set<string> = buildAllowedVideoHosts();

function isAllowedVideoUrl(raw: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  return ALLOWED_VIDEO_HOSTS.has(parsed.hostname);
}

// ---------------------------------------------------------------------------
// Internal helpers (not exported — keep surface area small)
// ---------------------------------------------------------------------------

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after a short delay so the browser can actually start the download
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function canShareFiles(): boolean {
  if (typeof navigator === "undefined" || !navigator.share) return false;
  // canShare with a dummy file object — graceful check
  try {
    if (navigator.canShare) {
      return navigator.canShare({ files: [new File([], "x.mp4")] });
    }
  } catch {
    // some browsers throw on canShare — treat as unsupported
  }
  return false;
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

export async function handleVideoShare(
  args: VideoShareArgs,
): Promise<VideoShareResult> {
  const { inviteId, title, capture } = args;

  // 1. Check if video is ready
  let statusRes: Response;
  try {
    const params = new URLSearchParams({ inviteId });
    statusRes = await fetch(`/api/video/status?${params.toString()}`);
  } catch {
    return { outcome: "error", message: "Network error — please try again." };
  }

  if (!statusRes.ok) {
    return { outcome: "error", message: "Could not check video status." };
  }

  const statusJson = (await statusRes.json()) as {
    status: string;
    videoUrl: string | null;
  };

  // 2. If video not ready, trigger rendering
  if (!statusJson.videoUrl) {
    let generateRes: Response;
    try {
      generateRes = await fetch("/api/video/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inviteId }),
      });
    } catch {
      return {
        outcome: "error",
        message: "Could not start rendering. Try again.",
      };
    }

    if (!generateRes.ok) {
      return {
        outcome: "error",
        message: "Could not start rendering. Try again.",
      };
    }

    return {
      outcome: "rendering",
      message: "Video rendering — try again in 30s",
    };
  }

  // 3. SSRF guard — validate videoUrl hostname before fetching
  if (!isAllowedVideoUrl(statusJson.videoUrl)) {
    return { outcome: "error", message: "Invalid video source." };
  }

  // 4. Fetch the video blob
  let blob: Blob;
  try {
    const blobRes = await fetch(statusJson.videoUrl);
    if (!blobRes.ok) {
      return { outcome: "error", message: "Video unavailable." };
    }
    blob = await blobRes.blob();
  } catch {
    return { outcome: "error", message: "Could not download video." };
  }

  const filename = `${title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.mp4`;
  const file = new File([blob], filename, { type: "video/mp4" });

  // 5. Try native share (files), fall back to download
  if (canShareFiles()) {
    try {
      await navigator.share({ files: [file], title });
      capture("invite_shared", { channel: "video", inviteId });
      return { outcome: "shared", message: "Shared!" };
    } catch (error) {
      // AbortError = user cancelled — silent, no download fallback
      if ((error as { name?: string })?.name === "AbortError") {
        return { outcome: "cancelled", message: null };
      }
      // Other share failures — fall through to download
    }
  }

  // 6. Download fallback
  triggerDownload(blob, filename);
  return { outcome: "downloaded", message: "Video saved — ready to share!" };
}
