"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, PenLine } from "lucide-react";
import { occasions } from "@/lib/themes";
import { springs, makeReducedMotionTransition } from "@/lib/motion";

interface Props {
  selected: string;
  onSelect: (id: string) => void;
  onPromptSelect?: (prompt: string) => void;
  /** Current title value — used to highlight the matching quick-fill chip. */
  selectedPrompt?: string;
}

export default function OccasionSelector({
  selected,
  onSelect,
  onPromptSelect,
  selectedPrompt = "",
}: Props) {
  const selectedOcc = occasions.find((o) => o.id === selected);
  const shouldReduce = useReducedMotion();
  const isCustom = selectedOcc?.id === "custom";
  const hasChips = (selectedOcc?.prompts.length ?? 0) > 0;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[#1A1B18] font-medium text-sm mb-3">Occasion</p>
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
                  ? "border-[#3E6B5C] bg-[#FFF0EE]"
                  : "border-[#E9E6DF] bg-white hover:border-[#3E6B5C]/40"
              }`}
            >
              <div className="text-2xl mb-1">{occ.emoji}</div>
              <div className="text-[11px] font-medium text-[#1A1B18] leading-tight">{occ.label}</div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Quick-fill + custom authoring. Renders for every occasion so users can
          always write their own line; "custom" shows only the free-text input. */}
      {selectedOcc && onPromptSelect && (
        <div className="space-y-3">
          {hasChips && (
            <div>
              <p className="text-xs text-[#6F6E68] mb-2">Quick-fill suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {selectedOcc.prompts.map((p) => {
                  const isSelected = selectedPrompt.trim() === p;
                  return (
                    <motion.button
                      key={p}
                      type="button"
                      onClick={() => onPromptSelect(p)}
                      initial={false}
                      whileTap={shouldReduce ? {} : { scale: 0.96 }}
                      transition={makeReducedMotionTransition(shouldReduce, springs.soft)}
                      aria-pressed={isSelected}
                      className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        isSelected
                          ? "border-[#3E6B5C] bg-[#FFF0EE] text-[#3E6B5C] font-medium"
                          : "border-[#E9E6DF] bg-white text-[#6F6E68] hover:border-[#3E6B5C] hover:text-[#3E6B5C]"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      {p}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Free-text custom fill — the only path for "custom", a complement
              beside chips for everything else. */}
          <div>
            <label
              htmlFor="occasion-custom-fill"
              className="flex items-center gap-1.5 text-xs text-[#6F6E68] mb-2"
            >
              <PenLine className="w-3 h-3" />
              {isCustom ? "Write your own message" : hasChips ? "Or write your own" : "Write your own message"}
            </label>
            <input
              id="occasion-custom-fill"
              type="text"
              value={selectedPrompt}
              onChange={(e) => onPromptSelect(e.target.value)}
              placeholder={isCustom ? "e.g. Will you be my maid of honor?" : "Type your own line…"}
              className="w-full rounded-xl border-2 border-[#E9E6DF] bg-white px-3 py-2.5 text-sm text-[#1A1B18] placeholder:text-[#9C8E87] focus:outline-none focus:border-[#3E6B5C] transition-colors"
            />
          </div>
        </div>
      )}
    </div>
  );
}
