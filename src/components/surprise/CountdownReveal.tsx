"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "framer-motion";
import { type Theme } from "@/lib/themes";
import { getReducedMotionTransition } from "@/lib/a11y";
import PolaroidCarousel from "./PolaroidCarousel";
import MessageReveal from "./MessageReveal";
import RSVPButton from "./RSVPButton";
import QuestionScreen from "./QuestionScreen";
import CelebrationOverlay from "./CelebrationOverlay";
import VideoPlayer from "./VideoPlayer";
import RevealChrome from "./RevealChrome";

interface CountdownRevealProps {
  theme: Theme;
  photos: { url: string; caption?: string; rotation_deg?: number }[];
  title: string;
  message: string;
  countdownDate: string;
  questions?: { id: string; question_text: string; yes_label: string; no_label: string; require_answer: boolean }[];
  inviteId?: string;
  enableDodge?: boolean;
  videoUrl?: string | null;
  /** Mirrors `from-invite.ts`: `is_paid ? "paid" : "free"`. Gates the watermark. */
  tier?: "free" | "paid";
  /** Message-only contributions (Task B2) — rendered after polaroid stack. */
  contributorNotes?: { contributor_name: string; message: string }[];
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(target: Date): TimeLeft {
  const diff = Math.max(0, target.getTime() - Date.now());
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

type Stage = "countdown" | "video" | "photos" | "questions" | "celebrate" | "message" | "cta";

export default function CountdownReveal({
  theme,
  photos,
  title,
  message,
  countdownDate,
  questions = [],
  inviteId = "",
  enableDodge = true,
  videoUrl,
  tier = "free",
  contributorNotes = [],
}: CountdownRevealProps) {
  /** Skip scenes with nothing in them: a photo grid with no photos reads as
   *  broken, and the mockup simply omits `.s-photos` when there are none. */
  const firstRevealStage = useCallback((): Stage => {
    if (videoUrl) return "video";
    if (photos.length > 0) return "photos";
    return questions.length > 0 ? "questions" : "message";
  }, [videoUrl, photos.length, questions.length]);

  // Memoize the parsed Date so the effect dep is stable across ticks.
  // Without this, `target` is a new object every render → effect re-runs every
  // setTimeLeft call → interval re-created → visual flicker + dropped ticks.
  const target = useMemo(() => new Date(countdownDate), [countdownDate]);
  const alreadyPassed = target <= new Date();

  const [stage, setStage] = useState<Stage>(alreadyPassed ? firstRevealStage() : "countdown");
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(getTimeLeft(target));

  useEffect(() => {
    if (stage !== "countdown") return;
    const interval = setInterval(() => {
      const tl = getTimeLeft(target);
      setTimeLeft(tl);
      if (tl.days === 0 && tl.hours === 0 && tl.minutes === 0 && tl.seconds === 0) {
        clearInterval(interval);
        setTimeout(() => setStage(firstRevealStage()), 1500);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [stage, target, firstRevealStage]);

  const shouldReduce = useReducedMotion();

  const pad = (n: number) => String(n).padStart(2, "0");
  const clock = `${pad(timeLeft.days)}:${pad(timeLeft.hours)}:${pad(timeLeft.minutes)}:${pad(
    timeLeft.seconds
  )}`;
  const spoken = `${timeLeft.days} days, ${timeLeft.hours} hours, ${timeLeft.minutes} minutes and ${timeLeft.seconds} seconds to go`;

  // Mockup `chrome()` rides above every stage. The RSVP scene carries its own
  // closing rail, so the watermark stands down there.
  function withChrome(node: React.ReactNode, showWatermark = true) {
    return (
      <>
        <RevealChrome tier={tier} showWatermark={showWatermark} />
        {node}
      </>
    );
  }

  if (stage === "video" && videoUrl) {
    return withChrome(
      <VideoPlayer
        videoUrl={videoUrl}
        onComplete={() => setStage(questions.length > 0 ? "questions" : "message")}
      />
    );
  }
  if (stage === "photos") {
    return withChrome(
      <PolaroidCarousel
        photos={photos}
        theme={theme}
        title={title}
        notes={contributorNotes}
        onComplete={() => setStage(questions.length > 0 ? "questions" : "message")}
      />
    );
  }
  if (stage === "questions" && questions.length > 0) {
    return withChrome(
      <QuestionScreen
        questions={questions}
        theme={theme}
        enableDodge={enableDodge}
        onComplete={() => setStage("celebrate")}
        inviteId={inviteId}
        photos={photos}
      />
    );
  }
  if (stage === "celebrate") {
    return withChrome(
      <CelebrationOverlay onComplete={() => setStage("message")} duration={2200} />
    );
  }
  if (stage === "message") {
    return withChrome(
      <MessageReveal
        title={title}
        message={message}
        theme={theme}
        onComplete={() => setStage("cta")}
        photos={photos}
      />
    );
  }
  if (stage === "cta") {
    return withChrome(
      <RSVPButton theme={theme} title={title} photos={photos} inviteId={inviteId} />,
      false
    );
  }

  // Mockup `.rr` + `.cdfull` (L501-505): ink ground, one sand serif clock,
  // an italic serif line, and the creator's message underneath.
  return withChrome(
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink px-7 py-10 text-center">
      <motion.p
        className="mb-5 text-[13px] uppercase tracking-[0.16em] text-sand"
        initial={{ opacity: 0, y: shouldReduce ? 0 : 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={getReducedMotionTransition(shouldReduce, { delay: 0.1 })}
      >
        For {title}
      </motion.p>

      {/* Mockup `.cdbig` — DD:HH:MM:SS, tabular, no unit chips. */}
      <motion.p
        className="font-heading text-[clamp(44px,14vw,64px)] leading-none tracking-[0.02em] text-sand tabular-nums"
        aria-hidden="true"
        initial={{ opacity: 0, y: shouldReduce ? 0 : 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={getReducedMotionTransition(shouldReduce, { delay: 0.2 })}
      >
        {clock}
      </motion.p>
      {/* The clock is decorative for AT; this is the readable equivalent and
          the only thing announced when it changes. */}
      <p className="sr-only" role="timer" aria-live="polite">
        {spoken}
      </p>

      {/* Mockup `.som` — mockup paints this `--stone` (2.1:1 on ink); sand
          ships instead so it clears AA. */}
      <motion.p
        className="mt-[22px] font-heading text-lg italic text-sand"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={getReducedMotionTransition(shouldReduce, { delay: 0.35 })}
      >
        Something&rsquo;s coming
      </motion.p>

      {/* Mockup `.hint2` */}
      {message && (
        <motion.p
          className="mt-2.5 max-w-[300px] text-sm leading-relaxed text-white/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={getReducedMotionTransition(shouldReduce, { delay: 0.5 })}
        >
          {message}
        </motion.p>
      )}
    </div>
  );
}
