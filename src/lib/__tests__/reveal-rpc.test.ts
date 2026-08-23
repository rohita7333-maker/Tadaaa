/**
 * The public reveal path must not read `invites`, `invite_questions`,
 * `invite_photos` or `invite_contributions` directly.
 *
 * All four carry permissive SELECT policies granted to PUBLIC — `invites` and
 * `invite_photos` with the literal expression `true` — so anon and any
 * signed-up user could enumerate every creator's rows. The remedy adds
 * RESTRICTIVE policies scoped `to anon, authenticated` using
 * `creator_id = auth.uid()`, which collapses all four to zero rows for a guest.
 *
 * Web is unaffected: its reveal path already runs on the service-role client,
 * which holds BYPASSRLS. Mobile talks to the database directly, so it must go
 * through the SECURITY DEFINER readers or the reveal goes dark the moment the
 * SQL lands.
 *
 * These tests assert the RPC calls AND the absence of table reads. Asserting
 * only the RPCs would pass just as happily if a stray `.from("invites")`
 * survived alongside them.
 */

const mockRpc = jest.fn();
const mockFrom = jest.fn();

jest.mock("../supabase", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { getInviteForReveal, getRevealUnavailableReason } from "../db";

const INVITE_ID = "11111111-1111-1111-1111-111111111111";

const LIVE_INVITE = {
  id: INVITE_ID,
  slug: "maya",
  title: "Maya's surprise",
  message: "See you Saturday",
  theme: "golden-hour",
  occasion_type: "birthday",
  reveal_type: "tap",
  countdown_date: null,
  expires_at: null,
  events: null,
  enable_dodge_no: false,
  accept_contributions: false,
  is_paid: true,
  view_count: 3,
  response_count: 1,
  created_at: "2026-01-01T00:00:00Z",
};

/** The RPCs return row sets; PostgREST hands single-row readers back as arrays. */
function rpcRouter(overrides: Record<string, unknown> = {}) {
  return async (name: string) => {
    if (name in overrides) return { data: overrides[name], error: null };
    switch (name) {
      case "get_invite_by_slug":
        return { data: [LIVE_INVITE], error: null };
      case "get_invite_questions":
        return { data: [], error: null };
      case "get_invite_photos":
        return { data: [], error: null };
      case "get_invite_contributions":
        return { data: [], error: null };
      case "get_invite_state":
        return { data: [{ found: true, is_active: true, expires_at: null }], error: null };
      default:
        return { data: null, error: null };
    }
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRpc.mockImplementation(rpcRouter());
  mockFrom.mockImplementation((table: string) => {
    throw new Error(`Reveal path read table "${table}" directly — RLS will return 0 rows for a guest`);
  });
});

describe("getInviteForReveal — reads through SECURITY DEFINER readers", () => {
  it("resolves the invite by slug via get_invite_by_slug", async () => {

    const result = await getInviteForReveal("maya");

    expect(mockRpc).toHaveBeenCalledWith("get_invite_by_slug", { p_slug: "maya" });
    expect(result?.invite.id).toBe(INVITE_ID);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("carries is_paid through, so the tier gate still sees a paid invite", async () => {

    const result = await getInviteForReveal("maya");

    expect(result?.invite.is_paid).toBe(true);
  });

  it("fetches questions and photos through their readers", async () => {

    await getInviteForReveal("maya");

    expect(mockRpc).toHaveBeenCalledWith("get_invite_questions", { p_invite_id: INVITE_ID });
    expect(mockRpc).toHaveBeenCalledWith("get_invite_photos", { p_invite_id: INVITE_ID });
  });

  it("skips the contributions reader when the invite does not accept them", async () => {

    await getInviteForReveal("maya");

    expect(mockRpc).not.toHaveBeenCalledWith("get_invite_contributions", expect.anything());
  });

  it("fetches contributions when the invite accepts them", async () => {
    mockRpc.mockImplementation(
      rpcRouter({ get_invite_by_slug: [{ ...LIVE_INVITE, accept_contributions: true }] })
    );

    await getInviteForReveal("maya");

    expect(mockRpc).toHaveBeenCalledWith("get_invite_contributions", { p_invite_id: INVITE_ID });
  });

  it("returns null when the reader yields no row", async () => {
    mockRpc.mockImplementation(rpcRouter({ get_invite_by_slug: [] }));

    expect(await getInviteForReveal("nope")).toBeNull();
  });

  it("returns null when the reader yields null", async () => {
    mockRpc.mockImplementation(rpcRouter({ get_invite_by_slug: null }));

    expect(await getInviteForReveal("nope")).toBeNull();
  });
});

describe("getRevealUnavailableReason — classifies without a table read", () => {
  it("asks get_invite_state and reports a missing invite", async () => {
    mockRpc.mockImplementation(rpcRouter({ get_invite_state: [] }));

    const reason = await getRevealUnavailableReason("nope");

    expect(mockRpc).toHaveBeenCalledWith("get_invite_state", { p_slug: "nope" });
    expect(reason).toBe("missing");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("reports a deactivated invite as inactive", async () => {
    mockRpc.mockImplementation(
      rpcRouter({ get_invite_state: [{ found: true, is_active: false, expires_at: null }] })
    );

    expect(await getRevealUnavailableReason("maya")).toBe("inactive");
  });

  it("reports a past expiry as expired", async () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    mockRpc.mockImplementation(
      rpcRouter({ get_invite_state: [{ found: true, is_active: true, expires_at: yesterday }] })
    );

    expect(await getRevealUnavailableReason("maya")).toBe("expired");
  });
});
