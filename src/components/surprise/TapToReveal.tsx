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
  /**
   * Message-only contributions from collaborative invites (Task B2).
   * Rendered after the polaroid stack as signed letters. Photo-bearing
   * contributions are merged into `photos` by the server and surface
   * inside the carousel itself.
   */
  contributorNotes?: { contributor_name: string; message: string }[];
}

type Stage = "landing" | "video" | "photos" | "questions" | "celebrate" | "message" | "cta";

function FloatingParticles({
  type,
  shouldReduce,
}: {
  type: Theme["particleType"];
  shouldReduce: boolean | null | undefined;
}) {
  const particles = Array.from({ length: 12 });
  const icons: Record<Theme["particleType"], string> = {
    hearts: "❤️",
    sparkles: "✨",
    confetti: "🎊",
    petals: "🌸",
    stars: "⭐",
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {particles.map((_, i) => (
        <motion.span
          key={i}
          className="absolute text-lg select-none"
          style={{
            left: `${5 + (i * 8) % 90}%`,
            top: `${10 + (i * 13) % 80}%`,
          }}
          // Reduced-motion: particles visible but fully static (no vestibular stimulus)
          animate={shouldReduce ? {} : {
            y: [-10, 10, -10],
            x: [-5, 5, -5],
            rotate: [0, 20, -20, 0],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={shouldReduce ? {} : {
            duration: durations.ambient + (i % 3) * durations.quick,
            repeat: Infinity,
            delay: i * durations.quick,
            ease: "easeInOut",
          }}
        >
          {icons[type]}
        </motion.span>
      ))}
    </div>
  );
}

export default function TapToReveal({ theme, photos, title, message, questions = [], inviteId = "", enableDodge = true, videoUrl, contributorNotes = [] }: TapToRevealProps) {
  const [stage, setStage] = useState<Stage>("landing");
  const shouldReduce = useReducedMotion();

  const revealEmoji =
    theme.revealIcon === "envelope"
      ? "✉️"
      : theme.revealIcon === "gift"
      ? "🎁"
      : theme.revealIcon === "heart"
      ? "❤️"
      : theme.revealIcon === "star"
      ? "⭐"
      : "🎈";

  function handleTap() {
    playSound("reveal");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(50);
    }
    setStage(videoUrl ? "video" : "photos");
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
      <AnimatePresence mode="wait">
        {stage === "landing" && (
          <motion.div
            key="landing"
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ background: theme.colors.background }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            // Unwrap exit: lid lifts up and away, revealing what's beneath
            exit={shouldReduce
              ? { opacity: 0, transition: rmInstant }
              : { opacity: 0, scale: 1.08, y: -16, transition: { ease: easings.exit, duration: durations.base } }
            }
            transition={makeReducedMotionTransition(shouldReduce, { ease: easings.entrance, duration: durations.base })}
          >
            <FloatingParticles type={theme.particleType} shouldReduce={shouldReduce} />

            <div className="relative z-10 text-center px-8">
              <motion.p
                className="text-sm font-medium mb-8 opacity-70"
                style={{ color: theme.colors.text }}
                initial={{ opacity: 0, y: shouldReduce ? 0 : 20 }}
                animate={{ opacity: 0.7, y: 0 }}
                transition={makeReducedMotionTransition(shouldReduce, {
                  ease: easings.entrance,
                  duration: durations.base,
                  delay: durations.quick,
                })}
              >
                Someone made this for you ✨
              </motion.p>

              <motion.button
                onClick={handleTap}
                className="text-8xl mb-8 block select-none cursor-pointer"
                // Entrance: pops in from nothing
                initial={{ scale: 0, rotate: -10, opacity: 0 }}
                // Ambient loop — skip entirely when reduced (settle at resting state)
                animate={shouldReduce
                  ? { scale: 1, rotate: 0, opacity: 1 }
                  : { scale: [1, 1.08, 1], rotate: [0, -3, 3, 0], opacity: 1 }
                }
                transition={shouldReduce
                  ? rmInstant
                  : {
                      scale: { duration: durations.ambient, repeat: Infinity },
                      rotate: { duration: durations.ambient * 1.2, repeat: Infinity },
                      opacity: { duration: durations.base, delay: durations.base },
                      delay: durations.base,
                    }
                }
                // Weighted tap: resistance feel before the gift opens
                whileTap={{ scale: shouldReduce ? 0.96 : 0.88, rotate: shouldReduce ? 0 : -5 }}
              >
                {revealEmoji}
              </motion.button>

              <motion.h1
                className="font-heading text-3xl mb-3"
                style={{ color: theme.colors.text }}
                initial={{ opacity: 0, y: shouldReduce ? 0 : 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={makeReducedMotionTransition(shouldReduce, {
                  ease: easings.entrance,
                  duration: durations.base,
                  delay: durations.slow,
                })}
              >
                {title}
              </motion.h1>

              <motion.button
                onClick={handleTap}
                className="mt-6 text-white text-sm font-medium px-8 py-3 rounded-full pulse-glow"
                style={{ background: theme.colors.accent }}
                initial={{ opacity: 0, y: shouldReduce ? 0 : 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={makeReducedMotionTransition(shouldReduce, {
                  ease: easings.entrance,
                  duration: durations.base,
                  delay: durations.slow + durations.quick,
                })}
                whileTap={{ scale: shouldReduce ? 0.96 : 0.95 }}
              >
                Tap to Open
              </motion.button>
            </div>
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
