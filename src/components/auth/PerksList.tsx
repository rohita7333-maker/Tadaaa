"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

interface PerksListProps {
  perks: string[];
}

export function PerksList({ perks }: PerksListProps) {
  const shouldReduce = useReducedMotion();
  return (
    <ul className="space-y-3 w-full max-w-xs text-left list-none">
      {perks.map((perk, i) => (
        <motion.li
          key={perk}
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: shouldReduce ? 0 : -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={
            shouldReduce
              ? { duration: 0.15, delay: 0.05 * i }
              : { duration: 0.4, delay: 0.1 * i, ease: [0.22, 1, 0.36, 1] }
          }
        >
          <CheckCircle2 className="w-4 h-4 text-[#8A6F35] flex-shrink-0" />
          <span className="text-white/70 text-sm">{perk}</span>
        </motion.li>
      ))}
    </ul>
  );
}
