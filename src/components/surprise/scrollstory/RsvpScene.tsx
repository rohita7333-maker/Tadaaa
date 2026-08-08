"use client";

import { useState } from "react";
import type { StoryConfig } from "@/lib/scroll-story/config";
import { ConfettiCanvas } from "@/components/fx/ConfettiCanvas";
import { Reveal } from "./Reveal";
import {
  FOCUS_RING_CLASS,
  HANDWRITING_STACK,
  SEAM_POLAROID_TO_RSVP,
  SEAM_RSVP_TO_FINALE,
  SERIF_STACK,
} from "./shared";

/** Matches the RSVP API's own cap; the RPC NULLIFs empty and caps at 80 too. */
const NAME_MAX_LENGTH = 80;

interface RsvpSceneProps {
  config: StoryConfig;
  /** Records the RSVP. `name` is optional — guests can always stay anonymous. */
  onRsvp?: (name?: string) => Promise<void>;
}

/**
 * Scene 5 — the RSVP ask.
 * GRADIENT SEAM CONTRACT: first stop #E8A5A8 blush (SEAM_POLAROID_TO_RSVP)
 * === PolaroidScene's final stop; final stop #9B3D42 (SEAM_RSVP_TO_FINALE)
 * === FinaleScene's first stop.
 */
export default function RsvpScene({ config, onRsvp }: RsvpSceneProps) {
  const [isRecorded, setIsRecorded] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [name, setName] = useState("");

  async function handleRsvp() {
    if (isRecorded) return;
    setIsRecorded(true);
    setStatusMessage("Recorded!");
    if (!onRsvp) return;
    try {
      await onRsvp(name.trim() || undefined);
    } catch {
      setIsRecorded(false);
      setStatusMessage("Something went wrong — tap to try again.");
    }
  }

  return (
    <section
      aria-label="RSVP"
      className="relative flex min-h-[85vh] items-center justify-center px-6 py-28"
      style={{
        background: `linear-gradient(180deg, ${SEAM_POLAROID_TO_RSVP} 0%, #C4686D 55%, ${SEAM_RSVP_TO_FINALE} 100%)`,
      }}
    >
      {/* Confetti burst engine — listens for .btn-pri clicks, reduced-motion aware */}
      <ConfettiCanvas />

      <Reveal className="mx-auto max-w-2xl text-center">
        <p
          className="text-gold-light"
          style={{ fontFamily: HANDWRITING_STACK, fontSize: "clamp(24px, 4vw, 32px)" }}
        >
          don&apos;t leave me hanging…
        </p>
        <p
          className="mt-2 text-cream"
          style={{
            fontFamily: SERIF_STACK,
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: "clamp(44px, 9vw, 76px)",
            lineHeight: 1.05,
          }}
        >
          please rsvp
        </p>
        {/* Optional name — turns an anonymous count into a guest list. Never
            required: the promise is that nobody has to sign in to say yes. */}
        {!isRecorded && (
          <div className="mt-9">
            <label
              htmlFor="rsvp-name"
              className="block text-sm text-cream/85"
              style={{ fontFamily: SERIF_STACK, fontStyle: "italic" }}
            >
              Who&apos;s saying yes?
            </label>
            <input
              id="rsvp-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={NAME_MAX_LENGTH}
              autoComplete="name"
              placeholder="Your name (optional)"
              className={`mx-auto mt-3 block h-12 w-64 max-w-full rounded-full border border-white/35 bg-white/15 px-5 text-center text-base text-cream backdrop-blur-sm outline-none transition-all duration-300 placeholder:text-cream/55 focus:border-white/70 focus:bg-white/25 ${FOCUS_RING_CLASS}`}
            />
          </div>
        )}
        <button
          type="button"
          onClick={handleRsvp}
          disabled={isRecorded}
          className={`btn-pri mt-7 rounded-full bg-white px-9 py-4 text-base font-semibold text-rose-deep shadow-[0_16px_36px_rgba(35,20,15,0.3)] transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.97] disabled:hover:translate-y-0 ${FOCUS_RING_CLASS}`}
        >
          {isRecorded ? "You're in! 🎉" : "🎉 Count me in!"}
        </button>
        <p
          role="status"
          aria-live="polite"
          className="mt-4 min-h-6 text-sm text-cream/85"
        >
          {statusMessage}
        </p>
        <p className="sr-only">RSVP for {config.recipient}&apos;s surprise</p>
      </Reveal>
    </section>
  );
}
