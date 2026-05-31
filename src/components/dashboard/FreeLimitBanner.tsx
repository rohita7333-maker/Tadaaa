"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";

interface FreeLimitBannerProps {
  used: number;
  limit: number;
}

/**
 * Free-tier upsell banner shown at the top of the dashboard once the monthly
 * surprise limit is hit. Uses a soft breathing glow (not a harsh blink) to draw
 * the eye while staying inside TaDaaaa's warm register. Honours reduced-motion.
 */
export default function FreeLimitBanner({ used, limit }: FreeLimitBannerProps) {
  const shouldReduce = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative mb-6 overflow-hidden rounded-2xl border border-[#C4686D]/30 bg-gradient-to-r from-[#FFF0E8] via-[#FFF8F0] to-[#FCEFE3] px-5 py-4"
    >
      {/* Breathing glow ring — gentle attention pull */}
      {!shouldReduce && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl"
          animate={{
            boxShadow: [
              "0 0 0 0 rgba(196,104,109,0.0)",
              "0 0 0 3px rgba(196,104,109,0.18)",
              "0 0 0 0 rgba(196,104,109,0.0)",
            ],
          }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <div className="relative flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-[#C4686D]/12 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#C4686D]" />
          </div>
          <div>
            <p className="font-heading text-base text-[#2D2926] leading-snug">
              You&apos;ve used all {limit} free surprises this month 🎉
            </p>
            <p className="text-sm text-[#6B5E57] mt-0.5">
              Upgrade to keep the joy flowing — create unlimited surprises that
              never expire.
            </p>
          </div>
        </div>

        <Link
          href="/pricing"
          className="group inline-flex items-center justify-center h-10 px-5 shrink-0 rounded-full bg-gradient-to-r from-[#C4686D] to-[#9B3D42] hover:from-[#9B3D42] hover:to-[#C4686D] text-white text-sm font-semibold shadow-md shadow-[#C4686D]/25 transition-all duration-300 hover:scale-[1.03]"
        >
          Upgrade now
          <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <span className="sr-only">
        {used} of {limit} monthly free surprises used.
      </span>
    </motion.div>
  );
}
