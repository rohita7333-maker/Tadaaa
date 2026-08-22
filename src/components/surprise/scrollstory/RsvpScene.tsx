"use client";

import { useState } from "react";
import type { StoryConfig } from "@/lib/scroll-story/config";
import { ConfettiCanvas } from "@/components/fx/ConfettiCanvas";
import { Reveal } from "./Reveal";
import {
  FOCUS_RING_CLASS,
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
 * Scene 5 — the RSVP ask (`.s-rsvp` in the mockup: ink ground, italic serif
 * caption in sand, white ask, transparent sand-bordered field, coral CTA).
 *
 * GRADIENT SEAM CONTRACT: first stop #E8E4E0 (SEAM_POLAROID_TO_RSVP) ===
 * PolaroidScene's final stop; final stop #D45847 (SEAM_RSVP_TO_FINALE) ===
 * FinaleScene's first stop. This scene owns the whole descent into night: mist
 * drops to ink by 26 % so the vertically-centred ask sits on the mockup's ink
 * ground, then the ground flares coral on the way out.
 */
export default function RsvpScene({ config, onRsvp }: RsvpSceneProps) {
  const [isRecorded, setIsRecorded] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [name, setName] = useState("");

  async function handleRsvp() {
    if (isRecorded) return;
    setIsRecorded(true);
    setStatusMessage(
      config.sender ? `Recorded. ${config.sender} will know.` : "Recorded."
    );
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
        background: `linear-gradient(180deg, ${SEAM_POLAROID_TO_RSVP} 0%, #8F8B87 12%, #1A1A1A 26%, #1A1A1A 58%, #522C28 76%, #8A3F35 90%, ${SEAM_RSVP_TO_FINALE} 100%)`,
      }}
    >
      {/* Confetti burst engine — listens for .btn-pri clicks, reduced-motion aware */}
      <ConfettiCanvas />

      <Reveal className="mx-auto max-w-2xl text-center">
        <p
          style={{
            fontFamily: SERIF_STACK,
            fontStyle: "italic",
            fontSize: "17px",
            color: "var(--sand)",
          }}
        >
          Don&apos;t leave me hanging
        </p>
        <h2
          className="mt-2"
          style={{
            fontFamily: SERIF_STACK,
            fontWeight: 400,
            letterSpacing: "-0.02em",
            fontSize: "clamp(24px, 5vw, 32px)",
            lineHeight: 1.1,
            color: "var(--paper)",
          }}
        >
          Are you in?
        </h2>

        {/* Optional name — turns an anonymous count into a guest list. Never
            required: the promise is that nobody has to sign in to say yes. */}
        {!isRecorded && (
          <div className="mx-auto mt-8 w-full max-w-[300px]">
            <label
              htmlFor="rsvp-name"
              className="block text-[11px] uppercase"
              style={{ letterSpacing: "0.1em", color: "var(--sand)" }}
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
              className={`mt-3 block w-full rounded-md bg-transparent px-4 py-3 text-center text-base outline-none transition-colors duration-200 ${FOCUS_RING_CLASS}`}
              style={{
                border: "1px solid var(--sand)",
                color: "var(--paper)",
              }}
            />
          </div>
        )}
        <button
          type="button"
          onClick={handleRsvp}
          disabled={isRecorded}
          className={`btn-pri ed-btn ed-btn-coral mx-auto mt-3 block w-full max-w-[300px] ${FOCUS_RING_CLASS}`}
        >
          {isRecorded ? "You're in" : "Count me in"}
        </button>
        <p
          role="status"
          aria-live="polite"
          className="mt-4 min-h-6 text-sm"
          style={{
            fontFamily: SERIF_STACK,
            fontStyle: "italic",
            color: "var(--sand)",
          }}
        >
          {statusMessage}
        </p>
        <p className="sr-only">RSVP for {config.recipient}&apos;s surprise</p>
      </Reveal>
    </section>
  );
}
