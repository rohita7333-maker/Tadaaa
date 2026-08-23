"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Star } from "lucide-react";
import {
  easings,
  durations,
  staggers,
  makeReducedMotionTransition,
} from "@/lib/motion";

const testimonials = [
  {
    name: "Sarah M.",
    role: "Made this for Mother's Day",
    quote:
      "My mom literally cried happy tears. She said it was the most thoughtful gift she'd ever received. The tap-to-reveal was pure magic!",
    avatar: "S",
    rating: 5,
  },
  {
    name: "James K.",
    role: "Used for a date proposal",
    quote:
      "I put our story in photos with a message asking her to be my girlfriend. She said yes immediately! TaDaaaa made it so special.",
    avatar: "J",
    rating: 5,
  },
  {
    name: "Priya R.",
    role: "Birthday surprise",
    quote:
      "My best friend's reaction when she opened this was everything. The countdown timer made the anticipation incredible. Absolutely worth it.",
    avatar: "P",
    rating: 5,
  },
];

export default function Testimonials() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="py-24 px-6 bg-[#FAF9F6]">
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={makeReducedMotionTransition(reducedMotion, {
            duration: durations.base,
            ease: easings.entrance,
          })}
        >
          <span className="text-[#3E6B5C] text-sm font-medium uppercase tracking-widest mb-3 block">
            Real stories
          </span>
          <h2 className="font-heading text-4xl md:text-5xl text-[#1A1B18]">
            Moments that mattered
          </h2>
        </motion.div>

        {/* Cards — reading cadence L→R stagger, shorter y travel (20 not 32) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              className="bg-white rounded-3xl p-8 shadow-[0_4px_24px_rgba(26, 27, 24,0.06)] border border-[#E9E6DF]/40"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={makeReducedMotionTransition(reducedMotion, {
                duration: durations.base,
                ease: easings.entrance,
                delay: i * staggers.support,
              })}
            >
              <div className="flex gap-1 mb-4">
                {[...Array(t.rating)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-[#8A6F35] text-[#8A6F35]" />
                ))}
              </div>
              <p className="text-[#1A1B18] leading-relaxed mb-6 italic">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3E6B5C] to-[#2E5145] flex items-center justify-center text-white font-bold text-sm">
                  {t.avatar}
                </div>
                <div>
                  <p className="font-medium text-[#1A1B18] text-sm">{t.name}</p>
                  <p className="text-[#6F6E68] text-xs">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
