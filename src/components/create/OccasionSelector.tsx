"use client";

import { motion, useReducedMotion } from "framer-motion";
import { occasions } from "@/lib/themes";
import { springs, makeReducedMotionTransition } from "@/lib/motion";

interface Props {
  selected: string;
  onSelect: (id: string) => void;
  onPromptSelect?: (prompt: string) => void;
}

export default function OccasionSelector({ selected, onSelect, onPromptSelect }: Props) {
  const selectedOcc = occasions.find((o) => o.id === selected);
  const shouldReduce = useReducedMotion();

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[#2D2926] font-medium text-sm mb-3">Occasion</p>
        <div className="grid grid-cols-3 gap-2">
          {occasions.map((occ) => (
            <motion.button
              key={occ.id}
              type="button"
              onClick={() => onSelect(occ.id)}
              initial={false}
              animate={{ scale: selected === occ.id ? 1.02 : 1, y: selected === occ.id ? -1 : 0 }}
              whileTap={shouldReduce ? {} : { scale: 0.94 }}
              transition={makeReducedMotionTransition(shouldReduce, springs.soft)}
              className={`py-3 px-2 rounded-2xl border-2 text-center transition-colors ${
                selected === occ.id
                  ? "border-[#C4686D] bg-[#FFF0EE]"
                  : "border-[#D4CBC3] bg-white hover:border-[#C4686D]/40"
              }`}
            >
              <div className="text-2xl mb-1">{occ.emoji}</div>
              <div className="text-[11px] font-medium text-[#2D2926] leading-tight">{occ.label}</div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Prompt suggestions */}
      {selectedOcc && selectedOcc.prompts.length > 0 && onPromptSelect && (
        <div>
          <p className="text-xs text-[#6B5E57] mb-2">Quick-fill suggestions:</p>
          <div className="flex flex-wrap gap-2">
            {selectedOcc.prompts.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onPromptSelect(p)}
                className="text-xs px-3 py-1.5 rounded-full border border-[#D4CBC3] bg-white text-[#6B5E57] hover:border-[#C4686D] hover:text-[#C4686D] transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
