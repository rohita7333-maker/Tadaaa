/**
 * a11y.ts — Accessibility helpers for TaDaaaa.
 *
 * Provides utilities for respecting `prefers-reduced-motion`.
 *
 * Usage in components:
 *   import { useReducedMotion } from "framer-motion";
 *   import { getReducedMotionTransition } from "@/lib/a11y";
 *
 *   const shouldReduce = useReducedMotion();
 *   const transition = getReducedMotionTransition(shouldReduce, { duration: 0.6 });
 */

// Re-export for convenience — components only need one import.
export { useReducedMotion } from "framer-motion";

/**
 * Pure helper — given the `prefers-reduced-motion` preference value returned
 * by framer-motion's `useReducedMotion()`, return the correct transition object.
 *
 * - `true`        → motion is disabled → returns `reduced` (default `{duration: 0}`)
 * - `false`/`null`→ motion is fine     → returns `normal`
 *
 * This is intentionally NOT a hook so it can be tested without a React context.
 *
 * @param shouldReduce - result of `useReducedMotion()` from framer-motion.
 * @param normal       - transition to use when motion is allowed.
 * @param reduced      - transition for reduced-motion users. Defaults to `{duration: 0}`.
 */
export function getReducedMotionTransition(
  shouldReduce: boolean | null | undefined,
  normal: object,
  reduced: object = { duration: 0 }
): import("framer-motion").Transition {
  return (shouldReduce === true ? reduced : normal) as import("framer-motion").Transition;
}
