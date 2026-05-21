"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

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
  return (
    <section className="py-24 px-6 bg-[#FFF8F0]">
      <div className="max-w-5xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-[#C4686D] text-sm font-medium uppercase tracking-widest mb-3 block">
            Real stories
          </span>
          <h2 className="font-heading text-4xl md:text-5xl text-[#2D2926]">
            Moments that mattered
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              className="bg-white rounded-3xl p-8 shadow-[0_4px_24px_rgba(45,41,38,0.06)] border border-[#D4CBC3]/40"
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            >
              <div className="flex gap-1 mb-4">
                {[...Array(t.rating)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-[#C9A96E] text-[#C9A96E]" />
                ))}
              </div>
              <p className="text-[#2D2926] leading-relaxed mb-6 italic">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C4686D] to-[#9B3D42] flex items-center justify-center text-white font-bold text-sm">
                  {t.avatar}
                </div>
                <div>
                  <p className="font-medium text-[#2D2926] text-sm">{t.name}</p>
                  <p className="text-[#6B5E57] text-xs">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
