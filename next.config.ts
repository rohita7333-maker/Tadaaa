import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import path from "path";

const isDev = process.env.NODE_ENV !== "production";

// 'unsafe-eval' is required by Next.js HMR + React fast-refresh in dev only.
// Tailwind utility classes + framer-motion ship inline <style> tags so
// 'unsafe-inline' on style-src stays for now; tightening to nonces would
// require route-level middleware reworking every styled element. Tracked in
// HANDOFF as P2 polish.
// PostHog + Sentry hosts are allowed in both dev and prod so analytics +
// session replay actually work behind the CSP. PostHog regional ingest +
// asset hosts (`us.i.posthog.com`, `us-assets.i.posthog.com`) are both single
// labels under `.i.posthog.com`, so `*.i.posthog.com` covers them. NOTE: CSP
// `*` is only valid as a whole leftmost label — a partial-label wildcard like
// `*-assets.i.posthog.com` is invalid and silently dropped by browsers, so we
// must NOT use it. Sentry: `*.ingest.sentry.io` envelopes + `*.sentry.io` SDK.
const analyticsHosts =
  "https://*.i.posthog.com https://*.ingest.sentry.io https://*.sentry.io";

const scriptSrc = isDev
  ? `'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com ${analyticsHosts}`
  : `'self' 'unsafe-inline' https://js.stripe.com ${analyticsHosts}`;

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co https://picsum.photos https://*.picsum.photos https://*.i.posthog.com",
      "font-src 'self' data:",
      `connect-src 'self' https://*.supabase.co https://api.stripe.com ${analyticsHosts}`,
      "media-src 'self' blob: https://*.supabase.co",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "worker-src 'self' blob:",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Hide the floating dev-mode indicator (the bottom-left "N" badge) so it
  // never bleeds into screenshots / dogfooding sessions.
  devIndicators: false,
  // Pin Turbopack root to this app dir so it doesn't walk up to the parent
  // /ClaudeCodeProject package-lock.json and try to resolve modules from there.
  turbopack: {
    root: path.resolve(__dirname),
  },
  serverExternalPackages: ["@remotion/renderer", "@remotion/bundler", "@remotion/cli"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

// Wrap with Sentry to enable source-map upload + auto-instrumentation when
// SENTRY_ORG / SENTRY_PROJECT / SENTRY_AUTH_TOKEN are configured. With those
// env vars unset, this is effectively a passthrough.
export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
});
