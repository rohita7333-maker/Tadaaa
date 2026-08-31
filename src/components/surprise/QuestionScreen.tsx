"use client";

import { useCallback, useRef, useState } from "react";
import { normalizeDodgeLimit, isDodgeFrozen, dodgeHint, shouldDodgeOnActivation } from "@/lib/dodge";
import { motion, AnimatePresence } from "framer-motion";
import { type Theme } from "@/lib/themes";
import FloatingPhotos from "./FloatingPhotos";
import { playSound } from "@/lib/sounds";
import { toast } from "sonner";

type AnswerResult =
  | { ok: true }
  | { ok: false; status: number | null }; // null = network error (fetch threw)

async function postAnswerWithRetry(
  body: { questionId: string; answer: boolean; inviteId: string },
  attempts = 3
): Promise<AnswerResult> {
  let lastStatus: number | null = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch("/api/invite/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) return { ok: true };
      lastStatus = res.status;
      // 4xx (except 429) — won't get better with retry.
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        return { ok: false, status: res.status };
      }
    } catch {
      // network error — retry; keep lastStatus null to signal no HTTP response
      lastStatus = null;
    }
    await new Promise((r) => setTimeout(r, 400 * (i + 1)));
  }
  return { ok: false, status: lastStatus };
}

function getAnswerErrorMessage(status: number | null): string {
  if (status === null) return "No connection — we'll keep trying in the background 📡";
  if (status === 410 || status === 422) return "This invite has closed — answers are no longer being accepted";
  if (status === 429) return "Slow down a little — try again in a moment";
  return "Hmm, something went wrong saving your answer. Tap again? 💕";
}

interface Question {
  id: string;
  question_text: string;
  yes_label?: string;
  no_label?: string;
  require_answer: boolean;
}

interface QuestionScreenProps {
  questions: Question[];
  theme: Theme;
  /** How many times No runs away. 0 = never, -1 = forever. */
  dodgeLimit?: number;
  onComplete: () => void;
  inviteId: string;
  photos?: { url: string; caption?: string; rotation_deg?: number }[];
}

export default function QuestionScreen({
  questions,
  theme,
  dodgeLimit: rawDodgeLimit,
  onComplete,
  inviteId,
  photos = [],
}: QuestionScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [tappedButton, setTappedButton] = useState<"yes" | "no" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [noPos, setNoPos] = useState({ x: 0, y: 0 });
  const [dodgeCount, setDodgeCount] = useState(0);
  const noBtnRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const dodgeLimit = normalizeDodgeLimit(rawDodgeLimit);
  const current = questions[currentIndex];

  const dodge = useCallback(() => {
    if (isDodgeFrozen(dodgeLimit, dodgeCount)) return;

    const container = containerRef.current;
    const btn = noBtnRef.current;
    if (!container || !btn) return;

    const cRect = container.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();

    let newX = 0;
    let newY = 0;
    let attempts = 0;
    do {
      newX = (Math.random() - 0.5) * (cRect.width - bRect.width - 40);
      newY = (Math.random() - 0.5) * (cRect.height * 0.4);
      attempts++;
    } while (Math.abs(newX - noPos.x) < 80 && attempts < 10);

    setNoPos({ x: newX, y: newY });
    setDodgeCount((c) => c + 1);

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(20);
    }
  }, [dodgeCount, dodgeLimit, noPos]);

  if (!current) {
    onComplete();
    return null;
  }

  const yesLabel = current.yes_label || "Yes";
  const noLabel = current.no_label || "No";
  const noFrozen = isDodgeFrozen(dodgeLimit, dodgeCount);
  const noDodging = !noFrozen && dodgeCount > 0;
  const hint = dodgeHint(dodgeLimit, dodgeCount, noLabel);

  async function submitAnswer(answer: boolean) {
    if (submitting) return;

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(answer ? [30, 20, 60] : 10);
    }

    playSound("pop");
    setTappedButton(answer ? "yes" : "no");
    setSubmitting(true);

    const result = await postAnswerWithRetry({ questionId: current.id, answer, inviteId });

    if (!result.ok) {
      const msg = getAnswerErrorMessage(result.status);
      if (current.require_answer) {
        toast.error(msg);
        setTappedButton(null);
        setSubmitting(false);
        return;
      }
      // Optional question: surface the issue but keep the flow moving.
      toast.warning("Answer didn't save — moving on");
    }

    await new Promise((r) => setTimeout(r, 350));
    advance();
  }

  function advance() {
    setDirection(1);
    setTappedButton(null);
    setSubmitting(false);
    setNoPos({ x: 0, y: 0 });
    setDodgeCount(0);

    if (currentIndex + 1 >= questions.length) {
      onComplete();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 flex flex-col items-center justify-center px-6 overflow-hidden"
      style={{ background: theme.colors.background }}
    >
      <FloatingPhotos photos={photos} screenIndex={currentIndex} />

      {/* Progress dots */}
      {questions.length > 1 && (
        <div className="absolute top-10 left-0 right-0 flex justify-center gap-2" style={{ zIndex: 20 }}>
          {questions.map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full transition-all duration-300"
              style={{
                backgroundColor:
                  i === currentIndex
                    ? theme.colors.accent
                    : i < currentIndex
                    ? `${theme.colors.accent}60`
                    : `${theme.colors.accent}25`,
              }}
            />
          ))}
        </div>
      )}

      <div className="w-full max-w-sm relative" style={{ zIndex: 20 }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="text-center"
          >
            {/* Decorative line */}
            <div
              className="w-10 h-1 rounded-full mx-auto mb-6"
              style={{ background: theme.colors.accent }}
            />

            {questions.length > 1 && (
              <p
                className="text-xs font-medium mb-4 opacity-60 uppercase tracking-wider"
                style={{ color: theme.colors.text }}
              >
                Question {currentIndex + 1} of {questions.length}
              </p>
            )}

            <h2
              className="font-heading text-2xl leading-snug mb-10"
              style={{ color: theme.colors.text }}
            >
              {current.question_text}
            </h2>

            {/* Buttons */}
            <div className="relative flex justify-center gap-4 h-16 items-center">
              {/* NO button — dodge-capable */}
              <motion.button
                ref={noBtnRef}
                // detail === 0 means the click came from Enter/Space, not a
                // pointer. Keyboard users always get to answer No.
                onClick={(e) => {
                  const source = e.detail === 0 ? "keyboard" : "pointer";
                  if (shouldDodgeOnActivation(dodgeLimit, dodgeCount, source)) {
                    dodge();
                    return;
                  }
                  submitAnswer(false);
                }}
                onMouseEnter={() => { if (!noFrozen) dodge(); }}
                onTouchStart={(e) => {
                  if (!noFrozen) { e.preventDefault(); dodge(); }
                }}
                disabled={submitting}
                animate={{
                  x: noPos.x,
                  y: noPos.y,
                  scale: tappedButton === "no" ? [1, 0.9, 1.05, 1] : 1,
                }}
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 20 },
                  y: { type: "spring", stiffness: 300, damping: 20 },
                  scale: { duration: 0.3 },
                }}
                className={`dodge-btn absolute left-0 rounded-full min-h-14 min-w-[110px] px-6 text-white font-bold text-base shadow-lg transition-opacity disabled:opacity-70 ${
                  noDodging ? "cursor-none" : "cursor-pointer"
                }`}
                style={{
                  background: "linear-gradient(135deg, #B3261E 0%, #8A1D17 100%)",
                }}
                whileTap={noFrozen ? { scale: 0.92 } : {}}
              >
                {noLabel}
              </motion.button>

              {/* YES button — always static */}
              <motion.button
                onClick={() => submitAnswer(true)}
                disabled={submitting}
                animate={tappedButton === "yes" ? { scale: [1, 0.9, 1.05, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
                className="absolute right-0 rounded-full min-h-14 min-w-[110px] px-6 text-white font-bold text-base shadow-lg pulse-glow transition-opacity disabled:opacity-70"
                style={{
                  background: "linear-gradient(135deg, #5aaa69 0%, #3d8a4a 100%)",
                }}
                whileTap={{ scale: 0.92 }}
              >
                {yesLabel}
              </motion.button>
            </div>

            {/* Dodge hint — one line, driven by the shared dodge rules. */}
            {hint && (
              <motion.p
                key={hint}
                className="mt-8 text-xs opacity-50"
                style={{ color: theme.colors.text }}
                animate={dodgeCount === 0 ? { opacity: [0.3, 0.6, 0.3] } : { opacity: 0.5 }}
                transition={dodgeCount === 0 ? { duration: 2, repeat: Infinity } : { duration: 0.2 }}
              >
                {hint}
              </motion.p>
            )}

            {/* Skip */}
            {!current.require_answer && (
              <motion.button
                onClick={advance}
                disabled={submitting}
                className="mt-6 text-xs underline underline-offset-2 opacity-40 hover:opacity-60 transition-opacity"
                style={{ color: theme.colors.text }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                transition={{ delay: 0.5 }}
              >
                Skip
              </motion.button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
