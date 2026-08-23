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

/**
 * A failed backend call, carrying the HTTP status.
 *
 * `post()` used to throw a bare `Error`, which discarded the status and left
 * every caller unable to tell 429 from 422 from 503. Web branches on exactly
 * those codes to pick its four AI-drafter messages; mobile could not, so it
 * showed one generic string for all of them. The alternative — string-matching
 * the thrown message — would silently go stale the moment the backend reworded
 * anything.
 *
 * Additive and backwards-compatible: this still extends Error, so every
 * existing `catch (e) { e.message }` keeps working untouched.
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export class BackendUnavailableError extends Error {
  constructor() {
    super(
      "This feature needs the TaDaaaa web backend. Set EXPO_PUBLIC_API_BASE_URL to your running Next app (LAN dev IP or deployed URL)."
    );
    this.name = "BackendUnavailableError";
  }
}

/**
 * Every backend call is time-boxed.
 *
 * `EXPO_PUBLIC_API_BASE_URL` is BAKED into the bundle at export time and points
 * at a LAN address in development — an address that changes whenever the Mac
 * moves network. A `fetch` to a host that does not answer does not fail: it
 * hangs for the OS connect timeout, which is over a minute. Frame B2 loaded its
 * invite, its RSVP count and its header photo in one `Promise.all`, so a stale
 * base URL left the surprise detail screen on its loading skeleton for the
 * whole of that minute. Seen doing exactly that in a browser.
 *
 * GETs are the ones on a render path, so they get the short leash. POSTs
 * include the AI drafter, which legitimately takes tens of seconds.
 */
const GET_TIMEOUT_MS = 8_000;
const POST_TIMEOUT_MS = 30_000;

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
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
  const res = await fetchWithTimeout(
    `${ENV.apiBaseUrl}${path}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify(body),
    },
    POST_TIMEOUT_MS
  );
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
    throw new ApiError(msg, res.status);
  }
  return (await res.json()) as T;
}

async function getJson<T>(path: string): Promise<T | null> {
  if (!hasBackend) return null;
  try {
    const res = await fetchWithTimeout(`${ENV.apiBaseUrl}${path}`, {}, GET_TIMEOUT_MS);
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
