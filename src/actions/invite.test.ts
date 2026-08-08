import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Next.js stubs ─────────────────────────────────────────────────────────────
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");
  return { ...actual, after: vi.fn((fn: () => void | Promise<void>) => { void fn; }) };
});
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({ getAll: () => [] })),
}));

// ── Third-party stubs ─────────────────────────────────────────────────────────
vi.mock("@/lib/moderation", () => ({
  scanImage: vi.fn(async () => ({ safe: true })),
}));
vi.mock("@/lib/analytics", () => ({
  trackServer: vi.fn(async () => {}),
}));
vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(async () => {}),
}));
vi.mock("@/lib/gift-redemption", () => ({
  validateGiftForUser: vi.fn(async () => null),
}));
vi.mock("@/lib/themes", () => ({
  getThemeById: vi.fn(() => ({ id: "default", isPremium: false })),
}));
vi.mock("@/lib/utils", () => ({
  generateInviteSlug: vi.fn(() => "test-slug"),
}));
const { mockRateLimit } = vi.hoisted(() => ({ mockRateLimit: vi.fn(async () => true) }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mockRateLimit,
  getIp: vi.fn(() => "1.2.3.4"),
}));

// ── Supabase mock ─────────────────────────────────────────────────────────────
// We track the chain calls so we can assert on which filters were applied.
let capturedIsActiveFilter: unknown = "__not_called__";
let capturedInsertPayload: Record<string, unknown> | null = null;
let capturedUpdatePayload: Record<string, unknown> | null = null;

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
        createSignedUrl: vi.fn(async () => ({
          data: { signedUrl: "https://storage.example.com/signed" },
        })),
        remove: vi.fn(async () => ({ error: null })),
        copy: vi.fn(async () => ({ data: { path: "canonical/path" }, error: null })),
      })),
    },
    from: mockFrom,
  }),
}));

const { mockRetrieve } = vi.hoisted(() => ({ mockRetrieve: vi.fn() }));
vi.mock("@/lib/stripe", () => ({
  stripe: { checkout: { sessions: { retrieve: mockRetrieve } } },
}));

import { createInviteShell, finalizeInvite } from "./invite";
import { getThemeById } from "@/lib/themes";

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeFormData(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set("title", overrides.title ?? "Test Invite");
  fd.set("theme", overrides.theme ?? "default");
  fd.set("message", overrides.message ?? "Hello world, this is a test invite message!");
  fd.set("revealType", overrides.revealType ?? "tap");
  return fd;
}

// ── BLOCKER #2: monthly cap must filter by is_active=true ─────────────────────
describe("createInviteShell — monthly cap query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedIsActiveFilter = "__not_called__";
    capturedInsertPayload = null;

    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { subscription_tier: "free", subscription_expires_at: null },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "invites") {
        return {
          select: vi.fn().mockImplementation((cols: string, opts?: { count?: string }) => {
            // Count query path (head: true)
            if (opts?.count === "exact") {
              return {
                eq: vi.fn().mockReturnValue({
                  gte: vi.fn().mockReturnValue({
                    eq: vi.fn().mockImplementation((col: string, val: unknown) => {
                      // Capture the is_active filter
                      if (col === "is_active") capturedIsActiveFilter = val;
                      return Promise.resolve({ count: 0, error: null });
                    }),
                  }),
                }),
              };
            }
            // Slug lookup
            return {
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            };
          }),
          insert: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
            capturedInsertPayload = payload;
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "invite-new" },
                  error: null,
                }),
              }),
            };
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    });
  });

  it("filters monthly cap query by is_active=true so inactive shells don't count", async () => {
    await createInviteShell(makeFormData());
    expect(capturedIsActiveFilter).toBe(true);
  });

  it("inserts new invite row with is_active=false", async () => {
    await createInviteShell(makeFormData());
    expect(capturedInsertPayload).not.toBeNull();
    expect((capturedInsertPayload as Record<string, unknown>).is_active).toBe(false);
  });
});

// ── BLOCKER #1 + #2: finalizeInvite path validation + is_active flip ──────────
describe("finalizeInvite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedUpdatePayload = null;

    mockFrom.mockImplementation((table: string) => {
      if (table === "invites") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "invite-abc", slug: "test-slug", creator_id: "user-test" },
                  error: null,
                }),
              }),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
          update: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
            capturedUpdatePayload = payload;
            return {
              eq: vi.fn().mockResolvedValue({ error: null }),
            };
          }),
        };
      }
      if (table === "invite_photos") {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }),
      };
    });
  });

  it("rejects photos with non-pending path prefix", async () => {
    const result = await finalizeInvite("invite-abc", [
      { path: "user-test/invite-abc/0.jpg", caption: "", rotation_deg: 0 },
    ]);
    expect(result).toHaveProperty("error");
    expect(result.error).toContain("Invalid photo path");
  });

  it("accepts photos with pending/ prefix", async () => {
    const result = await finalizeInvite("invite-abc", [
      { path: "pending/user-test/invite-abc/0.jpg", caption: "", rotation_deg: 0 },
    ]);
    expect(result).not.toHaveProperty("error");
    expect(result).toHaveProperty("slug");
  });

  it("flips is_active=true on success", async () => {
    await finalizeInvite("invite-abc", [
      { path: "pending/user-test/invite-abc/0.jpg", caption: "", rotation_deg: 0 },
    ]);
    expect(capturedUpdatePayload).not.toBeNull();
    expect((capturedUpdatePayload as Record<string, unknown>).is_active).toBe(true);
  });
});

// ── Premium theme paid via one-off Stripe checkout ────────────────────────────
describe("createInviteShell — premium theme unlocked by Stripe session", () => {
  type ReplayRow = {
    id: string;
    creator_id: string;
    is_active: boolean;
    deleted_at?: string | null;
  };
  let replayRow: ReplayRow | null = null;
  let insertPayload: Record<string, unknown> | null = null;
  let updatePayloads: Record<string, unknown>[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockResolvedValue(true);
    replayRow = null;
    insertPayload = null;
    updatePayloads = [];

    vi.mocked(getThemeById).mockReturnValue({
      id: "premium-theme",
      isPremium: true,
    } as ReturnType<typeof getThemeById>);

    mockRetrieve.mockResolvedValue({
      payment_status: "paid",
      metadata: {
        theme_id: "premium-theme",
        user_id: "user-test",
        subscription_type: "plus",
      },
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { subscription_tier: "free", subscription_expires_at: null },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockImplementation((_cols: string, opts?: { count?: string }) => {
          if (opts?.count === "exact") {
            return {
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
                }),
              }),
            };
          }
          return {
            eq: vi.fn().mockImplementation((col: string) => ({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: col === "stripe_session_id" ? replayRow : null,
                  error: null,
                }),
              }),
            })),
          };
        }),
        insert: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
          insertPayload = payload;
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: "invite-new" }, error: null }),
            }),
          };
        }),
        // Self-chaining thenable: the orphan-release update filters on three
        // columns before it is awaited.
        update: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
          updatePayloads.push(payload);
          const chain: {
            eq: ReturnType<typeof vi.fn>;
            then: (resolve: (v: { error: null }) => unknown) => unknown;
          } = {
            eq: vi.fn(() => chain),
            then: (resolve) => resolve({ error: null }),
          };
          return chain;
        }),
      };
    });
  });

  afterEach(() => {
    vi.mocked(getThemeById).mockReturnValue({
      id: "default",
      isPremium: false,
    } as ReturnType<typeof getThemeById>);
  });

  function premiumFormData(sessionId?: string) {
    const fd = makeFormData({ theme: "premium-theme" });
    if (sessionId) fd.set("stripeSessionId", sessionId);
    return fd;
  }

  it("rejects a premium theme when no checkout session is supplied", async () => {
    const result = await createInviteShell(premiumFormData());
    expect(result).toHaveProperty("error");
    expect((result as { error: string }).error).toContain("Premium theme requires upgrade");
    expect(mockRetrieve).not.toHaveBeenCalled();
  });

  it("stamps stripe_session_id and is_paid when the session verifies", async () => {
    const result = await createInviteShell(premiumFormData("cs_test_theme_1"));
    expect(result).not.toHaveProperty("error");
    expect(insertPayload).not.toBeNull();
    expect((insertPayload as unknown as Record<string, unknown>).stripe_session_id).toBe(
      "cs_test_theme_1"
    );
    expect((insertPayload as unknown as Record<string, unknown>).is_paid).toBe(true);
  });

  it("rejects a session already spent on another user's surprise", async () => {
    replayRow = { id: "invite-existing", creator_id: "someone-else", is_active: false };
    const result = await createInviteShell(premiumFormData("cs_test_theme_1"));
    expect((result as { error: string }).error).toContain("already used");
    expect(insertPayload).toBeNull();
  });

  it("rejects a session already spent on the buyer's own live surprise", async () => {
    replayRow = { id: "invite-live", creator_id: "user-test", is_active: true };
    const result = await createInviteShell(premiumFormData("cs_test_theme_1"));
    expect((result as { error: string }).error).toContain("already used");
    expect(insertPayload).toBeNull();
  });

  it("reclaims the session from the buyer's own abandoned shell", async () => {
    // Shell insert succeeded, photo upload then failed — is_active never
    // flipped and nothing cleaned it up. Publishing again must work.
    replayRow = { id: "invite-orphan", creator_id: "user-test", is_active: false };
    const result = await createInviteShell(premiumFormData("cs_test_theme_1"));

    expect(result).not.toHaveProperty("error");
    // Orphan released before the new row claims the session.
    expect(updatePayloads).toContainEqual({ stripe_session_id: null, is_paid: false });
    expect((insertPayload as unknown as Record<string, unknown>).stripe_session_id).toBe(
      "cs_test_theme_1"
    );
    expect((insertPayload as unknown as Record<string, unknown>).is_paid).toBe(true);
  });

  it("reclaims the session from the buyer's own soft-deleted surprise", async () => {
    // deleteInvite only stamps deleted_at, and stripe_session_id is unique —
    // the stale row has to be released or the new insert collides.
    replayRow = {
      id: "invite-deleted",
      creator_id: "user-test",
      is_active: false,
      deleted_at: "2026-01-01T00:00:00.000Z",
    };
    const result = await createInviteShell(premiumFormData("cs_test_theme_1"));

    expect(result).not.toHaveProperty("error");
    expect(updatePayloads).toContainEqual({ stripe_session_id: null, is_paid: false });
    expect((insertPayload as unknown as Record<string, unknown>).stripe_session_id).toBe(
      "cs_test_theme_1"
    );
  });

  it("rate-limits Stripe session verification per user", async () => {
    mockRateLimit.mockResolvedValue(false);
    const result = await createInviteShell(premiumFormData("cs_test_theme_1"));
    expect((result as { error: string }).error).toContain("Too many attempts");
    expect(mockRateLimit).toHaveBeenCalledWith("theme-verify:user-test", 5, 60_000);
    expect(mockRetrieve).not.toHaveBeenCalled();
    expect(insertPayload).toBeNull();
  });

  it("rejects a session paid for by a different user", async () => {
    mockRetrieve.mockResolvedValue({
      payment_status: "paid",
      metadata: {
        theme_id: "premium-theme",
        user_id: "someone-else",
        subscription_type: "plus",
      },
    });
    const result = await createInviteShell(premiumFormData("cs_test_theme_1"));
    expect((result as { error: string }).error).toContain("another account");
    expect(insertPayload).toBeNull();
  });

  it("falls back to the upgrade error when Stripe retrieval throws", async () => {
    mockRetrieve.mockRejectedValue(new Error("no such session"));
    const result = await createInviteShell(premiumFormData("cs_bogus"));
    expect((result as { error: string }).error).toContain("Premium theme requires upgrade");
    expect(insertPayload).toBeNull();
  });
});
