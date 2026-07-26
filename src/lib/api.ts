/**
 * Backend client for the secret-key server routes that CANNOT run in the mobile
 * bundle (Anthropic AI draft, Stripe checkout, server-side collage render,
 * photo moderation). These are the SAME Next API routes the web app already
 * exposes — the mobile app just calls them over HTTPS with the signed-in user's
 * access token. Zero changes to the web app required.
 *
 * Every call requires EXPO_PUBLIC_API_BASE_URL to point at a running/deployed
 * Next backend. When it's unset, `hasBackend` is false and callers surface a
 * friendly "connect a backend" message instead of crashing.
 */
import { ENV, hasBackend } from "./env";
import { supabase } from "./supabase";

export class BackendUnavailableError extends Error {
  constructor() {
    super(
      "This feature needs the TaDaaaa web backend. Set EXPO_PUBLIC_API_BASE_URL to your running Next app (LAN dev IP or deployed URL)."
    );
    this.name = "BackendUnavailableError";
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};
}

async function post<T>(path: string, body: unknown): Promise<T> {
  if (!hasBackend) throw new BackendUnavailableError();
  const res = await fetch(`${ENV.apiBaseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    // Prefer the backend's friendly message when present; never leak internals.
    let msg = `Request failed (${res.status})`;
    if (res.status === 401) msg = "Please sign in to continue.";
    else if (res.status === 429) msg = "Too many requests — try again in a moment.";
    else {
      try {
        const j = (await res.json()) as { error?: string };
        if (j?.error) msg = j.error;
      } catch {
        /* keep default */
      }
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

async function getJson<T>(path: string): Promise<T | null> {
  if (!hasBackend) return null;
  try {
    const res = await fetch(`${ENV.apiBaseUrl}${path}`);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export interface AIDraft {
  title: string;
  message: string;
  themeId: string;
  questions: { text: string; yesLabel: string; noLabel: string }[];
}

export type AITone = "warm" | "playful" | "elegant" | "heartfelt" | "funny";

/** POST /api/mobile/ai/draft-invite — bearer-authed Anthropic invite drafting. */
export function aiDraftInvite(input: {
  recipient: string;
  occasion: string;
  tone: AITone;
  details?: string;
}): Promise<AIDraft> {
  return post<{ draft: AIDraft }>("/api/mobile/ai/draft-invite", input).then((r) => r.draft);
}

/**
 * POST /api/mobile/stripe/checkout — returns a hosted Stripe Checkout URL to
 * open in an in-app browser. mode "unlimited" upgrades the subscription;
 * "plus" unlocks a single premium theme (requires themeId). No in-app purchase
 * / RevenueCat — no Apple cut. The existing Stripe webhook fulfils server-side.
 */
export function createStripeCheckout(input: {
  mode: "plus" | "unlimited";
  themeId?: string;
}): Promise<{ url?: string; error?: string }> {
  return post("/api/mobile/stripe/checkout", input);
}

export interface GiftInfo {
  state: "redeemable" | "redeemed" | "expired";
  senderName: string | null;
  giftMessage: string | null;
  expiresAt: string | null;
}

/**
 * GET /api/mobile/gift/[token] — gift lookup (gift_purchases is service-role
 * only, so this must go through the backend). Returns null when no backend is
 * configured or the token isn't found.
 */
export function fetchGift(token: string): Promise<GiftInfo | null> {
  return getJson<GiftInfo>(`/api/mobile/gift/${encodeURIComponent(token)}`);
}

/** POST /api/mobile/photos/sign-upload — bearer-authed signed upload URL (pending path). */
export function signedPhotoUploadUrl(input: {
  inviteId: string;
  index: number;
  ext: string;
}): Promise<{ path: string; signedUrl: string }> {
  return post("/api/mobile/photos/sign-upload", input);
}

/**
 * POST /api/mobile/photos/commit — moderate pending uploads, move them to their
 * canonical location, and insert invite_photos rows. Call after every photo has
 * been PUT to its signed upload URL.
 */
export function commitPhotos(input: {
  inviteId: string;
  photos: { path: string; caption: string; rotationDeg: number }[];
}): Promise<{ ok: boolean; count: number }> {
  return post("/api/mobile/photos/commit", input);
}

export interface RevealPayload {
  invite: Record<string, unknown>;
  photos: { id: string; caption: string; rotation_deg: number; sort_order: number; url: string }[];
  questions: unknown[];
  contributions: { id: string; contributor_name: string; message: string | null }[];
}

/**
 * GET /api/mobile/reveal/[slug] — public reveal payload WITH signed photo URLs.
 * Returns null when no backend is configured or on any error, so the reveal
 * screen falls back to its themed gradient polaroids instead of breaking.
 */
export function fetchRevealPhotos(
  slug: string
): Promise<Pick<RevealPayload, "photos"> | null> {
  return getJson<RevealPayload>(`/api/mobile/reveal/${encodeURIComponent(slug)}`).then(
    (r) => (r ? { photos: r.photos } : null)
  );
}

export { hasBackend };
