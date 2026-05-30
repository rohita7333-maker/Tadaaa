"use client";

import { motion } from "framer-motion";
import { useReducedMotion } from "framer-motion";
import { type Theme } from "@/lib/themes";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import FloatingPhotos from "./FloatingPhotos";
import { easings, durations, springs, staggers, makeReducedMotionTransition } from "@/lib/motion";

interface MessageRevealProps {
  title: string;
  message: string;
  theme: Theme;
  onComplete: () => void;
  photos?: { url: string; caption?: string; rotation_deg?: number }[];
}

export default function MessageReveal({
  title,
  message,
  theme,
  onComplete,
  photos = [],
}: MessageRevealProps) {
  const shouldReduce = useReducedMotion();
  const titleWords = title.split(" ");
  // Split by explicit line breaks; fallback = single block
  const bodyLines = message.split("\n").filter(Boolean);
  const safeBodyLines = bodyLines.length > 0 ? bodyLines : [message];

  // Title completes at: titleWords.length * 0.04 + one word's duration
  const titleEndDelay = titleWords.length * 0.04 + durations.quick;
  // Body lines start after title settles
  const bodyStartDelay = titleEndDelay + staggers.support;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-8 py-16 relative overflow-hidden"
      style={{ background: theme.colors.background }}
    >
      <FloatingPhotos photos={photos} screenIndex={100} />

      <div className="relative max-w-xs text-center" style={{ zIndex: 20 }}>
        {/* Title — word-by-word blur reveal, rhymes with PolaroidCarousel captions */}
        <motion.h2
          className="font-heading text-2xl mb-8"
          style={{ color: theme.colors.text }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
        >
          {titleWords.map((word, i) => (
            <motion.span
              key={i}
              initial={shouldReduce
                ? { opacity: 1 }
                : { filter: "blur(8px)", opacity: 0, y: 4 }
              }
              animate={shouldReduce
                ? { opacity: 1 }
                : { filter: "blur(0px)", opacity: 1, y: 0 }
              }
              transition={shouldReduce
                ? { duration: durations.instant }
                : {
                    duration: durations.quick,
                    ease: easings.entrance,
                    delay: staggers.lead + i * 0.04,
                  }
              }
              style={{ display: "inline-block", marginRight: "0.25em" }}
            >
              {word}
            </motion.span>
          ))}
        </motion.h2>

        {/* Body — line-by-line with hierarchy stagger (not a uniform word drip) */}
        <div
          className="font-heading text-xl leading-relaxed mb-12"
          style={{ color: theme.colors.text }}
        >
          {safeBodyLines.map((line, i) => (
            <motion.p
              key={i}
              initial={shouldReduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={shouldReduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
              transition={makeReducedMotionTransition(shouldReduce, {
                ease: easings.entrance,
                duration: durations.base,
                delay: bodyStartDelay + i * staggers.detail,
              })}
              style={{ marginBottom: i < safeBodyLines.length - 1 ? "0.5em" : 0 }}
            >
              {line}
            </motion.p>
          ))}
        </div>

        {/* CTA — arrives after all body lines settle */}
        <motion.div
          initial={shouldReduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={shouldReduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={shouldReduce
            ? { duration: durations.instant }
            : {
                ...springs.soft,
                delay: bodyStartDelay + safeBodyLines.length * staggers.detail + staggers.support,
              }
          }
        >
          <Button
            onClick={onComplete}
            className="h-12 px-8 rounded-full text-white font-medium transition-all duration-300 hover:scale-105 shadow-lg"
            style={{ background: theme.colors.accent }}
          >
            Continue
            <ArrowDown className="ml-2 w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
