export interface GiftRow {
  id: string;
  status: string;
  redeemed_by: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GiftQueryClient = { from: (table: string) => any };

/**
 * Returns the gift row if giftId is non-null, the gift status is "redeemed",
 * and it was redeemed by the given user. Returns null otherwise.
 * Does NOT mutate — caller is responsible for marking the gift used.
 */
export async function validateGiftForUser(
  adminClient: GiftQueryClient,
  giftId: string | null,
  userId: string
): Promise<GiftRow | null> {
  if (!giftId || !userId) return null;
  const { data, error } = await adminClient
    .from("gift_purchases")
    .select("id, status, redeemed_by")
    .eq("id", giftId)
    .eq("redeemed_by", userId)
    .maybeSingle();
  if (error || !data) return null;
  if (data.status !== "redeemed") return null;
  return data;
}
