import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — must be hoisted before the module under test is imported.
// ---------------------------------------------------------------------------

// Provide a stable mock for createAdminClient so sign-storage can call it
// without touching real Supabase credentials.
const mockCreateSignedUrl = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: mockCreateSignedUrl,
      })),
    },
  })),
}));

// Import after mocks are registered.
import {
  extractBucketPath,
  signStorageUrl,
  signPhotoList,
} from "./sign-storage";

// ---------------------------------------------------------------------------
// extractBucketPath
// ---------------------------------------------------------------------------

describe("extractBucketPath", () => {
  it("extracts path from a Supabase signed URL", () => {
    const url =
      "https://abc123.supabase.co/storage/v1/object/sign/invite-photos/contributions/my-slug/abc.jpg?token=xyz";
    expect(extractBucketPath("invite-photos", url)).toBe(
      "contributions/my-slug/abc.jpg"
    );
  });

  it("extracts path from a Supabase public URL", () => {
    const url =
      "https://abc123.supabase.co/storage/v1/object/public/invite-photos/user-id/invite-id/0.jpg";
    expect(extractBucketPath("invite-photos", url)).toBe(
      "user-id/invite-id/0.jpg"
    );
  });

  it("returns null for an external URL (different domain)", () => {
    const url = "https://example.com/photo.jpg";
    expect(extractBucketPath("invite-photos", url)).toBeNull();
  });

  it("returns null for a relative path (not a URL)", () => {
    expect(extractBucketPath("invite-photos", "user-id/invite-id/0.jpg")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(extractBucketPath("invite-photos", "")).toBeNull();
  });

  it("returns null when bucket name does not appear in path segment", () => {
    const url =
      "https://abc123.supabase.co/storage/v1/object/sign/other-bucket/file.jpg?token=xyz";
    expect(extractBucketPath("invite-photos", url)).toBeNull();
  });

  it("returns null for a non-Supabase hostname (SSRF guard)", async () => {
    // Reload the module with NEXT_PUBLIC_SUPABASE_URL set so that SUPABASE_HOST
    // is "abc123.supabase.co" — then a crafted URL with a different hostname
    // must be rejected even though the pathname matches the storage pattern.
    const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc123.supabase.co";
    vi.resetModules();
    const { extractBucketPath: extractWithHost } = await import("./sign-storage");

    const attackUrl =
      "https://attacker.com/storage/v1/object/sign/invite-photos/evil.jpg";
    expect(extractWithHost("invite-photos", attackUrl)).toBeNull();

    // Restore
    if (origUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
    vi.resetModules();
  });
});

// ---------------------------------------------------------------------------
// signStorageUrl — signs a single path/URL, returns signed URL or fallback
// ---------------------------------------------------------------------------

describe("signStorageUrl", () => {
  beforeEach(() => {
    mockCreateSignedUrl.mockReset();
  });

  it("returns a fresh signed URL when signing succeeds", async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://signed.example.com/photo.jpg?token=NEW" },
      error: null,
    });

    const result = await signStorageUrl(
      "invite-photos",
      "user-id/invite-id/0.jpg",
      3600
    );

    expect(result).toBe("https://signed.example.com/photo.jpg?token=NEW");
    expect(mockCreateSignedUrl).toHaveBeenCalledWith(
      "user-id/invite-id/0.jpg",
      3600
    );
  });

  it("returns null when signing returns an error", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockCreateSignedUrl.mockResolvedValue({
      data: null,
      error: { message: "not found" },
    });

    const result = await signStorageUrl(
      "invite-photos",
      "bad-path/0.jpg",
      3600
    );

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("returns null when createSignedUrl throws", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockCreateSignedUrl.mockRejectedValue(new Error("network error"));

    const result = await signStorageUrl("invite-photos", "path/file.jpg", 3600);

    expect(result).toBeNull();
    consoleSpy.mockRestore();
  });

  it("includes inviteId in error log when context is provided", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockCreateSignedUrl.mockResolvedValue({
      data: null,
      error: { message: "not found" },
    });

    await signStorageUrl("invite-photos", "bad-path/0.jpg", 3600, {
      inviteId: "invite-abc-123",
      inviteSlug: "cool-slug",
    });

    expect(consoleSpy).toHaveBeenCalled();
    // The last argument to console.error should contain the inviteId.
    const lastCall = consoleSpy.mock.calls[0];
    const contextArg = lastCall[lastCall.length - 1];
    expect(contextArg).toMatchObject({ inviteId: "invite-abc-123", inviteSlug: "cool-slug" });
    consoleSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// signPhotoList — signs an array of photo records in parallel
// ---------------------------------------------------------------------------

describe("signPhotoList", () => {
  beforeEach(() => {
    mockCreateSignedUrl.mockReset();
  });

  it("returns signed URL for each photo that signs successfully", async () => {
    mockCreateSignedUrl
      .mockResolvedValueOnce({
        data: { signedUrl: "https://s.example.com/0.jpg?token=A" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { signedUrl: "https://s.example.com/1.jpg?token=B" },
        error: null,
      });

    const photos = [
      { storage_path: "uid/iid/0.jpg", caption: "One", rotation_deg: 0, sort_order: 0 },
      { storage_path: "uid/iid/1.jpg", caption: "Two", rotation_deg: 2, sort_order: 1 },
    ];

    const result = await signPhotoList("invite-photos", photos, 3600);

    expect(result).toHaveLength(2);
    expect(result[0].url).toBe("https://s.example.com/0.jpg?token=A");
    expect(result[1].url).toBe("https://s.example.com/1.jpg?token=B");
    // Non-url fields are preserved
    expect(result[0].caption).toBe("One");
    expect(result[1].rotation_deg).toBe(2);
  });

  it("omits photos whose signing fails (Promise.allSettled semantics)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockCreateSignedUrl
      .mockResolvedValueOnce({
        data: { signedUrl: "https://s.example.com/0.jpg?token=A" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "not found" },
      });

    const photos = [
      { storage_path: "uid/iid/0.jpg", caption: "Good", rotation_deg: 0, sort_order: 0 },
      { storage_path: "uid/iid/missing.jpg", caption: "Bad", rotation_deg: 0, sort_order: 1 },
    ];

    const result = await signPhotoList("invite-photos", photos, 3600);

    // Only the successfully-signed photo should be returned
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe("https://s.example.com/0.jpg?token=A");
    consoleSpy.mockRestore();
  });

  it("handles an empty photo array", async () => {
    const result = await signPhotoList("invite-photos", [], 3600);
    expect(result).toEqual([]);
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("one failure does not prevent other photos from being signed", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockCreateSignedUrl
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({
        data: { signedUrl: "https://s.example.com/2.jpg?token=C" },
        error: null,
      });

    const photos = [
      { storage_path: "uid/iid/0.jpg", caption: "Fail", rotation_deg: 0, sort_order: 0 },
      { storage_path: "uid/iid/2.jpg", caption: "Good", rotation_deg: 1, sort_order: 1 },
    ];

    const result = await signPhotoList("invite-photos", photos, 3600);

    expect(result).toHaveLength(1);
    expect(result[0].url).toBe("https://s.example.com/2.jpg?token=C");
    consoleSpy.mockRestore();
  });
});
