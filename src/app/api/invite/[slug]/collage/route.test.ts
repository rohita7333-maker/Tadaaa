import { describe, it, expect, vi, beforeEach } from "vitest";

const invite = {
  id: "inv-1",
  title: "Sara 30th",
  occasion_type: "birthday",
  creator_id: "u1",
  is_active: true,
  expires_at: null as string | null,
};
let profileTier = "free";
let photoRows: { storage_path: string; caption: string; rotation_deg: number; sort_order: number }[] = [];

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: (col: string) => ({
          maybeSingle: async () => {
            if (table === "invites") return { data: invite };
            return {
              data: {
                subscription_tier: profileTier,
                subscription_expires_at: null,
              },
            };
          },
          order: () => ({
            limit: async () => ({ data: photoRows }),
          }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/sign-storage", () => ({
  signPhotoList: async (
    _bucket: string,
    photos: { storage_path: string; caption: string; rotation_deg: number; sort_order: number }[]
  ) =>
    photos.map((p) => ({
      ...p,
      url: `https://example.com/signed/${p.storage_path}`,
    })),
}));

import { GET } from "./route";

const call = (slug = "abc") =>
  GET(new Request(`http://x/api/invite/${slug}/collage`), {
    params: Promise.resolve({ slug }),
  });

beforeEach(() => {
  invite.is_active = true;
  invite.expires_at = null;
  profileTier = "free";
  photoRows = [];
});

describe("collage route", () => {
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

  it("returns PNG attachment for paid owner with photos", async () => {
    profileTier = "plus";
    photoRows = [
      { storage_path: "inv-1/0.jpg", caption: "Cheers", rotation_deg: 0, sort_order: 0 },
      { storage_path: "inv-1/1.jpg", caption: "Fun", rotation_deg: 0, sort_order: 1 },
    ];
    const res = await call();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain("attachment");
    expect(res.headers.get("content-disposition")).toContain("collage.png");
  });

  it("falls back to D1 single-card when no photos", async () => {
    profileTier = "plus";
    photoRows = [];
    const res = await call();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain("collage.png");
  });
});
