"use client";

import { useState, useEffect, useMemo } from "react";
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

interface CountdownRevealProps {
  theme: Theme;
  photos: { url: string; caption?: string; rotation_deg?: number }[];
  title: string;
  message: string;
  countdownDate: string;
  questions?: { id: string; question_text: string; yes_label: string; no_label: string; require_answer: boolean }[];
  inviteId?: string;
  dodgeLimit?: number;
  videoUrl?: string | null;
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
  dodgeLimit,
  videoUrl,
  contributorNotes = [],
}: CountdownRevealProps) {
  // Memoize the parsed Date so the effect dep is stable across ticks.
  // Without this, `target` is a new object every render → effect re-runs every
  // setTimeLeft call → interval re-created → visual flicker + dropped ticks.
  const target = useMemo(() => new Date(countdownDate), [countdownDate]);
  const alreadyPassed = target <= new Date();

  const [stage, setStage] = useState<Stage>(alreadyPassed ? (videoUrl ? "video" : "photos") : "countdown");
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(getTimeLeft(target));

  useEffect(() => {
    if (stage !== "countdown") return;
    const interval = setInterval(() => {
      const tl = getTimeLeft(target);
      setTimeLeft(tl);
      if (tl.days === 0 && tl.hours === 0 && tl.minutes === 0 && tl.seconds === 0) {
        clearInterval(interval);
        setTimeout(() => setStage(videoUrl ? "video" : "photos"), 1500);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [stage, target, videoUrl]);

  const shouldReduce = useReducedMotion();

  const units = [
    { label: "days", value: timeLeft.days },
    { label: "hours", value: timeLeft.hours },
    { label: "min", value: timeLeft.minutes },
    { label: "sec", value: timeLeft.seconds },
  ];

  if (stage === "video" && videoUrl) {
    return (
      <VideoPlayer
        videoUrl={videoUrl}
        onComplete={() => setStage(questions.length > 0 ? "questions" : "message")}
      />
    );
  }
  if (stage === "photos") {
    return (
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
    return (
      <QuestionScreen
        questions={questions}
        theme={theme}
        dodgeLimit={dodgeLimit}
        onComplete={() => setStage("celebrate")}
        inviteId={inviteId}
        photos={photos}
      />
    );
  }
  if (stage === "celebrate") {
    return <CelebrationOverlay onComplete={() => setStage("message")} duration={2200} />;
  }
  if (stage === "message") {
    return (
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
    return <RSVPButton theme={theme} title={title} photos={photos} inviteId={inviteId} />;
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden"
      style={{ background: theme.colors.background }}
    >
      {/* Floating particles — hidden when reduced-motion is preferred */}
      {!shouldReduce && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full opacity-30"
              style={{
                backgroundColor: theme.colors.accent,
                left: `${10 + i * 11}%`,
                top: `${15 + (i % 4) * 20}%`,
              }}
              animate={{ y: [-10, 10, -10], scale: [1, 1.3, 1] }}
              transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.4 }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 text-center">
        <motion.p
          className="text-sm font-medium mb-4 opacity-60"
          style={{ color: theme.colors.text }}
          initial={{ opacity: 0, y: shouldReduce ? 0 : 20 }}
          animate={{ opacity: 0.6, y: 0 }}
          transition={getReducedMotionTransition(shouldReduce, { delay: 0.2 })}
        >
          Something special is coming…
        </motion.p>

        <motion.h1
          className="font-heading text-3xl mb-12"
          style={{ color: theme.colors.text }}
          initial={{ opacity: 0, y: shouldReduce ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={getReducedMotionTransition(shouldReduce, { delay: 0.4 })}
        >
          {title}
        </motion.h1>

        {/* Countdown tiles */}
        <div className="flex gap-3 justify-center mb-12">
          {units.map((unit, i) => (
            <motion.div
              key={unit.label}
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: shouldReduce ? 0 : 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={getReducedMotionTransition(shouldReduce, { delay: 0.5 + i * 0.1 })}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-1 shadow-[0_4px_16px_rgba(0,0,0,0.15)]"
                style={{ background: theme.colors.accent }}
              >
                <span className="text-white font-heading text-2xl font-bold leading-none">
                  {String(unit.value).padStart(2, "0")}
                </span>
              </div>
              <span
                className="text-xs uppercase tracking-wider opacity-60"
                style={{ color: theme.colors.text }}
              >
                {unit.label}
              </span>
            </motion.div>
          ))}
        </div>

        <motion.p
          className="text-sm opacity-50"
          style={{ color: theme.colors.text }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={getReducedMotionTransition(shouldReduce, { delay: 1 })}
        >
          Come back when the timer runs out ✨
        </motion.p>
      </div>
    </div>
  );
}
