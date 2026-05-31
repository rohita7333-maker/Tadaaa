import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Next.js stubs ──────────────────────────────────────────────────────────
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");
  return { ...actual, after: vi.fn() };
});
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({ getAll: () => [] })),
}));

// ── Third-party stubs ───────────────────────────────────────────────────────
vi.mock("@/lib/moderation", () => ({ scanImage: vi.fn(async () => ({ safe: true })) }));
vi.mock("@/lib/analytics",  () => ({ trackServer: vi.fn(async () => {}) }));
vi.mock("@/lib/audit",      () => ({ logAudit: vi.fn(async () => {}) }));
vi.mock("@/lib/gift-redemption", () => ({ validateGiftForUser: vi.fn(async () => null) }));
vi.mock("@/lib/themes", () => ({ getThemeById: vi.fn(() => ({ id: "default", isPremium: false })) }));
vi.mock("@/lib/sign-storage", () => ({
  signPhotoList: vi.fn(async (photos: unknown[]) => photos),
  signStorageUrl: vi.fn(async (url: string) => url),
  extractBucketPath: vi.fn((url: string) => url),
}));

// Keep isExpired real so tier-gate logic works correctly in tests.
vi.mock("@/lib/utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/utils")>("@/lib/utils");
  return { ...actual, generateInviteSlug: vi.fn(() => "test-slug") };
});

// ── Supabase mock ───────────────────────────────────────────────────────────
let capturedUpdatePayload: Record<string, unknown> | null = null;
let mockInviteRow: Record<string, unknown> = {};
let mockProfileRow: Record<string, unknown> = {};
const mockDeleteFn = vi.fn(async () => ({ error: null }));

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: "user-test" } },
      })),
    },
    from: mockFrom,
  }),
  createAdminClient: () => ({
    storage: {
      from: vi.fn(() => ({
        remove: vi.fn(async () => ({ error: null })),
      })),
    },
    from: mockFrom,
  }),
}));

function buildMockFrom() {
  mockFrom.mockImplementation((table: string) => {
    if (table === "invites") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockInviteRow,
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
          capturedUpdatePayload = payload;
          return { eq: vi.fn().mockResolvedValue({ error: null }) };
        }),
        delete: mockDeleteFn,
      };
    }
    if (table === "profiles") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfileRow,
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === "invite_photos") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    }
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    };
  });
}

// ── Tests ───────────────────────────────────────────────────────────────────
import { deleteInvite } from "./invite";

const PAST_DATE  = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(); // 30d ago
const FUTURE_DATE = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(); // +14d

describe("deleteInvite — soft delete behaviour", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedUpdatePayload = null;
    buildMockFrom();
  });

  it("soft-deletes: sets deleted_at, is_active=false, status=deleted (paid tier)", async () => {
    mockInviteRow = { id: "inv-1", creator_id: "user-test", expires_at: null, status: "active", is_active: true, video_storage_path: null };
    mockProfileRow = { subscription_tier: "plus", subscription_expires_at: null };

    const result = await deleteInvite("inv-1");

    expect(result).toEqual({ success: true });
    expect(capturedUpdatePayload).not.toBeNull();
    expect(capturedUpdatePayload!.is_active).toBe(false);
    expect(capturedUpdatePayload!.status).toBe("deleted");
    expect(typeof capturedUpdatePayload!.deleted_at).toBe("string");
    // Must NOT hard-delete
    expect(mockDeleteFn).not.toHaveBeenCalled();
  });

  it("soft-deletes: unlimited tier allowed anytime, no expiry check", async () => {
    mockInviteRow = { id: "inv-2", creator_id: "user-test", expires_at: FUTURE_DATE, status: "active", is_active: true, video_storage_path: null };
    mockProfileRow = { subscription_tier: "unlimited", subscription_expires_at: null };

    const result = await deleteInvite("inv-2");

    expect(result).toEqual({ success: true });
    expect(capturedUpdatePayload!.deleted_at).toBeTruthy();
    expect(mockDeleteFn).not.toHaveBeenCalled();
  });

  it("blocks free tier from deleting a live (non-expired) invite", async () => {
    mockInviteRow = { id: "inv-3", creator_id: "user-test", expires_at: FUTURE_DATE, status: "active", is_active: true, video_storage_path: null };
    mockProfileRow = { subscription_tier: "free", subscription_expires_at: null };

    const result = await deleteInvite("inv-3");

    expect(result).toHaveProperty("error");
    expect((result as { error: string }).error).toContain("28 days");
    expect(capturedUpdatePayload).toBeNull();
    expect(mockDeleteFn).not.toHaveBeenCalled();
  });

  it("blocks free tier from deleting invite with no expires_at (never revealed)", async () => {
    mockInviteRow = { id: "inv-4", creator_id: "user-test", expires_at: null, status: "active", is_active: true, video_storage_path: null };
    mockProfileRow = { subscription_tier: "free", subscription_expires_at: null };

    const result = await deleteInvite("inv-4");

    expect(result).toHaveProperty("error");
    expect(capturedUpdatePayload).toBeNull();
  });

  it("allows free tier to delete after invite expires (expires_at in past)", async () => {
    mockInviteRow = { id: "inv-5", creator_id: "user-test", expires_at: PAST_DATE, status: "expired", is_active: false, video_storage_path: null };
    mockProfileRow = { subscription_tier: "free", subscription_expires_at: null };

    const result = await deleteInvite("inv-5");

    expect(result).toEqual({ success: true });
    expect(capturedUpdatePayload!.deleted_at).toBeTruthy();
    expect(capturedUpdatePayload!.status).toBe("deleted");
    expect(mockDeleteFn).not.toHaveBeenCalled();
  });

  it("allows free tier to delete when status=expired even if expires_at not past", async () => {
    // Cron may have set status=expired before expires_at ticks over
    mockInviteRow = { id: "inv-6", creator_id: "user-test", expires_at: FUTURE_DATE, status: "expired", is_active: false, video_storage_path: null };
    mockProfileRow = { subscription_tier: "free", subscription_expires_at: null };

    const result = await deleteInvite("inv-6");

    expect(result).toEqual({ success: true });
    expect(capturedUpdatePayload!.deleted_at).toBeTruthy();
  });

  it("returns Not Found when invite owned by different user", async () => {
    mockInviteRow = { id: "inv-7", creator_id: "other-user", expires_at: null, status: "active", is_active: true, video_storage_path: null };
    mockProfileRow = { subscription_tier: "free", subscription_expires_at: null };

    const result = await deleteInvite("inv-7");

    expect(result).toHaveProperty("error", "Not found");
    expect(capturedUpdatePayload).toBeNull();
  });
});

// ── Purge cron route unit test ─────────────────────────────────────────────
describe("purge-deleted cron — auth guard", () => {
  it("returns 401 when no CRON_SECRET env var is set", async () => {
    const original = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;

    const { GET } = await import("@/app/api/cron/purge-deleted/route");
    const req = new Request("http://localhost/api/cron/purge-deleted");
    const res = await GET(req as Parameters<typeof GET>[0]);
    expect(res.status).toBe(500);

    process.env.CRON_SECRET = original;
  });

  it("returns 401 for bad bearer token", async () => {
    process.env.CRON_SECRET = "test-secret";

    const { GET } = await import("@/app/api/cron/purge-deleted/route");
    const req = new Request("http://localhost/api/cron/purge-deleted", {
      headers: { authorization: "Bearer wrong-token" },
    });
    const res = await GET(req as Parameters<typeof GET>[0]);
    expect(res.status).toBe(401);

    delete process.env.CRON_SECRET;
  });
});
