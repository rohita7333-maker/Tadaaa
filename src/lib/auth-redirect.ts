// Shared allowlist-based redirect validation for post-auth landings.
// Used by /auth/callback (OAuth + magic link + password reset) and by the
// password sign-in action, so every auth path agrees on what "next" is safe.
// Prevents open-redirect via `?next=https://evil.com`.
const ALLOWED_NEXT_PREFIXES = [
  "/dashboard",
  "/create",
  "/settings",
  "/pricing",
  "/auth/reset-password",
  "/about",
];

export function safeNext(raw: string | null | undefined): string {
  if (!raw) return "/dashboard";
  // Must be a same-origin path, not a protocol-relative URL.
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  // Strip any embedded scheme or `\` Windows hack.
  if (/[\\:]/.test(raw)) return "/dashboard";
  return ALLOWED_NEXT_PREFIXES.some((p) => raw === p || raw.startsWith(`${p}/`) || raw.startsWith(`${p}?`))
    ? raw
    : "/dashboard";
}
