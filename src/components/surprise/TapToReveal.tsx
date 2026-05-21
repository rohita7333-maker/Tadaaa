"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type Theme } from "@/lib/themes";
import PolaroidScroll from "./PolaroidScroll";
import MessageReveal from "./MessageReveal";
import RSVPButton from "./RSVPButton";
import QuestionScreen from "./QuestionScreen";
import CelebrationOverlay from "./CelebrationOverlay";
import VideoPlayer from "./VideoPlayer";
import { playSound } from "@/lib/sounds";

interface TapToRevealProps {
  theme: Theme;
  photos: { url: string; caption?: string; rotation_deg?: number }[];
  title: string;
  message: string;
  questions?: { id: string; question_text: string; yes_label: string; no_label: string; require_answer: boolean }[];
  inviteId?: string;
  enableDodge?: boolean;
  videoUrl?: string | null;
}

type Stage = "landing" | "video" | "photos" | "questions" | "celebrate" | "message" | "cta";

function FloatingParticles({
  type,
  color,
}: {
  type: Theme["particleType"];
  color: string;
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
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((_, i) => (
        <motion.span
          key={i}
          className="absolute text-lg select-none"
          style={{
            left: `${5 + (i * 8) % 90}%`,
            top: `${10 + (i * 13) % 80}%`,
          }}
          animate={{
            y: [-10, 10, -10],
            x: [-5, 5, -5],
            rotate: [0, 20, -20, 0],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 3 + (i % 3),
            repeat: Infinity,
            delay: i * 0.3,
            ease: "easeInOut",
          }}
        >
          {icons[type]}
        </motion.span>
      ))}
    </div>
  );
}

export default function TapToReveal({ theme, photos, title, message, questions = [], inviteId = "", enableDodge = true, videoUrl }: TapToRevealProps) {
  const [stage, setStage] = useState<Stage>("landing");

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
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5 }}
          >
            <FloatingParticles type={theme.particleType} color={theme.colors.accent} />

            <div className="relative z-10 text-center px-8">
              <motion.p
                className="text-sm font-medium mb-8 opacity-70"
                style={{ color: theme.colors.text }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 0.7, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                Someone made this for you ✨
              </motion.p>

              <motion.button
                onClick={handleTap}
                className="text-8xl mb-8 block select-none cursor-pointer"
                initial={{ scale: 0, rotate: -10 }}
                animate={{
                  scale: [1, 1.08, 1],
                  rotate: [0, -3, 3, 0],
                }}
                transition={{
                  scale: { duration: 2, repeat: Infinity },
                  rotate: { duration: 3, repeat: Infinity },
                  delay: 0.4,
                }}
                whileTap={{ scale: 0.9 }}
              >
                {revealEmoji}
              </motion.button>

              <motion.h1
                className="font-heading text-3xl mb-3"
                style={{ color: theme.colors.text }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                {title}
              </motion.h1>

              <motion.button
                onClick={handleTap}
                className="mt-6 text-white text-sm font-medium px-8 py-3 rounded-full pulse-glow"
                style={{ background: theme.colors.accent }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                whileTap={{ scale: 0.95 }}
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <PolaroidScroll
              photos={photos}
              theme={theme}
              title={title}
              onComplete={() => setStage(questions.length > 0 ? "questions" : "message")}
            />
          </motion.div>
        )}

        {stage === "questions" && questions.length > 0 && (
          <motion.div
            key="questions"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <CelebrationOverlay onComplete={() => setStage("message")} duration={2200} />
          </motion.div>
        )}

        {stage === "message" && (
          <motion.div
            key="message"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <RSVPButton theme={theme} title={title} photos={photos} inviteId={inviteId} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
