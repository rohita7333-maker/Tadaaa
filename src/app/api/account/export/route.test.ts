import { describe, it, expect, vi } from "vitest";

// Mock next/headers so getRequestMeta (transitively imported via lib/audit) is
// safe to evaluate during route module init.
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

// after() in next/server is a no-op stub here — we don't exercise the audit
// path in this test.
vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");
  return { ...actual, after: (fn: () => void | Promise<void>) => { void fn; } };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: null } }) },
  }),
}));

// Rate limit module unused on the 401 path but mock it defensively so it
// can't accidentally hit Supabase in a future refactor.
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => true),
}));

import { GET } from "./route";

describe("GET /api/account/export", () => {
  it("returns 401 when no user", async () => {
    const res = await GET();
    expect(res.status).toBe(401);
  });
});
