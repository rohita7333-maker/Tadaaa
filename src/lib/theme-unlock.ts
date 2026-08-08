/**
 * Pure verifier for the $4.99 one-off premium-theme purchase.
 *
 * The publish path (createInviteShell) hands the Stripe Checkout Session it
 * retrieved to this function before letting a free-tier user publish a premium
 * theme. Keeping the decision pure keeps it testable and keeps the server
 * action authoritative — the client can claim anything, only a session that
 * Stripe itself reports as paid, for this user, for this theme, gets through.
 */
export interface ThemeUnlockSessionLike {
  payment_status?: string | null;
  metadata?: {
    theme_id?: string | null;
    user_id?: string | null;
    subscription_type?: string | null;
  } | null;
}

export interface ThemeUnlockExpectation {
  userId: string;
  themeId: string;
}

export interface ThemeUnlockResult {
  valid: boolean;
  reason?: string;
}

export function verifyThemeUnlockSession(
  session: ThemeUnlockSessionLike | null | undefined,
  { userId, themeId }: ThemeUnlockExpectation
): ThemeUnlockResult {
  if (!session) return { valid: false, reason: "Payment could not be verified." };
  if (session.payment_status !== "paid") {
    return { valid: false, reason: "Payment has not completed yet." };
  }

  const metadata = session.metadata;
  if (!metadata) return { valid: false, reason: "Payment could not be verified." };

  if (metadata.subscription_type !== "plus") {
    return { valid: false, reason: "This purchase does not unlock a premium theme." };
  }
  if (!userId || metadata.user_id !== userId) {
    return { valid: false, reason: "This purchase belongs to another account." };
  }
  if (!themeId || metadata.theme_id !== themeId) {
    return { valid: false, reason: "This purchase was for a different theme." };
  }

  return { valid: true };
}
