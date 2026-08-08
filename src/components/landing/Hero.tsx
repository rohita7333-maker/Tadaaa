"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Sparkles, Star, Play } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { GridPattern } from "@/components/ui/grid-pattern";
import { ShimmerText } from "@/components/ui/shimmer-text";
import { OccasionCards } from "@/components/landing/OccasionCards";
import {
  easings,
  durations,
  staggers,
  springs,
  makeReducedMotionTransition,
} from "@/lib/motion";

// Timing ladder (seconds) — all derived from tokens
const T = {
  badge: 0,
  subtitle: staggers.support,          // 0.06
  headlineStart: 0.15,
  // headline: 6 words × staggers.word + durations.base = 0.15 + 0.20 + 0.35 = 0.70
  headlineEnd: 0.15 + 5 * staggers.word + durations.base,
  subcopyStart: 0.5,                    // overlaps headline tail intentionally
  ctaStart: 0.7,                        // after headline completes
  statsStart: 0.85,
} as const;

export default function Hero({ surpriseCount = 0 }: { surpriseCount?: number }) {
  const reducedMotion = useReducedMotion();

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden px-6 pt-20 pb-16">
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 25% 35%, rgba(196,104,109,0.1) 0%, transparent 55%), radial-gradient(ellipse at 75% 65%, rgba(201,169,110,0.08) 0%, transparent 55%), #FFF8F0",
        }}
      />
      <GridPattern variant="grid" cellSize={48} opacity={0.35} />

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — copy */}
          <div>
            {/* Eyebrow badge — scale pop, not fade-up (role: first trust signal) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={makeReducedMotionTransition(reducedMotion, {
                ...springs.soft,
                delay: T.badge,
              })}
            >
              <span className="inline-flex items-center gap-2 bg-white text-[#C4686D] text-xs font-semibold px-4 py-2 rounded-full mb-5 border border-[#E8A5A8]/40 shadow-sm uppercase tracking-widest">
                <Sparkles className="w-3 h-3 fill-current" />
                New: AI-drafted surprises
              </span>
            </motion.div>

            {/* Subtitle badge — opacity only (supporting, not competing) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={makeReducedMotionTransition(reducedMotion, {
                duration: durations.quick,
                ease: easings.entrance,
                delay: T.subtitle,
              })}
            >
              <span className="inline-flex items-center gap-2 bg-[#FFF8F0] text-[#6B5E57] text-[11px] font-medium px-3 py-1 rounded-full mb-6 border border-[#D4CBC3]/60">
                ✨ Surprise invite builder
              </span>
            </motion.div>

            {/* Headline — word-by-word blur reveal (hero beat — loudest) */}
            <h1 className="font-heading text-6xl md:text-7xl text-[#2D2926] leading-[1.05] mb-6">
              {reducedMotion ? (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: durations.instant }}
                >
                  Make them
                  <br />
                  feel the <ShimmerText>magic</ShimmerText>
                  <br />
                  <ShimmerText>forever</ShimmerText>
                </motion.span>
              ) : (
                <>
                  {(["Make", "them"] as const).map((word, i) => (
                    <motion.span
                      key={word}
                      initial={{ opacity: 0, filter: "blur(8px)", y: 6 }}
                      animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                      transition={{
                        duration: durations.base,
                        ease: easings.entrance,
                        delay: T.headlineStart + i * staggers.word,
                      }}
                      style={{ display: "inline-block", marginRight: "0.3em" }}
                    >
                      {word}
                    </motion.span>
                  ))}
                  <br />
                  {(["feel", "the"] as const).map((word, i) => (
                    <motion.span
                      key={word}
                      initial={{ opacity: 0, filter: "blur(8px)", y: 6 }}
                      animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                      transition={{
                        duration: durations.base,
                        ease: easings.entrance,
                        delay: T.headlineStart + (2 + i) * staggers.word,
                      }}
                      style={{ display: "inline-block", marginRight: "0.3em" }}
                    >
                      {word}
                    </motion.span>
                  ))}
                  {/* "magic" — ShimmerText as single word unit */}
                  <motion.span
                    initial={{ opacity: 0, filter: "blur(8px)", y: 6 }}
                    animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                    transition={{
                      duration: durations.base,
                      ease: easings.entrance,
                      delay: T.headlineStart + 4 * staggers.word,
                    }}
                    style={{ display: "inline-block" }}
                  >
                    <ShimmerText>magic</ShimmerText>
                  </motion.span>
                  <br />
                  {/* "forever" — ShimmerText as single word unit */}
                  <motion.span
                    initial={{ opacity: 0, filter: "blur(8px)", y: 6 }}
                    animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                    transition={{
                      duration: durations.base,
                      ease: easings.entrance,
                      delay: T.headlineStart + 5 * staggers.word,
                    }}
                    style={{ display: "inline-block" }}
                  >
                    <ShimmerText>forever</ShimmerText>
                  </motion.span>
                </>
              )}
            </h1>

            {/* Subcopy — quieter rise, starts while headline tail comes in */}
            <motion.p
              className="text-[#6B5E57] text-lg leading-relaxed mb-10 max-w-md"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={makeReducedMotionTransition(reducedMotion, {
                duration: durations.slow,
                ease: easings.entrance,
                delay: T.subcopyStart,
              })}
            >
              Build a beautiful surprise page with your photos, a heartfelt message, and a playful yes/no question. Share it — watch the magic happen.
            </motion.p>

            {/* CTA — spring pop (role: action, most clickable) */}
            <motion.div
              className="flex flex-col sm:flex-row gap-3 mb-12"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={makeReducedMotionTransition(reducedMotion, {
                ...springs.soft,
                delay: T.ctaStart,
              })}
            >
              <Link href="/auth/signup" className="inline-flex">
                <MagneticButton
                  className="h-14 px-8 rounded-2xl text-base"
                  type="button"
                >
                  Create a surprise — free
                  <ArrowRight className="ml-1 w-4 h-4" />
                </MagneticButton>
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center justify-center h-14 px-8 rounded-2xl border border-[#D4CBC3] text-[#2D2926] hover:bg-white hover:border-[#C4686D]/30 text-base transition-all duration-300 bg-white/70 font-medium"
              >
                <Play className="w-4 h-4 mr-2 text-[#C4686D]" />
                See how it works
              </Link>
            </motion.div>

            {/* Stats — horizontal slide L→R (reading direction, not another y:12 drip) */}
            <motion.div
              className="flex gap-6 pt-8 border-t border-[#D4CBC3]/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={makeReducedMotionTransition(reducedMotion, {
                duration: durations.quick,
                delay: T.statsStart,
              })}
            >
              {[
                {
                  value: surpriseCount,
                  label: "Surprises created",
                  content: surpriseCount > 0 ? (
                    <AnimatedCounter
                      value={surpriseCount}
                      format={(v) => `${Math.round(v).toLocaleString()}+`}
                    />
                  ) : "Start free",
                },
                {
                  value: 98,
                  label: "Recipients loved it",
                  content: <AnimatedCounter value={98} format={(v) => `${Math.round(v)}%`} />,
                },
                {
                  value: null,
                  label: "Average create time",
                  content: "3 min",
                },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  className="bg-white/60 backdrop-blur-sm rounded-2xl px-4 py-3 border border-[#D4CBC3]/20 shadow-[0_2px_12px_rgba(45,41,38,0.04)]"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={makeReducedMotionTransition(reducedMotion, {
                    duration: durations.base,
                    ease: easings.entrance,
                    delay: T.statsStart + i * staggers.detail,
                  })}
                >
                  <p className="font-heading text-2xl text-[#2D2926] font-bold leading-none">
                    {stat.content}
                  </p>
                  <p className="text-[#6B5E57] text-[11px] mt-1">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Right — three animated SVG occasion cards (spring settle; loops are CSS, guarded) */}
          <motion.div
            className="relative flex flex-col items-center justify-center gap-5"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={makeReducedMotionTransition(reducedMotion, {
              ...springs.weighty,
              delay: T.ctaStart,
            })}
          >
            <OccasionCards />
            <Link
              href="/surprise/demo"
              className="btn-pill inline-flex items-center gap-1.5 text-sm font-semibold text-[#C4686D] bg-white border border-[#E8A5A8]/40 shadow-sm hover:border-[#C4686D]/40 transition-all"
            >
              <Star className="w-3.5 h-3.5 fill-[#C9A96E] text-[#C9A96E]" />
              Try the live demo
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
