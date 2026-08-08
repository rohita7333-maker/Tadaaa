import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Regression cover for audit point 14: a creator opening their OWN surprise
 * link must not be counted. Counting it would both inflate the view stat and
 * stamp revealed_at, starting the free-tier 28-day expiry clock before any
 * recipient ever saw the surprise.
 */

vi.mock("next/headers", () => ({ cookies: vi.fn(() => ({ getAll: () => [] })) }));
vi.mock("@/lib/email/send", () => ({ sendEmail: vi.fn(async () => {}) }));
vi.mock("@/lib/email/templates", () => ({
  inviteViewedEmail: vi.fn(() => ({ subject: "s", html: "h" })),
}));

const mockRateLimit = vi.fn(async () => true);
vi.mock("@/lib/rate-limit", () => ({ rateLimit: (...args: unknown[]) => mockRateLimit(...(args as [])) }));

const CREATOR_ID = "creator-1";

let mockInviteRow: Record<string, unknown> | null;
let mockViewerId: string | null;

const mockRpc = vi.fn(async () => ({ data: 1 }));
const mockViewInsert = vi.fn(async (row: { invite_id: string; user_agent: string }) => {
  void row;
  return { error: null };
});
const mockProfileMaybeSingle = vi.fn(async () => ({ data: { notify_on_view: false } }));
const mockGetUserById = vi.fn(async () => ({ data: { user: null } }));

function inviteQuery() {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockInviteRow, error: null }),
        }),
      }),
    }),
  };
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: mockViewerId ? { id: mockViewerId } : null },
      })),
    },
    from: vi.fn(() => inviteQuery()),
    rpc: mockRpc,
  }),
  createAdminClient: () => ({
    from: vi.fn((table: string) => {
      if (table === "invite_views") return { insert: mockViewInsert };
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ maybeSingle: mockProfileMaybeSingle }),
        }),
        upsert: vi.fn(async () => ({ error: null })),
      };
    }),
    auth: { admin: { getUserById: mockGetUserById } },
  }),
}));

const { logInviteViewBySlug } = await import("@/lib/invite-view");

beforeEach(() => {
  vi.clearAllMocks();
  mockRateLimit.mockResolvedValue(true);
  mockRpc.mockResolvedValue({ data: 1 });
  mockProfileMaybeSingle.mockResolvedValue({ data: { notify_on_view: false } });
  mockInviteRow = {
    id: "invite-1",
    is_active: true,
    creator_id: CREATOR_ID,
    title: "Maya's surprise",
    expires_at: null,
  };
  mockViewerId = null;
});

describe("logInviteViewBySlug — creator preview skip (audit point 14)", () => {
  it("does not count a view when the signed-in viewer is the creator", async () => {
    mockViewerId = CREATOR_ID;

    const result = await logInviteViewBySlug("maya", "ua", "1.2.3.4");

    expect(result).toEqual({ ok: true });
    expect(result.count).toBeUndefined();
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockViewInsert).not.toHaveBeenCalled();
  });

  it("counts the view for an anonymous visitor", async () => {
    mockViewerId = null;

    const result = await logInviteViewBySlug("maya", "ua", "1.2.3.4");

    expect(result.ok).toBe(true);
    expect(result.count).toBe(1);
    expect(mockRpc).toHaveBeenCalledWith("increment_view_count", { invite_id: "invite-1" });
    expect(mockViewInsert).toHaveBeenCalledTimes(1);
  });

  it("counts the view for a different signed-in user", async () => {
    mockViewerId = "some-other-user";

    const result = await logInviteViewBySlug("maya", "ua", "1.2.3.4");

    expect(result.ok).toBe(true);
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockViewInsert).toHaveBeenCalledTimes(1);
  });

  it("truncates the user agent it stores to 255 characters", async () => {
    mockViewerId = null;

    await logInviteViewBySlug("maya", "U".repeat(400), "1.2.3.4");

    const payload = mockViewInsert.mock.calls[0][0];
    expect(payload.user_agent).toHaveLength(255);
  });

  it("still skips the creator when the invite is expired-checked but active", async () => {
    mockViewerId = CREATOR_ID;
    mockInviteRow = {
      id: "invite-1",
      is_active: true,
      creator_id: CREATOR_ID,
      title: "Maya's surprise",
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    };

    const result = await logInviteViewBySlug("maya", "ua", "1.2.3.4");

    expect(result).toEqual({ ok: true });
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

describe("logInviteViewBySlug — guards", () => {
  it("rejects an empty slug before touching the database", async () => {
    const result = await logInviteViewBySlug("", "ua", "1.2.3.4");
    expect(result).toEqual({ ok: false, status: 400 });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns 429 when rate limited", async () => {
    mockRateLimit.mockResolvedValue(false);
    const result = await logInviteViewBySlug("maya", "ua", "1.2.3.4");
    expect(result).toEqual({ ok: false, status: 429 });
    expect(mockViewInsert).not.toHaveBeenCalled();
  });

  it("404s an inactive invite without counting", async () => {
    mockInviteRow = {
      id: "invite-1",
      is_active: false,
      creator_id: CREATOR_ID,
      title: "Maya's surprise",
      expires_at: null,
    };
    const result = await logInviteViewBySlug("maya", "ua", "1.2.3.4");
    expect(result).toEqual({ ok: false, status: 404 });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("404s an expired invite without counting", async () => {
    mockInviteRow = {
      id: "invite-1",
      is_active: true,
      creator_id: CREATOR_ID,
      title: "Maya's surprise",
      expires_at: new Date(Date.now() - 86_400_000).toISOString(),
    };
    const result = await logInviteViewBySlug("maya", "ua", "1.2.3.4");
    expect(result).toEqual({ ok: false, status: 404 });
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
