"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Heart, Sparkles, Star, Play } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { GridPattern } from "@/components/ui/grid-pattern";
import { ShimmerText } from "@/components/ui/shimmer-text";
import {
  easings,
  durations,
  namedEasings,
  staggers,
  springs,
  makeReducedMotionTransition,
} from "@/lib/motion";

const floatingCards = [
  { emoji: "🎂", title: "Birthday Surprise", rotate: "-8deg", x: "-60%", y: "-20%", delay: 0 },
  { emoji: "💍", title: "She said YES!", rotate: "6deg", x: "55%", y: "-10%", delay: 0.2 },
  { emoji: "🌸", title: "Mother's Day", rotate: "-4deg", x: "-55%", y: "30%", delay: 0.4 },
  { emoji: "🎉", title: "Anniversary", rotate: "9deg", x: "52%", y: "35%", delay: 0.6 },
];

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

          {/* Right — floating invite cards (spring settle, ambient loops guarded) */}
          <motion.div
            className="relative flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={makeReducedMotionTransition(reducedMotion, {
              ...springs.weighty,
              delay: T.ctaStart,
            })}
          >
            {/* Center card */}
            <Link
              href="/surprise/test"
              className="relative w-72 h-96 bg-white rounded-3xl shadow-[0_24px_80px_rgba(196,104,109,0.18),0_8px_24px_rgba(45,41,38,0.1)] overflow-hidden border border-[#E8A5A8]/30 z-10 block hover:shadow-[0_32px_100px_rgba(196,104,109,0.25),0_12px_32px_rgba(45,41,38,0.12)] hover:-translate-y-2 transition-all duration-500 ring-1 ring-[#C4686D]/5"
            >
              <div
                className="h-48 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #FFF0E8 0%, #F5E6E0 100%)" }}
              >
                {/* Heart ambient pulse — guarded */}
                {!reducedMotion ? (
                  <motion.div
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: durations.ambient, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Heart className="w-20 h-20 fill-[#C4686D] text-[#C4686D]" />
                  </motion.div>
                ) : (
                  <Heart className="w-20 h-20 fill-[#C4686D] text-[#C4686D]" />
                )}
              </div>
              <div className="p-6">
                <p className="font-heading text-lg text-[#2D2926] mb-1">Someone made this for you</p>
                <p className="text-[#6B5E57] text-sm">A special message is waiting...</p>
                <div className="mt-5">
                  <div className="h-10 rounded-full bg-gradient-to-r from-[#C4686D] to-[#9B3D42] flex items-center justify-center text-white text-sm font-semibold pulse-glow">
                    Try the demo ✨
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-[#C9A96E] text-[#C9A96E]" />
                  ))}
                  <span className="text-xs text-[#6B5E57] ml-1">142 views</span>
                </div>
              </div>
            </Link>

            {/* Floating polaroid cards — ambient loops guarded */}
            {floatingCards.map((card, i) => (
              <motion.div
                key={i}
                className="absolute hidden md:block bg-white p-2.5 pb-7 shadow-[0_8px_32px_rgba(45,41,38,0.12),0_2px_8px_rgba(45,41,38,0.06)]"
                style={{
                  transform: `rotate(${card.rotate}) translateX(${card.x}) translateY(${card.y})`,
                  borderRadius: "6px",
                  width: "108px",
                  zIndex: 5,
                }}
                {...(!reducedMotion && {
                  animate: { y: [0, -8, 0] },
                  transition: {
                    duration: [durations.floatA, durations.floatC, durations.floatB][i] ?? durations.floatA,
                    repeat: Infinity,
                    delay: card.delay,
                    ease: namedEasings.ambient,
                  },
                })}
              >
                <div
                  className="w-full aspect-square rounded-sm flex items-center justify-center text-2xl"
                  style={{ background: "linear-gradient(135deg, #FFF0E8 0%, #F5EDE3 100%)" }}
                >
                  {card.emoji}
                </div>
                <p
                  className="text-center text-[#4a4a4a] mt-1.5 leading-tight"
                  style={{ fontFamily: "var(--font-caveat), cursive", fontSize: "11px" }}
                >
                  {card.title}
                </p>
              </motion.div>
            ))}

            {/* Floating reaction badges — ambient guarded */}
            {!reducedMotion && (
              <>
                <motion.div
                  className="absolute hidden md:flex top-4 right-0 bg-white rounded-2xl shadow-lg px-3 py-2 items-center gap-2 z-20"
                  animate={{ y: [-4, 4, -4] }}
                  transition={{ duration: durations.floatB, repeat: Infinity, ease: namedEasings.ambient }}
                >
                  <span className="text-base">😭</span>
                  <span className="text-xs font-medium text-[#2D2926]">She&apos;s crying!</span>
                </motion.div>
                <motion.div
                  className="absolute hidden md:flex bottom-8 left-0 bg-white rounded-2xl shadow-lg px-3 py-2 items-center gap-2 z-20"
                  animate={{ y: [4, -4, 4] }}
                  transition={{ duration: durations.floatC, repeat: Infinity, ease: namedEasings.ambient }}
                >
                  <span className="text-base">🎊</span>
                  <span className="text-xs font-medium text-[#2D2926]">He said YES!</span>
                </motion.div>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
