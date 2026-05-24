import { describe, it, expect, vi } from "vitest";
import { validateGiftForUser } from "./gift-redemption";

function mockClient(gift: { id: string; status: string; redeemed_by: string | null } | null) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: gift, error: null }),
          }),
        }),
      }),
    }),
  };
}

describe("validateGiftForUser", () => {
  it("returns null when giftId is null", async () => {
    const client = mockClient(null);
    expect(await validateGiftForUser(client, null, "user-1")).toBeNull();
  });

  it("returns null when userId is empty", async () => {
    const client = mockClient(null);
    expect(await validateGiftForUser(client, "gift-1", "")).toBeNull();
  });

  it("returns null when gift not found in DB", async () => {
    const client = mockClient(null);
    expect(await validateGiftForUser(client, "gift-999", "user-1")).toBeNull();
  });

  it("returns null when gift status is 'pending' (not yet redeemed)", async () => {
    const client = mockClient({ id: "gift-1", status: "pending", redeemed_by: "user-1" });
    expect(await validateGiftForUser(client, "gift-1", "user-1")).toBeNull();
  });

  it("returns null when gift status is 'used' (already consumed)", async () => {
    const client = mockClient({ id: "gift-1", status: "used", redeemed_by: "user-1" });
    expect(await validateGiftForUser(client, "gift-1", "user-1")).toBeNull();
  });

  it("returns the gift row when status is 'redeemed' and user matches", async () => {
    const gift = { id: "gift-1", status: "redeemed", redeemed_by: "user-1" };
    const client = mockClient(gift);
    const result = await validateGiftForUser(client, "gift-1", "user-1");
    expect(result).toEqual(gift);
  });
});
