"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Heart, Sparkles, Star, Play } from "lucide-react";

const floatingCards = [
  { emoji: "🎂", title: "Birthday Surprise", views: "142 views", rotate: "-8deg", x: "-60%", y: "-20%", delay: 0 },
  { emoji: "💍", title: "She said YES!", views: "89 views", rotate: "6deg", x: "55%", y: "-10%", delay: 0.2 },
  { emoji: "🌸", title: "Mother's Day", views: "203 views", rotate: "-4deg", x: "-55%", y: "30%", delay: 0.4 },
  { emoji: "🎉", title: "Anniversary", views: "67 views", rotate: "9deg", x: "52%", y: "35%", delay: 0.6 },
];

function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k+`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k+`;
  if (n > 0) return `${n}+`;
  return "0";
}

export default function Hero({ surpriseCount = 0 }: { surpriseCount?: number }) {
  const stats = [
    { num: surpriseCount > 0 ? formatCount(surpriseCount) : "Start free", label: "Surprises created" },
    { num: "98%", label: "Recipients loved it" },
    { num: "3 min", label: "Average create time" },
  ];
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

      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: "radial-gradient(circle, #D4CBC3 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — copy */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 bg-white text-[#C4686D] text-xs font-semibold px-4 py-2 rounded-full mb-8 border border-[#E8A5A8]/40 shadow-sm uppercase tracking-widest">
                <Sparkles className="w-3 h-3 fill-current" />
                Surprise invite builder
              </span>
            </motion.div>

            <motion.h1
              className="font-heading text-6xl md:text-7xl text-[#2D2926] leading-[1.05] mb-6"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              Make them
              <br />
              <span className="text-gradient">feel it</span>
              <br />
              forever
            </motion.h1>

            <motion.p
              className="text-[#6B5E57] text-lg leading-relaxed mb-10 max-w-md"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              Build a beautiful surprise page with your photos, a heartfelt message, and a playful yes/no question. Share it — watch the magic happen.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-3 mb-12"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
            >
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center h-14 px-8 rounded-2xl bg-gradient-to-r from-[#C4686D] to-[#9B3D42] hover:from-[#9B3D42] hover:to-[#C4686D] text-white font-semibold transition-all duration-300 hover:scale-[1.02] pulse-glow shadow-lg shadow-[#C4686D]/25 text-base"
              >
                Create a surprise — free
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center justify-center h-14 px-8 rounded-2xl border border-[#D4CBC3] text-[#2D2926] hover:bg-white hover:border-[#C4686D]/30 text-base transition-all duration-300 bg-white/70 font-medium"
              >
                <Play className="w-4 h-4 mr-2 text-[#C4686D]" />
                See how it works
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div
              className="flex gap-6 pt-8 border-t border-[#D4CBC3]/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.5 }}
            >
              {stats.map((s, i) => (
                <motion.div
                  key={s.label}
                  className="bg-white/60 backdrop-blur-sm rounded-2xl px-4 py-3 border border-[#D4CBC3]/20 shadow-[0_2px_12px_rgba(45,41,38,0.04)]"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.1, duration: 0.5 }}
                >
                  <p className="font-heading text-2xl text-[#2D2926] font-bold leading-none">{s.num}</p>
                  <p className="text-[#6B5E57] text-[11px] mt-1">{s.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Right — floating invite cards */}
          <motion.div
            className="relative flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.4 }}
          >
            {/* Center card — main invite preview (links to demo) */}
            <Link
              href="/surprise/test"
              className="relative w-72 h-96 bg-white rounded-3xl shadow-[0_24px_80px_rgba(196,104,109,0.18),0_8px_24px_rgba(45,41,38,0.1)] overflow-hidden border border-[#E8A5A8]/30 z-10 block hover:shadow-[0_32px_100px_rgba(196,104,109,0.25),0_12px_32px_rgba(45,41,38,0.12)] hover:-translate-y-2 transition-all duration-500 ring-1 ring-[#C4686D]/5"
            >
              {/* Top gradient */}
              <div
                className="h-48 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #FFF0E8 0%, #F5E6E0 100%)" }}
              >
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Heart className="w-20 h-20 fill-[#C4686D] text-[#C4686D]" />
                </motion.div>
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

            {/* Floating polaroid cards — hidden on mobile to prevent overlap */}
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
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: card.delay, ease: "easeInOut" }}
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

            {/* Floating reaction badges — hidden on mobile */}
            <motion.div
              className="absolute hidden md:flex top-4 right-0 bg-white rounded-2xl shadow-lg px-3 py-2 items-center gap-2 z-20"
              animate={{ y: [-4, 4, -4] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <span className="text-base">😭</span>
              <span className="text-xs font-medium text-[#2D2926]">She&apos;s crying!</span>
            </motion.div>
            <motion.div
              className="absolute hidden md:flex bottom-8 left-0 bg-white rounded-2xl shadow-lg px-3 py-2 items-center gap-2 z-20"
              animate={{ y: [4, -4, 4] }}
              transition={{ duration: 3.5, repeat: Infinity }}
            >
              <span className="text-base">🎊</span>
              <span className="text-xs font-medium text-[#2D2926]">He said YES!</span>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
