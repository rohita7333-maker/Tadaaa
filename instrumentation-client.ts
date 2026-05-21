// Next.js 16 + Turbopack: client-side Sentry init must live in
// `instrumentation-client.ts` at the project root. The legacy
// `sentry.client.config.ts` filename is deprecated in @sentry/nextjs v8+
// and does NOT work under Turbopack (which this app uses for dev).
// See: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration({ maskAllText: false, blockAllMedia: true }),
  ],
  enabled: process.env.NODE_ENV === "production",
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
