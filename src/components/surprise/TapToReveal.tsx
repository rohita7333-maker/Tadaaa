"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { type Theme } from "@/lib/themes";
import PolaroidCarousel from "./PolaroidCarousel";
import MessageReveal from "./MessageReveal";
import RSVPButton from "./RSVPButton";
import QuestionScreen from "./QuestionScreen";
import CelebrationOverlay from "./CelebrationOverlay";
import VideoPlayer from "./VideoPlayer";
import RevealChrome from "./RevealChrome";
import { playSound } from "@/lib/sounds";
import { easings, durations, springs, makeReducedMotionTransition } from "@/lib/motion";

interface TapToRevealProps {
  theme: Theme;
  photos: { url: string; caption?: string; rotation_deg?: number }[];
  title: string;
  message: string;
  questions?: { id: string; question_text: string; yes_label: string; no_label: string; require_answer: boolean }[];
  inviteId?: string;
  enableDodge?: boolean;
  videoUrl?: string | null;
  /** Mirrors `from-invite.ts`: `is_paid ? "paid" : "free"`. Gates the watermark. */
  tier?: "free" | "paid";
  /**
   * Message-only contributions from collaborative invites (Task B2).
   * Rendered after the polaroid stack as signed letters. Photo-bearing
   * contributions are merged into `photos` by the server and surface
   * inside the carousel itself.
   */
  contributorNotes?: { contributor_name: string; message: string }[];
}

type Stage = "landing" | "video" | "photos" | "questions" | "celebrate" | "message" | "cta";

/**
 * Tap reveal — mockup `bTap` (L1375) and `.tap` / `.giftimg` / `.tt` / `.rn`
 * (L491-499). Full-bleed ink ground, a breathing 4:5 theme card, a serif
 * "Tap to reveal", and an uppercase sand kicker. No emoji: the editorial
 * identity bans emoji-as-content, so the mockup's photographic card stands in
 * for the old gift glyph and the ambient emoji field is gone.
 */
export default function TapToReveal({ theme, photos, title, message, questions = [], inviteId = "", enableDodge = true, videoUrl, tier = "free", contributorNotes = [] }: TapToRevealProps) {
  const [stage, setStage] = useState<Stage>("landing");
  const shouldReduce = useReducedMotion();

  /** Skip scenes with nothing in them: a photo grid with no photos reads as
   *  broken, and the mockup simply omits `.s-photos` when there are none. */
  function nextAfterOpen(): Stage {
    if (videoUrl) return "video";
    if (photos.length > 0) return "photos";
    return questions.length > 0 ? "questions" : "message";
  }

  function handleTap() {
    playSound("reveal");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(50);
    }
    setStage(nextAfterOpen());
  }

  function handleSettleVibrate() {
    if (!shouldReduce && typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(20);
    }
  }

  // Reduced-motion: opacity-only instant swap for all stage wrappers
  const rmInstant = { duration: durations.instant };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Mockup `chrome()` — the RSVP scene carries its own closing rail. */}
      <RevealChrome tier={tier} showWatermark={stage !== "cta"} />
      <AnimatePresence mode="wait">
        {stage === "landing" && (
          <motion.div
            key="landing"
            // Mockup `.rr` + `.tap`: ink ground, centred column, 40px/28px pad.
            className="absolute inset-0 flex flex-col items-center justify-center bg-ink px-7 py-10 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            // Unwrap exit: lid lifts up and away, revealing what's beneath
            exit={shouldReduce
              ? { opacity: 0, transition: rmInstant }
              : { opacity: 0, scale: 1.08, y: -16, transition: { ease: easings.exit, duration: durations.base } }
            }
            transition={makeReducedMotionTransition(shouldReduce, { ease: easings.entrance, duration: durations.base })}
          >
            {/* Mockup `.giftimg` — 4:5 theme card, `brth` 3s breathing loop. */}
            <motion.button
              type="button"
              onClick={handleTap}
              aria-label="Tap to reveal"
              className="block w-[min(280px,72vw)] cursor-pointer overflow-hidden rounded-[var(--r-md)] shadow-[var(--sh-float)] focus-visible:outline-2 focus-visible:outline-coral focus-visible:outline-offset-4"
              style={{ aspectRatio: "4 / 5", background: theme.colors.background }}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={shouldReduce
                ? { opacity: 1, scale: 1 }
                : { opacity: 1, scale: [1, 1.03, 1] }
              }
              transition={shouldReduce
                ? rmInstant
                : {
                    scale: { duration: durations.ambient, repeat: Infinity, ease: "easeInOut" },
                    opacity: { duration: durations.base },
                  }
              }
              whileTap={{ scale: shouldReduce ? 1 : 0.97 }}
            />

            {/* Mockup `.tt` */}
            <motion.p
              className="mt-[26px] font-heading text-2xl text-white"
              initial={{ opacity: 0, y: shouldReduce ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={makeReducedMotionTransition(shouldReduce, {
                ease: easings.entrance,
                duration: durations.base,
                delay: durations.quick,
              })}
            >
              Tap to reveal
            </motion.p>

            {/* Mockup `.rn` */}
            <motion.p
              className="mt-2 text-[13px] uppercase tracking-[0.16em] text-sand"
              initial={{ opacity: 0, y: shouldReduce ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={makeReducedMotionTransition(shouldReduce, {
                ease: easings.entrance,
                duration: durations.base,
                delay: durations.base,
              })}
            >
              For {title}
            </motion.p>
          </motion.div>
        )}

        {stage === "video" && videoUrl && (
          <motion.div
            key="video"
            className="absolute inset-0"
            // Weighted arrival — the gift content settles in with gravity
            initial={shouldReduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 20 }}
            animate={shouldReduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduce
              ? { opacity: 0, transition: rmInstant }
              : { opacity: 0, x: -20, transition: { ease: easings.exit, duration: durations.quick } }
            }
            transition={shouldReduce ? rmInstant : springs.weighty}
            onAnimationComplete={handleSettleVibrate}
          >
            <VideoPlayer
              videoUrl={videoUrl}
              onComplete={() => setStage(questions.length > 0 ? "questions" : "message")}
            />
          </motion.div>
        )}

        {stage === "photos" && (
          <motion.div
            key="photos"
            className="absolute inset-0 overflow-y-auto"
            // Weighted arrival — first reveal, feels hand-placed
            initial={shouldReduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 20 }}
            animate={shouldReduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduce
              ? { opacity: 0, transition: rmInstant }
              : { opacity: 0, x: -20, transition: { ease: easings.exit, duration: durations.quick } }
            }
            transition={shouldReduce ? rmInstant : springs.weighty}
            onAnimationComplete={handleSettleVibrate}
          >
            <PolaroidCarousel
              photos={photos}
              theme={theme}
              title={title}
              notes={contributorNotes}
              onComplete={() => setStage(questions.length > 0 ? "questions" : "message")}
            />
          </motion.div>
        )}

        {stage === "questions" && questions.length > 0 && (
          <motion.div
            key="questions"
            className="absolute inset-0"
            // Directional slide: forward navigation from right
            initial={shouldReduce ? { opacity: 0 } : { opacity: 0, x: 20 }}
            animate={shouldReduce ? { opacity: 1 } : { opacity: 1, x: 0 }}
            exit={shouldReduce
              ? { opacity: 0, transition: rmInstant }
              : { opacity: 0, x: -20, transition: { ease: easings.exit, duration: durations.quick } }
            }
            transition={shouldReduce ? rmInstant : { ease: easings.entrance, duration: durations.base }}
          >
            <QuestionScreen
              questions={questions}
              theme={theme}
              enableDodge={enableDodge}
              onComplete={() => setStage("celebrate")}
              inviteId={inviteId}
              photos={photos}
            />
          </motion.div>
        )}

        {stage === "celebrate" && (
          <motion.div
            key="celebrate"
            className="absolute inset-0"
            // Scale pop: celebration bursts in from slightly above scale
            initial={shouldReduce ? { opacity: 0 } : { opacity: 0, scale: 1.04 }}
            animate={shouldReduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={shouldReduce
              ? { opacity: 0, transition: rmInstant }
              : { opacity: 0, y: -12, transition: { ease: easings.exit, duration: durations.quick } }
            }
            transition={shouldReduce ? rmInstant : springs.soft}
          >
            <CelebrationOverlay onComplete={() => setStage("message")} duration={2200} />
          </motion.div>
        )}

        {stage === "message" && (
          <motion.div
            key="message"
            className="absolute inset-0"
            // Emotional weight: rises from below and settles with gravity
            initial={shouldReduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={shouldReduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={shouldReduce
              ? { opacity: 0, transition: rmInstant }
              : { opacity: 0, y: -12, transition: { ease: easings.exit, duration: durations.quick } }
            }
            transition={shouldReduce ? rmInstant : springs.weighty}
          >
            <MessageReveal
              title={title}
              message={message}
              theme={theme}
              onComplete={() => setStage("cta")}
              photos={photos}
            />
          </motion.div>
        )}

        {stage === "cta" && (
          <motion.div
            key="cta"
            className="absolute inset-0"
            // Soft spring arrival — the final action beat
            initial={shouldReduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={shouldReduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={shouldReduce ? rmInstant : springs.soft}
          >
            <RSVPButton theme={theme} title={title} photos={photos} inviteId={inviteId} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
