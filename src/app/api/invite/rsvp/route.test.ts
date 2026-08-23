import { describe, it, expect, vi, beforeEach } from "vitest";

// Mutable per-test state consumed by the module-level mocks below.
const state = {
  user: null as null | { id: string },
  ownedRow: null as null | { id: string },
};
const rpcMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: state.ownedRow, error: null }),
          }),
        }),
      }),
    }),
    rpc: rpcMock,
  }),
  createAdminClient: () => ({}),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue(true),
  getIp: () => "1.2.3.4",
}));

import { POST } from "./route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/invite/rsvp", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", "user-agent": "vitest" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  state.user = null;
  state.ownedRow = null;
  rpcMock.mockResolvedValue({ data: { ok: true }, error: null });
});

describe("POST /api/invite/rsvp — creator-preview guard", () => {
  it("records an RSVP for an anonymous visitor", async () => {
    const res = await POST(
      makeRequest({ inviteId: "inv-1", visitorToken: "tok-1" })
    );
    expect(res.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock.mock.calls[0][0]).toBe("record_rsvp");
  });

  it("records an RSVP for a signed-in visitor who is not the creator", async () => {
    state.user = { id: "visitor-9" };
    state.ownedRow = null; // RLS: probe for own row finds nothing
    const res = await POST(
      makeRequest({ inviteId: "inv-1", visitorToken: "tok-1" })
    );
    expect(res.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledTimes(1);
  });

  it("skips recording when the creator previews their own invite", async () => {
    state.user = { id: "creator-1" };
    state.ownedRow = { id: "inv-1" }; // RLS: creator can read their own row
    const res = await POST(
      makeRequest({ inviteId: "inv-1", visitorToken: "tok-1" })
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(true);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("still rejects missing fields with 400", async () => {
    const res = await POST(makeRequest({ visitorToken: "tok-1" }));
    expect(res.status).toBe(400);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
