/**
 * rsvp-client.ts — browser-side RSVP helpers.
 *
 * Extracted verbatim from RSVPButton so every reveal surface (tap, countdown,
 * scroll story) records RSVPs through the same visitor-token + retry path.
 * Client-only: guards `window`/`crypto` for SSR safety.
 */

const VISITOR_TOKEN_KEY = "tadaaaa.visitor_token";
const RSVP_ENDPOINT = "/api/invite/rsvp";
const DEFAULT_ATTEMPTS = 3;
const BACKOFF_STEP_MS = 400;

function fallbackToken(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Stable per-browser visitor id, persisted in localStorage. */
export function getVisitorToken(): string {
  if (typeof window === "undefined") return "";
  try {
    let token = window.localStorage.getItem(VISITOR_TOKEN_KEY);
    if (!token) {
      token =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : fallbackToken();
      window.localStorage.setItem(VISITOR_TOKEN_KEY, token);
    }
    return token;
  } catch {
    return fallbackToken();
  }
}

/**
 * POST an RSVP with bounded retries. Retries network errors, 429s, and 5xx;
 * gives up on other 4xx. Resolves true only on a 2xx.
 */
export async function postRsvp(
  inviteId: string,
  visitorToken: string,
  name?: string,
  attempts = DEFAULT_ATTEMPTS
): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(RSVP_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId, visitorToken, name }),
      });
      if (res.ok) return true;
      if (res.status >= 400 && res.status < 500 && res.status !== 429) return false;
    } catch {
      // network — retry
    }
    await new Promise((r) => setTimeout(r, BACKOFF_STEP_MS * (i + 1)));
  }
  return false;
}
