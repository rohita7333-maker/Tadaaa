"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Sparkles } from "lucide-react";
import { ShimmerText } from "@/components/ui/shimmer-text";

/**
 * 3-second intro animation — plays once per session.
 * Simulates a surprise being "crafted": polaroid slides in,
 * caption writes itself, sparkle traces, then fades to reveal hero.
 */
export default function CraftingIntro({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"craft" | "done">("craft");

  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase("done");
      setTimeout(onComplete, 500); // fade-out duration
    }, 2600);
    return () => clearTimeout(timer);
  }, [onComplete]);

  // Respect reduced motion — lazy init reads matchMedia on mount.
  const [reducedMotion] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (reducedMotion) onComplete();
  }, [reducedMotion, onComplete]);

  if (reducedMotion) return null;

  return (
    <AnimatePresence>
      {phase === "craft" && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: "#FAF9F6" }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Subtle radial glow */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 45%, rgba(62, 107, 92,0.08) 0%, transparent 60%)",
            }}
          />

          <div className="relative flex flex-col items-center">
            {/* Polaroid frame slides up */}
            <motion.div
              className="relative bg-white p-3 pb-12 shadow-2xl"
              style={{ borderRadius: "4px", width: 180 }}
              initial={{ opacity: 0, y: 60, rotate: -8 }}
              animate={{ opacity: 1, y: 0, rotate: -3 }}
              transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            >
              {/* Photo area */}
              <div
                className="w-full aspect-square rounded-sm flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #FFF0E8 0%, #F5E6E0 100%)" }}
              >
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.4, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  <Heart className="w-14 h-14 fill-[#3E6B5C] text-[#3E6B5C]" />
                </motion.div>
              </div>

              {/* Caption writes in */}
              <motion.p
                className="text-center mt-2 text-[#4a4a4a]"
                style={{ fontFamily: "var(--font-caveat), cursive", fontSize: "14px" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.4 }}
              >
                For someone special...
              </motion.p>

              {/* Sparkle trace top-right */}
              <motion.div
                className="absolute -top-3 -right-3"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2, duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <Sparkles className="w-6 h-6 text-[#8A6F35]" />
              </motion.div>

              {/* Sparkle trace bottom-left */}
              <motion.div
                className="absolute -bottom-2 -left-2"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 0.7] }}
                transition={{ delay: 1.5, duration: 0.4 }}
              >
                <Sparkles className="w-4 h-4 text-[#A8C3B4]" />
              </motion.div>
            </motion.div>

            {/* "Crafting your experience..." text */}
            <motion.p
              className="mt-6 text-sm text-[#6F6E68] tracking-wide"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.4 }}
            >
              Crafting something <ShimmerText>special</ShimmerText>...
            </motion.p>

            {/* Dot loading indicator */}
            <div className="flex gap-1.5 mt-3">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-[#3E6B5C]"
                  initial={{ opacity: 0.3 }}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{
                    delay: 1.2 + i * 0.15,
                    duration: 0.8,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>

            {/* Skip button */}
            <motion.button
              className="mt-6 text-xs text-[#6F6E68]/50 hover:text-[#6F6E68] transition-colors"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              onClick={() => { setPhase("done"); onComplete(); }}
            >
              Skip
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
