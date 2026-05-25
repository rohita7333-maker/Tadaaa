import { describe, it, expect, vi, beforeEach } from "vitest";

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

import { createInviteShell, finalizeInvite } from "./invite";

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
