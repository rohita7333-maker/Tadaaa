"use client";

import { motion, useReducedMotion } from "framer-motion";
import { easings, getReducedMotionTransition } from "@/lib/motion";
import { Check } from "lucide-react";

interface StepIndicatorProps {
  currentStep: number;
}

const STEPS = ["Occasion", "Photos & Message", "Question", "Publish"];

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  const totalSteps = STEPS.length;
  const shouldReduce = useReducedMotion();
  const pct = Math.max(0, Math.min(1, (currentStep - 1) / (totalSteps - 1))) * 100;
  const topBarPct = Math.max(0, Math.min(1, currentStep / totalSteps)) * 100;

  return (
    <div className="w-full">
      {/* Sticky top progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-[#D4CBC3]/30 z-[60] pointer-events-none">
        <motion.div
          className="h-full bg-gradient-to-r from-[#C4686D] to-[#9B3D42]"
          initial={false}
          animate={{ width: `${topBarPct}%` }}
          transition={getReducedMotionTransition(shouldReduce, { duration: 0.5, ease: easings.entrance })}
        />
      </div>

      <div className="relative flex items-start justify-between">
        {/* Connecting line (sits between circle centers) */}
        <div className="absolute top-3.5 left-3.5 right-3.5 h-0.5 bg-[#D4CBC3]/50 -z-0" aria-hidden="true">
          <motion.div
            className="h-full bg-gradient-to-r from-[#C4686D] to-[#9B3D42]"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={getReducedMotionTransition(shouldReduce, { duration: 0.45, ease: easings.entrance })}
          />
        </div>

        {STEPS.map((label, i) => {
          const step = i + 1;
          const isCompleted = step < currentStep;
          const isActive = step === currentStep;

          return (
            <div key={step} className="relative z-10 flex flex-col items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 border-2 ${
                  isCompleted
                    ? "bg-[#C4686D] border-[#C4686D] text-white"
                    : isActive
                    ? "bg-white border-[#C4686D] text-[#C4686D] ring-4 ring-[#C4686D]/15"
                    : "bg-white border-[#D4CBC3] text-[#6B5E57]"
                }`}
                aria-current={isActive ? "step" : undefined}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : step}
              </div>
              <span
                className={`text-[10px] hidden sm:block transition-colors whitespace-nowrap ${
                  isActive ? "text-[#C4686D] font-semibold" : "text-[#6B5E57]"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
