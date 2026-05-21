import { PostHog } from "posthog-node";

// PostHog server-side client. Lazily initialised so importing this module is
// side-effect free and safe in environments where POSTHOG_API_KEY is unset
// (local dev without analytics, CI, tests).
let client: PostHog | null = null;

function getClient(): PostHog | null {
  if (client) return client;
  const key = process.env.POSTHOG_API_KEY;
  if (!key) return null;
  client = new PostHog(key, {
    host: process.env.POSTHOG_HOST || "https://us.i.posthog.com",
  });
  return client;
}

/**
 * Server-side analytics capture. No-ops when POSTHOG_API_KEY is unset so
 * production code can call this unconditionally.
 *
 * Do NOT include PII (email, full name) in `props`. Stick to ids, themes,
 * channels, and feature flags.
 */
export async function trackServer(
  distinctId: string,
  event: string,
  props?: Record<string, unknown>,
): Promise<void> {
  const c = getClient();
  if (!c) return;
  c.capture({ distinctId, event, properties: props });
  // shutdown() flushes the queue. In serverless / per-request contexts this
  // is the safest pattern — we accept the cost of recreating the client on
  // the next call rather than risking dropped events.
  await c.shutdown();
  client = null;
}
