"use client";

import { motion } from "framer-motion";
import { Palette, ImagePlus, Send } from "lucide-react";
import { SpotlightCard } from "@/components/ui/spotlight-card";

const steps = [
  {
    icon: ImagePlus,
    step: "01",
    title: "Add photos & a message",
    description: "Upload up to 8 photos as polaroids, write captions, and craft a heartfelt message. Add a playful yes/no question too.",
    color: "#C9A96E",
    bg: "#FFF8E8",
    span: 2,
  },
  {
    icon: Palette,
    step: "02",
    title: "Pick your occasion",
    description: "Birthday, anniversary, proposal, Mother's Day — 6 occasion types with matching themes.",
    color: "#C4686D",
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

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-28 px-6 bg-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(196,104,109,0.04)_0%,transparent_70%)]" />

      <div className="max-w-5xl mx-auto relative">
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-[#C4686D] text-xs font-bold uppercase tracking-widest mb-4 block">
            How it works
          </span>
          <h2 className="font-heading text-5xl md:text-6xl text-[#2D2926]">
            Three steps to magic
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 auto-rows-fr">
          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              className={step.span === 2 ? "md:col-span-2" : "md:col-span-1"}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
            >
              <SpotlightCard
                className="h-full bg-[#FFF8F0] hover:border-[#D4CBC3]/50 hover:shadow-[0_8px_32px_rgba(45,41,38,0.08)] transition-all duration-300 group"
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
                  <h3 className="font-heading text-xl text-[#2D2926] mb-3">{step.title}</h3>
                  <p className="text-[#6B5E57] text-sm leading-relaxed">{step.description}</p>
                </div>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
