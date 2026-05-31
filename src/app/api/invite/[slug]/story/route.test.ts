import { describe, it, expect, vi, beforeEach } from "vitest";

const invite = {
  title: "Sara 30th",
  occasion_type: "birthday",
  creator_id: "u1",
  is_active: true,
  expires_at: null as string | null,
};
let profileTier = "free";

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () =>
            table === "invites"
              ? { data: invite }
              : {
                  data: {
                    subscription_tier: profileTier,
                    subscription_expires_at: null,
                  },
                },
        }),
      }),
    }),
  }),
}));

import { GET } from "./route";

const call = (slug = "abc") =>
  GET(new Request(`http://x/api/invite/${slug}/story`), {
    params: Promise.resolve({ slug }),
  });

beforeEach(() => {
  invite.is_active = true;
  invite.expires_at = null;
  profileTier = "free";
});

describe("story export route", () => {
  it("403s for free-tier owner", async () => {
    profileTier = "free";
    const res = await call();
    expect(res.status).toBe(403);
  });

  it("410s for inactive invite", async () => {
    profileTier = "plus";
    invite.is_active = false;
    const res = await call();
    expect(res.status).toBe(410);
  });

  it("returns PNG attachment for paid owner", async () => {
    profileTier = "plus";
    const res = await call();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain("attachment");
    expect(res.headers.get("content-disposition")).toContain("story.png");
  });
});
