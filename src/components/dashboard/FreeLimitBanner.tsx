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
      className="relative mb-6 overflow-hidden rounded-2xl border border-[#3E6B5C]/30 bg-gradient-to-r from-[#FFF0E8] via-[#FAF9F6] to-[#FCEFE3] px-5 py-4"
    >
      {/* Breathing glow ring — gentle attention pull */}
      {!shouldReduce && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl"
          animate={{
            boxShadow: [
              "0 0 0 0 rgba(62,107,92,0.0)",
              "0 0 0 3px rgba(62,107,92,0.18)",
              "0 0 0 0 rgba(62,107,92,0.0)",
            ],
          }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <div className="relative flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-[#3E6B5C]/12 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#3E6B5C]" />
          </div>
          <div>
            <p className="font-heading text-base text-[#1A1B18] leading-snug">
              You&apos;ve used all {limit} free surprises this month 🎉
            </p>
            <p className="text-sm text-[#6F6E68] mt-0.5">
              Upgrade to keep the joy flowing — create unlimited surprises that
              never expire.
            </p>
          </div>
        </div>

        <Link
          href="/pricing"
          className="group inline-flex items-center justify-center h-10 px-5 shrink-0 rounded-full bg-gradient-to-r from-[#3E6B5C] to-[#2E5145] hover:from-[#2E5145] hover:to-[#3E6B5C] text-white text-sm font-semibold shadow-md shadow-[#3E6B5C]/25 transition-all duration-300 hover:scale-[1.03]"
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
