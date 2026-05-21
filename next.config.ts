import type { NextConfig } from "next";
import path from "path";

const isDev = process.env.NODE_ENV !== "production";

// 'unsafe-eval' is required by Next.js HMR + React fast-refresh in dev only.
// Tailwind utility classes + framer-motion ship inline <style> tags so
// 'unsafe-inline' on style-src stays for now; tightening to nonces would
// require route-level middleware reworking every styled element. Tracked in
// HANDOFF as P2 polish.
const scriptSrc = isDev
  ? "'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com"
  : "'self' 'unsafe-inline' https://js.stripe.com";

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
      "img-src 'self' data: blob: https://*.supabase.co https://picsum.photos",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://api.stripe.com",
      "media-src 'self' blob: https://*.supabase.co",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
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

export default nextConfig;
