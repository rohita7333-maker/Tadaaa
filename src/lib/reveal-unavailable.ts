/**
 * Why a reveal could not be shown.
 *
 * Web branches three ways in `surprise-invite/src/app/surprise/[slug]/page.tsx`
 * — no row, `!is_active`, and `isExpired(expires_at)` — and shows a different
 * message and CTA for each. Mobile's `getInviteForReveal` collapses all three
 * into `null` (db.ts:249-250), so the app told every guest "this surprise has
 * closed", including guests holding a link that was simply mistyped.
 *
 * `db.ts` is a locked module, so the disambiguation lives here instead. It runs
 * ONLY on the failure path — the happy path is untouched and pays nothing.
 *
 * Deliberately reads `is_active` and `expires_at` only. `invites.status` exists
 * on the row and is never read anywhere in this product.
 */
export type RevealUnavailableReason = "missing" | "inactive" | "expired";

/** Mirrors web's branch order: missing → inactive → expired. */
export function classifyReveal(row: {
  is_active: boolean | null;
  expires_at: string | null;
} | null): RevealUnavailableReason {
  if (!row) return "missing";
  if (!row.is_active) return "inactive";
  if (row.expires_at && new Date(row.expires_at) < new Date()) return "expired";
  // The row is fine — the caller only asks after a failed load, so treat an
  // otherwise-healthy row as an unresolvable link rather than inventing a state.
  return "missing";
}

/**
 * The fetch half of this lives in db.ts as `getRevealUnavailableReason`.
 *
 * It used to live here and imported the Supabase client lazily, inside the
 * call, so that module-scope `import` would not drag native AsyncStorage into
 * the pure-classifier test above. That workaround existed only because db.ts
 * was treated as a locked module. It no longer is, and the dynamic import was
 * not resolvable under jest, so the fetch moved to db.ts — which already
 * imports the client at module scope — and this file went back to being pure.
 */

/**
 * Copy is verbatim from web's three branches. Web's `heading`/`body` live in
 * markup there; here they are data so a test can compare both sides.
 *
 * Web's own error screens still paint the RETIRED warm palette
 * (#FFF8F0 / #2D2926 / #6B5E57) — they were missed by the editorial re-theme.
 * Mobile does not copy that: it keeps the editorial reveal ground. Web's
 * un-migrated colour there is a web-side defect, not a target to match.
 */
export const REVEAL_UNAVAILABLE_COPY: Record<
  RevealUnavailableReason,
  { heading: string; body: string; cta: string | null }
> = {
  missing: {
    heading: "This surprise doesn't exist",
    body: "The link may be invalid or the surprise was deleted.",
    cta: "Create your own surprise",
  },
  inactive: {
    heading: "This surprise is no longer available",
    body: "The creator has deactivated this page.",
    cta: null,
  },
  expired: {
    heading: "This surprise has expired",
    body: "The moment has passed, but the memory lives on.",
    cta: "Create a new surprise",
  },
};
