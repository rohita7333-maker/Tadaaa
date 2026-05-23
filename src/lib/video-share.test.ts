import { describe, it, expect, vi, beforeEach, type MockInstance } from "vitest";
import { handleVideoShare, ALLOWED_VIDEO_HOSTS, type VideoShareArgs } from "./video-share";

// ---------------------------------------------------------------------------
// Browser globals stubbed for the node test environment
// ---------------------------------------------------------------------------

type FetchResponse = {
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
  blob: () => Promise<Blob>;
};

// Use plain untyped mocks and cast where needed — avoids complex generic inference.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockFetch: MockInstance<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockShare: MockInstance<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockCapture: MockInstance<any>;
const mockCreateObjectURL = vi.fn().mockReturnValue("blob:fake-url");
const mockRevokeObjectURL = vi.fn();

// Simulate a minimal Blob for node environment
class FakeBlob {
  size = 1024;
  type = "video/mp4";
}

// Simulate File (extends Blob with name)
class FakeFile extends FakeBlob {
  name: string;
  constructor(
    _parts: BlobPart[],
    name: string,
    options?: FilePropertyBag,
  ) {
    super();
    this.name = name;
    if (options?.type) this.type = options.type;
  }
}

function stubNavigator(overrides: Partial<Navigator>) {
  Object.defineProperty(globalThis, "navigator", {
    value: overrides,
    writable: true,
    configurable: true,
  });
}

function stubDocument() {
  const anchorClick = vi.fn();
  Object.defineProperty(globalThis, "document", {
    value: {
      createElement: vi.fn(() => ({
        href: "",
        download: "",
        click: anchorClick,
        style: {},
      })),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
    },
    writable: true,
    configurable: true,
  });
}

beforeEach(() => {
  vi.resetAllMocks();

  mockFetch = vi.fn();
  mockShare = vi.fn();
  mockCapture = vi.fn();

  mockCreateObjectURL.mockReturnValue("blob:fake-url");

  // fetch
  vi.stubGlobal("fetch", mockFetch);

  // navigator — read-only on globalThis, must use defineProperty
  stubNavigator({
    share: mockShare as unknown as Navigator["share"],
    canShare: vi.fn(() => true) as unknown as Navigator["canShare"],
  });

  // window.posthog — not actually used by the helper (capture is injected)
  vi.stubGlobal("window", { posthog: { capture: mockCapture } });

  // URL — preserve the real URL constructor (needed by SSRF guard's new URL() calls)
  // but override the static blob helpers.
  const OriginalURL = globalThis.URL;
  class PatchedURL extends OriginalURL {}
  (PatchedURL as unknown as Record<string, unknown>).createObjectURL = mockCreateObjectURL;
  (PatchedURL as unknown as Record<string, unknown>).revokeObjectURL = mockRevokeObjectURL;
  vi.stubGlobal("URL", PatchedURL);

  // Blob / File
  vi.stubGlobal("Blob", FakeBlob);
  vi.stubGlobal("File", FakeFile);

  // document
  stubDocument();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusResponse(body: unknown): FetchResponse {
  return {
    ok: true,
    json: async () => body,
    blob: async () => new FakeBlob() as unknown as Blob,
  };
}

function blobResponse(ok = true): FetchResponse {
  return {
    ok,
    status: ok ? 200 : 404,
    json: async () => ({}),
    blob: async () => new FakeBlob() as unknown as Blob,
  };
}

function makeArgs(overrides?: Partial<VideoShareArgs>): VideoShareArgs {
  return {
    inviteId: "inv-001",
    title: "Happy Birthday!",
    capture: mockCapture as unknown as VideoShareArgs["capture"],
    ...overrides,
  };
}

/**
 * Returns a video URL on a host that is in ALLOWED_VIDEO_HOSTS.
 * Falls back to localhost if the set is empty (shouldn't happen in practice).
 */
function allowedVideoUrl(): string {
  const hosts = Array.from(ALLOWED_VIDEO_HOSTS);
  const host = hosts[0] ?? "localhost";
  return `https://${host}/storage/v1/object/sign/invite-photos/inv-001/video.mp4`;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handleVideoShare", () => {
  it("fetches /api/video/status with URL-encoded inviteId", async () => {
    mockFetch
      .mockResolvedValueOnce(statusResponse({ status: "none", videoUrl: null }))
      .mockResolvedValueOnce({ ok: true, json: async () => ({}), blob: async () => new FakeBlob() as unknown as Blob });

    const result = await handleVideoShare(makeArgs());

    // inviteId is plain ASCII so encoding is the same, but the param must be
    // passed via URLSearchParams (no raw interpolation)
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      "/api/video/status?inviteId=inv-001",
    );
    expect(result.outcome).toBe("rendering");
  });

  it("triggers /api/video/generate POST when video_url is missing", async () => {
    mockFetch
      .mockResolvedValueOnce(statusResponse({ status: "none", videoUrl: null }))
      .mockResolvedValueOnce({ ok: true, json: async () => ({}), blob: async () => new FakeBlob() as unknown as Blob });

    await handleVideoShare(makeArgs());

    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "/api/video/generate",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns error when /api/video/generate returns non-2xx", async () => {
    mockFetch
      .mockResolvedValueOnce(statusResponse({ status: "none", videoUrl: null }))
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}), blob: async () => new FakeBlob() as unknown as Blob });

    const result = await handleVideoShare(makeArgs());

    expect(result.outcome).toBe("error");
    expect(result.message).toBe("Could not start rendering. Try again.");
  });

  it("calls navigator.share with a File when video_url exists and share supports files", async () => {
    mockShare.mockResolvedValueOnce(undefined);

    const videoUrl = allowedVideoUrl();
    mockFetch
      .mockResolvedValueOnce(statusResponse({ status: "ready", videoUrl }))
      .mockResolvedValueOnce(blobResponse());

    const result = await handleVideoShare(makeArgs());

    expect(mockShare).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Happy Birthday!",
        files: expect.arrayContaining([expect.any(FakeFile)]),
      }),
    );
    expect(result.outcome).toBe("shared");
  });

  it("fires PostHog invite_shared with channel:video on successful native share", async () => {
    mockShare.mockResolvedValueOnce(undefined);

    const videoUrl = allowedVideoUrl();
    mockFetch
      .mockResolvedValueOnce(statusResponse({ status: "ready", videoUrl }))
      .mockResolvedValueOnce(blobResponse());

    await handleVideoShare(makeArgs());

    expect(mockCapture).toHaveBeenCalledWith("invite_shared", {
      channel: "video",
      inviteId: "inv-001",
    });
  });

  it("falls back to download when navigator.share rejects with non-AbortError (mobile Safari quirk)", async () => {
    mockShare.mockRejectedValueOnce(new Error("share failed"));

    const videoUrl = allowedVideoUrl();
    mockFetch
      .mockResolvedValueOnce(statusResponse({ status: "ready", videoUrl }))
      .mockResolvedValueOnce(blobResponse());

    const result = await handleVideoShare(makeArgs());

    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(result.outcome).toBe("downloaded");
  });

  it("returns cancelled outcome and no fallback download when user cancels (AbortError)", async () => {
    const abortError = new Error("Share cancelled");
    abortError.name = "AbortError";
    mockShare.mockRejectedValueOnce(abortError);

    const videoUrl = allowedVideoUrl();
    mockFetch
      .mockResolvedValueOnce(statusResponse({ status: "ready", videoUrl }))
      .mockResolvedValueOnce(blobResponse());

    const result = await handleVideoShare(makeArgs());

    expect(result.outcome).toBe("cancelled");
    expect(result.message).toBeNull();
    // Must NOT trigger download
    expect(mockCreateObjectURL).not.toHaveBeenCalled();
  });

  it("falls back to download when navigator.share is not available", async () => {
    stubNavigator({
      canShare: vi.fn(() => false) as unknown as Navigator["canShare"],
    });

    const videoUrl = allowedVideoUrl();
    mockFetch
      .mockResolvedValueOnce(statusResponse({ status: "ready", videoUrl }))
      .mockResolvedValueOnce(blobResponse());

    const result = await handleVideoShare(makeArgs());

    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(result.outcome).toBe("downloaded");
  });

  it("falls back to download when canShare with files returns false", async () => {
    stubNavigator({
      share: mockShare as unknown as Navigator["share"],
      canShare: vi.fn(() => false) as unknown as Navigator["canShare"],
    });

    const videoUrl = allowedVideoUrl();
    mockFetch
      .mockResolvedValueOnce(statusResponse({ status: "ready", videoUrl }))
      .mockResolvedValueOnce(blobResponse());

    const result = await handleVideoShare(makeArgs());

    expect(mockShare).not.toHaveBeenCalled();
    expect(result.outcome).toBe("downloaded");
  });

  it("returns rendering outcome and does not call navigator.share when video not ready", async () => {
    mockFetch
      .mockResolvedValueOnce(statusResponse({ status: "none", videoUrl: null }))
      .mockResolvedValueOnce({ ok: true, json: async () => ({}), blob: async () => new FakeBlob() as unknown as Blob });

    const result = await handleVideoShare(makeArgs());

    expect(mockShare).not.toHaveBeenCalled();
    expect(result.outcome).toBe("rendering");
  });

  it("returns error outcome when status fetch fails (non-2xx)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "server error" }),
      blob: async () => new FakeBlob() as unknown as Blob,
    });

    const result = await handleVideoShare(makeArgs());
    expect(result.outcome).toBe("error");
  });

  // -------------------------------------------------------------------------
  // SSRF guard tests
  // -------------------------------------------------------------------------

  it("returns error for malformed videoUrl (SSRF guard)", async () => {
    mockFetch
      .mockResolvedValueOnce(statusResponse({ status: "ready", videoUrl: "not-a-valid-url" }));

    const result = await handleVideoShare(makeArgs());

    expect(result.outcome).toBe("error");
    expect(result.message).toBe("Invalid video source.");
    // Must NOT attempt to fetch the malformed URL
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("returns error for disallowed videoUrl hostname (SSRF guard)", async () => {
    mockFetch
      .mockResolvedValueOnce(statusResponse({ status: "ready", videoUrl: "https://evil.attacker.com/steal.mp4" }));

    const result = await handleVideoShare(makeArgs());

    expect(result.outcome).toBe("error");
    expect(result.message).toBe("Invalid video source.");
    // Must NOT attempt to fetch from the disallowed host
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Blob fetch ok check
  // -------------------------------------------------------------------------

  it("returns 'Video unavailable' when blob fetch returns non-2xx", async () => {
    const videoUrl = allowedVideoUrl();
    mockFetch
      .mockResolvedValueOnce(statusResponse({ status: "ready", videoUrl }))
      .mockResolvedValueOnce(blobResponse(false)); // 404

    const result = await handleVideoShare(makeArgs());

    expect(result.outcome).toBe("error");
    expect(result.message).toBe("Video unavailable.");
  });
});
