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
 *   "error"      — unrecoverable fetch/network error
 */

export type VideoShareOutcome = "shared" | "downloaded" | "rendering" | "error";

export interface VideoShareResult {
  outcome: VideoShareOutcome;
  /** Human-readable message suitable for a toast */
  message: string;
}

export interface VideoShareArgs {
  inviteId: string;
  title: string;
  /** PostHog capture helper — same signature as the one in ShareButtons */
  capture: (event: string, props?: Record<string, unknown>) => void;
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
    statusRes = await fetch(`/api/video/status?inviteId=${inviteId}`);
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
    try {
      await fetch("/api/video/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inviteId }),
      });
    } catch {
      // best-effort — the toast still fires
    }
    return {
      outcome: "rendering",
      message: "Video rendering — try again in 30s",
    };
  }

  // 3. Fetch the video blob
  let blob: Blob;
  try {
    const blobRes = await fetch(statusJson.videoUrl);
    blob = await blobRes.blob();
  } catch {
    return { outcome: "error", message: "Could not download video." };
  }

  const filename = `${title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.mp4`;
  const file = new File([blob], filename, { type: "video/mp4" });

  // 4. Try native share (files), fall back to download
  if (canShareFiles()) {
    try {
      await navigator.share({ files: [file], title });
      capture("invite_shared", { channel: "video", inviteId });
      return { outcome: "shared", message: "Shared!" };
    } catch {
      // User cancelled or share failed — fall through to download
    }
  }

  // 5. Download fallback
  triggerDownload(blob, filename);
  return { outcome: "downloaded", message: "Video saved — ready to share!" };
}
