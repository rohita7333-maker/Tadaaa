import { describe, it, expect, vi, beforeEach } from "vitest";

// next/headers is pulled in transitively via lib/audit when after() fires;
// we keep the test deterministic by stubbing the headers() async accessor.
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

// after() is a no-op in tests — we never assert against the deferred audit
// write, but we still want the route to import without booting Next.
vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");
  return { ...actual, after: (fn: () => void | Promise<void>) => { void fn; } };
});

// Rate limit always allows in tests. Individual cases re-mock when they
// need to exercise the 429 branch.
vi.mock("@/lib/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rate-limit")>("@/lib/rate-limit");
  return {
    ...actual,
    rateLimit: vi.fn(async () => true),
  };
});

// Sightengine no-ops — scanImage already fails open when creds are missing,
// but we stub explicitly so the test doesn't depend on env state.
vi.mock("@/lib/moderation", () => ({
  scanImage: vi.fn(async () => ({ safe: true })),
}));

// Build a chainable Supabase mock that resolves to the configured invite row.
// Mirrors the pattern from account/export/route.test.ts but with a per-call
// override since contribute calls both `select` (lookup) and `insert`.
type InviteRow = {
  id: string;
  accept_contributions: boolean;
  is_active: boolean;
  status: string;
} | null;

interface MockState {
  invite: InviteRow;
  insertError: { code?: string; message?: string } | null;
}

const state: MockState = {
  invite: null,
  insertError: null,
};

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "invites") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: state.invite, error: null }),
            }),
          }),
        };
      }
      if (table === "invite_contributions") {
        return {
          insert: async () => ({ error: state.insertError }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  }),
  // Used transitively by lib/audit when after() runs in the 200 path. The
  // after() stub above swallows the call, but the import must still resolve.
  createClient: async () => ({}),
}));

import { POST } from "./route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/invite/test-slug/contribute", {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "vitest" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/invite/[slug]/contribute", () => {
  beforeEach(() => {
    state.invite = null;
    state.insertError = null;
  });

  it("returns 404 when slug doesn't exist", async () => {
    state.invite = null;
    const res = await POST(makeRequest({ name: "Alex", message: "hi" }) as never, {
      params: Promise.resolve({ slug: "missing" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 403 when invite doesn't accept contributions", async () => {
    state.invite = {
      id: "00000000-0000-0000-0000-000000000001",
      accept_contributions: false,
      is_active: true,
      status: "active",
    };
    const res = await POST(makeRequest({ name: "Alex", message: "hi" }) as never, {
      params: Promise.resolve({ slug: "closed" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 for valid payload on an accepting invite", async () => {
    state.invite = {
      id: "00000000-0000-0000-0000-000000000002",
      accept_contributions: true,
      is_active: true,
      status: "active",
    };
    const res = await POST(
      makeRequest({ name: "Alex", message: "Happy birthday!" }) as never,
      { params: Promise.resolve({ slug: "open" }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("returns dedup ok when UNIQUE violation fires (same visitor retries)", async () => {
    // Same accepting invite as the happy path, but the mocked insert now
    // returns a Postgres 23505 (unique_violation). The route should swallow
    // the error and respond { ok: true, dedup: true } so the UI doesn't
    // surface a scary failure on accidental double-submits.
    state.invite = {
      id: "00000000-0000-0000-0000-000000000003",
      accept_contributions: true,
      is_active: true,
      status: "active",
    };
    state.insertError = { code: "23505", message: "duplicate key value" };
    const res = await POST(
      makeRequest({ name: "Alex", message: "Happy birthday!" }) as never,
      { params: Promise.resolve({ slug: "dup" }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true, dedup: true });
  });
});
