import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: async () => ({
    from: vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }),
  }),
}));

vi.mock("@/lib/unsubscribe", () => ({
  verifyUnsubscribe: vi.fn().mockReturnValue(true),
  unsubscribeUrl: vi.fn(),
}));

import { GET } from "./route";
import { NextRequest } from "next/server";

beforeEach(() => {
  vi.clearAllMocks();
});

function makeRequest(params: Record<string, string>) {
  const url = new URL("http://localhost/api/unsubscribe");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

describe("GET /api/unsubscribe", () => {
  it("returns 400 for unknown list key", async () => {
    const res = await GET(makeRequest({ u: "user-1", k: "bogus", t: "tok" }));
    expect(res.status).toBe(400);
  });

  it("handles k=monthly and returns 200", async () => {
    const res = await GET(makeRequest({ u: "user-1", k: "monthly", t: "tok" }));
    expect(res.status).toBe(200);
  });

  it("handles k=weekly and returns 200", async () => {
    // This test FAILS before 'weekly' is added to ListKey / COLUMN_FOR_LIST.
    const res = await GET(makeRequest({ u: "user-1", k: "weekly", t: "tok" }));
    expect(res.status).toBe(200);
  });

  it("handles k=view and returns 200", async () => {
    const res = await GET(makeRequest({ u: "user-1", k: "view", t: "tok" }));
    expect(res.status).toBe(200);
  });

  it("handles k=answer and returns 200", async () => {
    const res = await GET(makeRequest({ u: "user-1", k: "answer", t: "tok" }));
    expect(res.status).toBe(200);
  });
});
