export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// @sentry/nextjs v8+ renamed the helper from `onRequestError` to
// `captureRequestError`. Next.js still expects the file to export
// `onRequestError`, so we re-export with the legacy name.
export { captureRequestError as onRequestError } from "@sentry/nextjs";
