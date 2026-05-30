"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Lock } from "lucide-react";
import { themes, type Theme } from "@/lib/themes";
import { cn } from "@/lib/utils";
import { springs, makeReducedMotionTransition } from "@/lib/motion";

interface ThemeSelectorProps {
  selectedTheme: string;
  onSelect: (themeId: string) => void;
  onPremiumClick: (theme: Theme) => void;
  unlockedPremiumThemes?: string[];
}

export default function ThemeSelector({
  selectedTheme,
  onSelect,
  onPremiumClick,
  unlockedPremiumThemes,
}: ThemeSelectorProps) {
  const shouldReduce = useReducedMotion();
  // `undefined` means the caller is on an Unlimited plan — all premium themes unlocked.
  const allUnlocked = unlockedPremiumThemes === undefined;
  const unlockedSet = unlockedPremiumThemes ?? [];
  return (
    <div className="w-full">
      <h2 className="font-heading text-2xl text-[#2D2926] mb-2">Choose a theme</h2>
      <p className="text-[#6B5E57] mb-6">
        Pick the vibe that matches your surprise. 3 free themes included.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {themes.map((theme) => {
          const isUnlocked =
            !theme.isPremium || allUnlocked || unlockedSet.includes(theme.id);
          const isSelected = selectedTheme === theme.id;

          return (
            <motion.button
              key={theme.id}
              onClick={() => {
                if (isUnlocked) {
                  onSelect(theme.id);
                } else {
                  onPremiumClick(theme);
                }
              }}
              initial={false}
              animate={{ scale: isSelected ? 1.02 : 1 }}
              whileTap={shouldReduce ? {} : { scale: 0.96 }}
              transition={makeReducedMotionTransition(shouldReduce, springs.soft)}
              className={cn(
                "relative rounded-2xl overflow-hidden border-2 transition-colors text-left group",
                isSelected
                  ? "border-[#C4686D] shadow-[0_0_0_4px_rgba(196,104,109,0.15)]"
                  : "border-transparent hover:border-[#D4CBC3] hover:shadow-[0_4px_16px_rgba(45,41,38,0.08)]"
              )}
            >
              {/* Preview gradient */}
              <div
                className="h-24 w-full transition-transform duration-300 group-hover:scale-105"
                style={{ background: theme.colors.background }}
              >
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-3xl">
                    {theme.revealIcon === "envelope"
                      ? "✉️"
                      : theme.revealIcon === "gift"
                      ? "🎁"
                      : theme.revealIcon === "heart"
                      ? "❤️"
                      : theme.revealIcon === "star"
                      ? "⭐"
                      : "🎈"}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-white">
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <p className="font-medium text-[#2D2926] text-sm leading-tight">
                      {theme.name}
                    </p>
                    <p className="text-[#6B5E57] text-xs mt-0.5 leading-tight">
                      {theme.description}
                    </p>
                  </div>
                  {theme.isPremium && !isUnlocked && (
                    <div className="shrink-0 flex items-center gap-0.5 bg-[#C9A96E]/10 text-[#C9A96E] text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-[#C9A96E]/20">
                      <Lock className="w-2.5 h-2.5" />
                      $4.99
                    </div>
                  )}
                  {isUnlocked && theme.isPremium && (
                    <div className="shrink-0 text-[#6B8F71] text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#6B8F71]/10">
                      Unlocked
                    </div>
                  )}
                </div>
              </div>

              {/* Selected ring */}
              {isSelected && (
                <div className="absolute inset-0 border-2 border-[#C4686D] rounded-2xl pointer-events-none" />
              )}

              {/* Locked overlay */}
              {!isUnlocked && (
                <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="bg-[#2D2926]/80 text-white text-xs px-3 py-1.5 rounded-full">
                    Unlock for $4.99
                  </div>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
