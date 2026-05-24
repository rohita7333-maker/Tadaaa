import { describe, it, expect, vi, beforeEach } from "vitest";

// Stable stubs so module-level imports in route.ts don't crash.
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");
  return {
    ...actual,
    after: (_fn: () => void | Promise<void>) => {
      // no-op in tests
    },
  };
});

// ── Supabase service client mock ──────────────────────────────────────────────
// We wire up a fresh mock per test in beforeEach so each test controls data.

const mockSupabaseChain = {
  from: vi.fn(),
  auth: {
    admin: {
      getUserById: vi.fn(),
    },
  },
};

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: async () => mockSupabaseChain,
}));

// ── Resend / sendEmail mock ───────────────────────────────────────────────────
const mockSendEmail = vi.fn();
vi.mock("@/lib/email/send", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

// ── weeklyDigestEmail template mock ──────────────────────────────────────────
vi.mock("@/lib/email/templates", () => ({
  weeklyDigestEmail: vi.fn(() => ({
    subject: "Test weekly subject",
    html: "<p>test</p>",
  })),
}));

// ── unsubscribeUrl mock ───────────────────────────────────────────────────────
vi.mock("@/lib/unsubscribe", () => ({
  unsubscribeUrl: vi.fn(() => "https://tadaaaa.app/api/unsubscribe?u=x&k=weekly&t=abc"),
}));

import { GET } from "./route";
import { NextRequest } from "next/server";

// ── helpers ───────────────────────────────────────────────────────────────────
function makeRequest(auth?: string) {
  const headers: Record<string, string> = {};
  if (auth) headers["authorization"] = auth;
  return new NextRequest("http://localhost/api/cron/weekly-digest", { headers });
}

/** Wire the Supabase mock to return a set of profiles + per-user data. */
function setupSupabaseMock(
  profiles: Array<{ id: string }>,
  userDataMap: Record<
    string,
    {
      email: string;
      name: string;
      inviteCount: number;
      viewCount: number;
      rsvpCount: number;
    }
  >
) {
  mockSupabaseChain.from.mockImplementation((table: string) => {
    if (table === "profiles") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: profiles, error: null }),
        }),
      };
    }
    // Dynamic table queries for per-user stats.
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
          }),
          // For profiles.eq("notify_occasions", true) the chain ends here.
          mockResolvedValue: undefined,
        }),
      }),
    };
  });

  mockSupabaseChain.auth.admin.getUserById.mockImplementation(async (id: string) => {
    const ud = userDataMap[id];
    if (!ud) return { data: { user: null } };
    return {
      data: {
        user: {
          email: ud.email,
          user_metadata: { full_name: ud.name },
        },
      },
    };
  });
}

// ── tests ─────────────────────────────────────────────────────────────────────
describe("GET /api/cron/weekly-digest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-cron-secret";
    process.env.NEXT_PUBLIC_SITE_URL = "https://tadaaaa.app";

    // Default: no profiles (supports pagination chain)
    mockSupabaseChain.from.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    }));
  });

  // ── auth ──────────────────────────────────────────────────────────────────
  it("returns 401 when Authorization header is missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 401 when Bearer token is wrong", async () => {
    const res = await GET(makeRequest("Bearer wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("returns 401 when CRON_SECRET env is not set", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(makeRequest("Bearer test-cron-secret"));
    expect(res.status).toBe(500);
  });

  // ── happy path ────────────────────────────────────────────────────────────
  it("returns 200 with sent/skipped/failed counts on happy path", async () => {
    // Wire: 1 profile with activity
    const profiles = [{ id: "user-1" }];
    const perUserData = {
      "user-1": {
        email: "alice@example.com",
        name: "Alice",
        inviteCount: 2,
        viewCount: 10,
        rsvpCount: 3,
      },
    };

    // Full mock chain for per-user count queries
    mockSupabaseChain.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({ data: profiles, error: null }),
            }),
          }),
        };
      }
      if (table === "invites") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({ count: perUserData["user-1"].inviteCount, error: null }),
            }),
          }),
        };
      }
      if (table === "invite_views") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({ count: perUserData["user-1"].viewCount, error: null }),
            }),
          }),
        };
      }
      if (table === "invite_answers") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({ count: perUserData["user-1"].rsvpCount, error: null }),
            }),
          }),
        };
      }
      return { select: vi.fn() };
    });

    mockSupabaseChain.auth.admin.getUserById.mockResolvedValue({
      data: {
        user: {
          email: "alice@example.com",
          user_metadata: { full_name: "Alice" },
        },
      },
    });
    mockSendEmail.mockResolvedValue({ success: true });

    const res = await GET(makeRequest("Bearer test-cron-secret"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(body.skipped).toBe(0);
    expect(body.failed).toBe(0);
  });

  // ── skip zero-activity users ──────────────────────────────────────────────
  it("skips users with zero activity in the past 7 days", async () => {
    const profiles = [{ id: "user-zero" }];

    mockSupabaseChain.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({ data: profiles, error: null }),
            }),
          }),
        };
      }
      // All stat tables return 0
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        }),
      };
    });

    mockSupabaseChain.auth.admin.getUserById.mockResolvedValue({
      data: {
        user: {
          email: "zero@example.com",
          user_metadata: { full_name: "Zero" },
        },
      },
    });

    const res = await GET(makeRequest("Bearer test-cron-secret"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  // ── no profiles ───────────────────────────────────────────────────────────
  it("returns sent:0 when no users have notify_occasions enabled", async () => {
    // Default beforeEach mock returns []
    const res = await GET(makeRequest("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
  });

  // ── Fix 1: timing-safe auth ───────────────────────────────────────────────
  it("rejects a token that is a prefix of the real token", async () => {
    // "Bearer test-cron-secre" is shorter than "Bearer test-cron-secret"
    const res = await GET(makeRequest("Bearer test-cron-secre"));
    expect(res.status).toBe(401);
  });

  it("rejects a token that has the correct content but extra padding", async () => {
    const res = await GET(makeRequest("Bearer test-cron-secret-extra"));
    expect(res.status).toBe(401);
  });

  it("accepts the exact correct Bearer token", async () => {
    const res = await GET(makeRequest("Bearer test-cron-secret"));
    // No profiles in default mock, so 200 with zeros is the expected success path.
    expect(res.status).toBe(200);
  });

  // ── Fix 2: surface Supabase errors as "failed" ────────────────────────────
  it("counts user as failed when invites query returns a Supabase error", async () => {
    const profiles = [{ id: "user-db-error" }];

    mockSupabaseChain.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({ data: profiles, error: null }),
            }),
          }),
        };
      }
      if (table === "invites") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({ count: null, error: { message: "db error" } }),
            }),
          }),
        };
      }
      // Other tables return normally
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        }),
      };
    });

    const res = await GET(makeRequest("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.failed).toBe(1);
    expect(body.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("counts user as failed when invite_views query returns a Supabase error", async () => {
    const profiles = [{ id: "user-views-error" }];

    mockSupabaseChain.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({ data: profiles, error: null }),
            }),
          }),
        };
      }
      if (table === "invite_views") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({ count: null, error: { message: "views error" } }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({ count: 1, error: null }),
          }),
        }),
      };
    });

    const res = await GET(makeRequest("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.failed).toBe(1);
    expect(body.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("counts user as failed when invite_answers query returns a Supabase error", async () => {
    const profiles = [{ id: "user-answers-error" }];

    mockSupabaseChain.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({ data: profiles, error: null }),
            }),
          }),
        };
      }
      if (table === "invite_answers") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({ count: null, error: { message: "answers error" } }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({ count: 1, error: null }),
          }),
        }),
      };
    });

    const res = await GET(makeRequest("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.failed).toBe(1);
    expect(body.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  // ── Fix 5: cursor-based pagination ───────────────────────────────────────
  it("fetches profiles in two pages when total exceeds PAGE_SIZE", async () => {
    // 600 profiles: page 1 returns 500 (= PAGE_SIZE → continue), page 2 returns 100 (< PAGE_SIZE → stop)
    const PAGE_SIZE = 500;
    const batch1 = Array.from({ length: PAGE_SIZE }, (_, i) => ({ id: `user-${i}` }));
    const batch2 = Array.from({ length: 100 }, (_, i) => ({ id: `user-${PAGE_SIZE + i}` }));
    let profileFetchCount = 0;

    mockSupabaseChain.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        profileFetchCount++;
        const data = profileFetchCount === 1 ? batch1 : batch2;
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({ data, error: null }),
            }),
          }),
        };
      }
      // Stats tables: zero activity so users are skipped (no email needed)
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        }),
      };
    });

    mockSupabaseChain.auth.admin.getUserById.mockResolvedValue({ data: { user: null } });

    const res = await GET(makeRequest("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    expect(profileFetchCount).toBe(2); // Must have made 2 paginated calls, not 1
  });
});
