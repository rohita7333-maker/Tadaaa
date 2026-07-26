/**
 * Typed, validated access to EXPO_PUBLIC_* env vars.
 * Fails loud at startup if a required public var is missing — better than a
 * cryptic Supabase 401 three screens deep.
 *
 * SECURITY: only EXPO_PUBLIC_* values are bundled into the client. The
 * Supabase service-role key, Stripe secret, Anthropic key, and Sightengine
 * secret NEVER appear here — those live only on the Next backend.
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required env var ${name}. Add it to mobile/.env and restart Expo with a cache clear (expo start -c).`
    );
  }
  return value;
}

export const ENV = {
  supabaseUrl: required(
    "EXPO_PUBLIC_SUPABASE_URL",
    process.env.EXPO_PUBLIC_SUPABASE_URL
  ),
  supabaseAnonKey: required(
    "EXPO_PUBLIC_SUPABASE_ANON_KEY",
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  ),
  /** Next backend origin for secret-key server routes. */
  apiBaseUrl: (process.env.EXPO_PUBLIC_API_BASE_URL || "").replace(/\/$/, ""),
  /** Public origin for building recipient reveal links. */
  siteUrl: (
    process.env.EXPO_PUBLIC_SITE_URL ||
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    ""
  ).replace(/\/$/, ""),
} as const;

/** True when a backend is configured for the secret-key server routes. */
export const hasBackend = ENV.apiBaseUrl.length > 0;
