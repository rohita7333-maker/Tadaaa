"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { durations, easings, makeReducedMotionTransition } from "@/lib/motion";
import type { RevealStyle } from "@/lib/templates";
import {
  LABEL,
  INPUT,
  SELECTABLE,
  SELECTABLE_ON,
  TGLROW,
  TGLROW_M,
  TGLROW_H,
  TGLROW_P,
} from "./editorial";

interface RevealSettingsProps {
  revealType: RevealStyle;
  countdownDate: string;
  expiresAt: string;
  hasExpiry: boolean;
  acceptContributions: boolean;
  onRevealTypeChange: (v: RevealStyle) => void;
  onCountdownDateChange: (v: string) => void;
  onExpiresAtChange: (v: string) => void;
  onHasExpiryChange: (v: boolean) => void;
  onAcceptContributionsChange: (v: boolean) => void;
}

const conditionalFieldTransition = (shouldReduce: boolean | null | undefined) =>
  makeReducedMotionTransition(shouldReduce, { duration: durations.quick, ease: easings.entrance });

const STYLES: { id: RevealStyle; name: string; blurb: string }[] = [
  { id: "tap", name: "Tap to reveal", blurb: "One tap. Everything at once." },
  { id: "countdown", name: "Countdown", blurb: "Anticipation, to the second." },
  { id: "scroll_story", name: "Scroll story", blurb: "A cinematic scroll, scene by scene." },
];

/**
 * Reveal-style shot — mockup `w4`'s inline `shots` map (L1188-1191). The
 * mockup drives these with `@keyframes mscroll` / `mpulse`; the token layer is
 * frozen this phase, so the same motion is expressed with framer-motion, which
 * also gets `prefers-reduced-motion` for free.
 */
function Shot({ id, still }: { id: RevealStyle; still: boolean }) {
  const loop = { repeat: Infinity, ease: "easeInOut" as const };

  if (id === "scroll_story") {
    return (
      <div className="relative h-full w-full overflow-hidden">
        <motion.div
          className="absolute inset-x-0 top-0 h-[200%]"
          animate={still ? undefined : { y: ["0%", "-15%", "0%"] }}
          transition={{ ...loop, duration: 3 }}
        >
          <div className="h-1/2 bg-ink" />
          <div className="h-1/2 bg-pebble" />
        </motion.div>
      </div>
    );
  }

  if (id === "tap") {
    return (
      <div className="flex h-full w-full items-center justify-center bg-ink">
        <motion.span
          className="block h-8 w-[26px] rounded bg-sand"
          animate={still ? undefined : { opacity: [0.6, 1, 0.6] }}
          transition={{ ...loop, duration: 1.6 }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-ink">
      <motion.span
        className="font-heading text-xs tabular-nums text-sand"
        animate={still ? undefined : { opacity: [0.6, 1, 0.6] }}
        transition={{ ...loop, duration: 1 }}
      >
        03:12:44
      </motion.span>
    </div>
  );
}

/**
 * Reveal mechanic + schedule — mockup `w4` `.rsel`/`.rcard` (L364-368) and
 * `w5`'s `.tglrow`/`.sw` rows (L338-348). The switch markup is the `.ed-sw`
 * atom already ported into globals.css.
 */
export default function RevealSettings({
  revealType,
  countdownDate,
  expiresAt,
  hasExpiry,
  acceptContributions,
  onRevealTypeChange,
  onCountdownDateChange,
  onExpiresAtChange,
  onHasExpiryChange,
  onAcceptContributionsChange,
}: RevealSettingsProps) {
  const shouldReduce = useReducedMotion();
  const minDate = new Date();
  minDate.setMinutes(minDate.getMinutes() + 5);
  const minDateStr = minDate.toISOString().slice(0, 16);

  return (
    <div>
      {/* Mockup `.rsel` */}
      <p className={LABEL}>Pick how it unfolds</p>
      <div className="flex flex-col gap-3" role="radiogroup" aria-label="Reveal mechanic">
        {STYLES.map((style) => {
          const on = revealType === style.id;
          return (
            <button
              key={style.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onRevealTypeChange(style.id)}
              className={cn(
                SELECTABLE,
                "flex items-center gap-4",
                on ? `${SELECTABLE_ON} p-[15px]` : "p-4"
              )}
            >
              <span className="block h-[104px] w-[74px] shrink-0 overflow-hidden rounded-lg border border-mist">
                <Shot id={style.id} still={Boolean(shouldReduce)} />
              </span>
              <span className="min-w-0">
                <span className="block font-heading text-[17px] text-ink">{style.name}</span>
                <span className="block text-[13px] text-stone">{style.blurb}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Reveal date picker — countdown gates the whole reveal on it; scroll
          story feeds its finale countdown from the same value. */}
      <AnimatePresence>
        {(revealType === "countdown" || revealType === "scroll_story") && (
          <motion.div
            key="countdown-date"
            initial={{ opacity: 0, y: shouldReduce ? 0 : -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: shouldReduce ? 0 : -6 }}
            transition={conditionalFieldTransition(shouldReduce)}
            className="mt-5"
          >
            <label htmlFor="reveal-date" className={LABEL}>
              Reveal date &amp; time
            </label>
            <input
              id="reveal-date"
              type="datetime-local"
              value={countdownDate}
              min={minDateStr}
              onChange={(e) => onCountdownDateChange(e.target.value)}
              className={INPUT}
            />
            {revealType === "scroll_story" && (
              <p className="mt-1.5 text-[13px] text-stone">
                The big day. This is what the finale counts down to.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-2">
        {/* Mockup `.tglrow` + `.sw` */}
        <div className={TGLROW}>
          <div className={TGLROW_M}>
            <h4 className={TGLROW_H}>Set an expiry date</h4>
            <p className={TGLROW_P}>The link stops working after this moment.</p>
          </div>
          <label className="ed-sw">
            <input
              type="checkbox"
              checked={hasExpiry}
              onChange={(e) => onHasExpiryChange(e.target.checked)}
              aria-label="Set an expiry date"
            />
            <span className="ed-tr" />
          </label>
        </div>

        <AnimatePresence>
          {hasExpiry && (
            <motion.div
              key="expiry-date"
              initial={{ opacity: 0, y: shouldReduce ? 0 : -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: shouldReduce ? 0 : -6 }}
              transition={conditionalFieldTransition(shouldReduce)}
              className="py-4"
            >
              <label htmlFor="expiry-date" className={LABEL}>
                Expiry date
              </label>
              <input
                id="expiry-date"
                type="datetime-local"
                value={expiresAt}
                min={minDateStr}
                onChange={(e) => onExpiresAtChange(e.target.value)}
                className={INPUT}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collaborative memory invites — when on, the dashboard exposes a
            /contribute/<slug> link for family to add photos and notes. */}
        <div className={TGLROW}>
          <div className={TGLROW_M}>
            <h4 className={TGLROW_H}>Group contributions</h4>
            <p className={TGLROW_P}>
              Friends add words and photos before it goes live. You approve each one.
            </p>
          </div>
          <label className="ed-sw">
            <input
              type="checkbox"
              checked={acceptContributions}
              onChange={(e) => onAcceptContributionsChange(e.target.checked)}
              aria-label="Let family contribute photos and messages"
            />
            <span className="ed-tr" />
          </label>
        </div>
      </div>
    </div>
  );
}
