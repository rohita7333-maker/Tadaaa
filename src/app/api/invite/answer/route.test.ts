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

vi.mock("@/lib/email/send", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "./route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/invite/answer", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", "user-agent": "vitest" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  state.user = null;
  state.ownedRow = null;
  // ok without creator_id so the notification block stays un-entered in tests
  rpcMock.mockResolvedValue({ data: { ok: true }, error: null });
});

describe("POST /api/invite/answer — creator-preview guard", () => {
  it("records an answer for an anonymous visitor", async () => {
    const res = await POST(
      makeRequest({ questionId: "q-1", answer: true, inviteId: "inv-1" })
    );
    expect(res.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock.mock.calls[0][0]).toBe("record_answer");
  });

  it("records an answer for a signed-in visitor who is not the creator", async () => {
    state.user = { id: "visitor-9" };
    state.ownedRow = null;
    const res = await POST(
      makeRequest({ questionId: "q-1", answer: false, inviteId: "inv-1" })
    );
    expect(res.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledTimes(1);
  });

  it("skips recording when the creator previews their own invite", async () => {
    state.user = { id: "creator-1" };
    state.ownedRow = { id: "inv-1" };
    const res = await POST(
      makeRequest({ questionId: "q-1", answer: true, inviteId: "inv-1" })
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(true);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("still rejects missing fields with 400", async () => {
    const res = await POST(makeRequest({ questionId: "q-1", answer: true }));
    expect(res.status).toBe(400);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
