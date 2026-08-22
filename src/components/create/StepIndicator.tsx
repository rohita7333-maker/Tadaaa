"use client";

import { Check } from "lucide-react";

interface StepIndicatorProps {
  currentStep: number;
  /**
   * Jump back to an already-completed step. Mockup `wjump(k)` only moves
   * backwards (`if(k<=S.wstep)`), so forward steps stay inert here too.
   */
  onJump?: (step: number) => void;
}

const STEPS = ["Occasion", "Photos & Message", "Question", "Preview & publish"];

/**
 * Wizard step rail — mockup `.hubsteps` / `.hstep` (L300-306).
 *
 * Sticky vertical rail on the hub grid; below 960px it collapses to a
 * horizontally scrolling strip with a mist hairline underneath, exactly as the
 * mockup's `@media(max-width:960px)` override does.
 */
export default function StepIndicator({ currentStep, onJump }: StepIndicatorProps) {
  return (
    <ol
      className={
        // ≤960px: horizontal scroll strip, static, mist rule beneath.
        "flex overflow-x-auto gap-1 bg-paper border-b border-mist mb-[18px] " +
        // >960px: sticky vertical rail under the 88px-tall app bar.
        "min-[961px]:sticky min-[961px]:top-[88px] min-[961px]:flex-col " +
        "min-[961px]:gap-0 min-[961px]:overflow-visible min-[961px]:border-b-0 min-[961px]:mb-0"
      }
    >
      {STEPS.map((label, i) => {
        const step = i + 1;
        const isDone = step < currentStep;
        const isActive = step === currentStep;
        const canJump = isDone && Boolean(onJump);

        return (
          <li key={label}>
            <button
              type="button"
              onClick={canJump ? () => onJump?.(step) : undefined}
              aria-current={isActive ? "step" : undefined}
              aria-disabled={canJump ? undefined : true}
              className={
                "flex items-center gap-2.5 px-3.5 py-[11px] text-sm min-h-11 whitespace-nowrap " +
                "border-l-2 transition-colors duration-150 " +
                "focus-visible:outline-2 focus-visible:outline-coral focus-visible:outline-offset-[-2px] " +
                (isActive
                  ? "text-ink font-semibold border-l-coral"
                  : isDone
                    ? "text-stone border-l-transparent hover:text-ink"
                    : // Mockup paints upcoming steps `--mist` (1.15:1 on paper).
                      // Accessibility divergence: chip-muted-text, 5.9:1.
                      "text-chip-muted-text border-l-transparent cursor-default")
              }
            >
              {isDone ? (
                <Check className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              ) : (
                <span className="w-4 shrink-0 text-xs tabular-nums" aria-hidden="true">
                  {step}
                </span>
              )}
              {label}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
