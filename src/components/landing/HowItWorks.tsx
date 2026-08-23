"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Palette, ImagePlus, Send } from "lucide-react";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import {
  easings,
  durations,
  staggers,
  makeReducedMotionTransition,
} from "@/lib/motion";

const steps = [
  {
    icon: ImagePlus,
    step: "01",
    title: "Add photos & a message",
    description: "Upload up to 8 photos as polaroids, write captions, and craft a heartfelt message. Add a playful yes/no question too.",
    color: "#8A6F35",
    bg: "#FFF8E8",
    span: 2,
  },
  {
    icon: Palette,
    step: "02",
    title: "Pick your occasion",
    description: "Birthday, anniversary, proposal, Mother's Day — 6 occasion types with matching themes.",
    color: "#3E6B5C",
    bg: "#FFF0E8",
    span: 1,
  },
  {
    icon: Send,
    step: "03",
    title: "Share the magic link",
    description: "Publish and get a unique link. Share via WhatsApp, iMessage, anywhere.",
    color: "#6B8F71",
    bg: "#F0F7F1",
    span: 1,
  },
];

// Directional entrance by role:
// Step 01 (wide/dominant) → slides from left (reading direction)
// Steps 02+03 (subordinate) → rise from below with stagger
function getStepVariant(index: number) {
  if (index === 0) {
    return {
      initial: { opacity: 0, x: -24 },
      animate: { opacity: 1, x: 0 },
    };
  }
  return {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
  };
}

export default function HowItWorks() {
  const reducedMotion = useReducedMotion();

  return (
    <section id="how-it-works" className="py-28 px-6 bg-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(62,107,92,0.04)_0%,transparent_70%)]" />

      <div className="max-w-5xl mx-auto relative">
        {/* Section header — simple, not competing with hero */}
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={makeReducedMotionTransition(reducedMotion, {
            duration: durations.base,
            ease: easings.entrance,
          })}
        >
          <span className="text-[#3E6B5C] text-xs font-bold uppercase tracking-widest mb-4 block">
            How it works
          </span>
          <h2 className="font-heading text-5xl md:text-6xl text-[#1A1B18]">
            Three steps to magic
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 auto-rows-fr">
          {steps.map((step, i) => {
            const { initial, animate } = getStepVariant(i);
            // Stagger: step 01 leads, 02+03 follow with intent cadence
            const delay = i === 0 ? 0 : staggers.support + (i - 1) * staggers.detail;

            return (
              <motion.div
                key={step.step}
                className={step.span === 2 ? "md:col-span-2" : "md:col-span-1"}
                initial={initial}
                whileInView={animate}
                viewport={{ once: true }}
                transition={makeReducedMotionTransition(reducedMotion, {
                  duration: durations.slow,
                  ease: easings.entrance,
                  delay,
                })}
              >
                <SpotlightCard
                  className="h-full bg-[#FAF9F6] hover:border-[#E9E6DF]/50 hover:shadow-[0_8px_32px_rgba(26,27,24,0.08)] transition-all duration-300 group"
                >
                  <div className="p-7 h-full flex flex-col">
                    <div className="flex items-center gap-3 mb-5">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform"
                        style={{ background: step.bg }}
                      >
                        <step.icon className="w-5 h-5" style={{ color: step.color }} />
                      </div>
                      <span
                        className="font-heading text-4xl font-bold leading-none"
                        style={{ color: step.color, opacity: 0.18 }}
                      >
                        {step.step}
                      </span>
                    </div>
                    <h3 className="font-heading text-xl text-[#1A1B18] mb-3">{step.title}</h3>
                    <p className="text-[#6F6E68] text-sm leading-relaxed">{step.description}</p>
                  </div>
                </SpotlightCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
