"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { themes } from "@/lib/themes";
import { cn } from "@/lib/utils";
import { springs, makeReducedMotionTransition } from "@/lib/motion";

interface ThemeSelectorProps {
  selectedTheme: string;
  onSelect: (themeId: string) => void;
  unlockedPremiumThemes?: string[];
}

/**
 * Selection is free — entitlement is settled once, at publish. Premium themes
 * carry a "Premium" badge here and no price: the only $ moment in the wizard
 * is the publish gate.
 */
export default function ThemeSelector({
  selectedTheme,
  onSelect,
  unlockedPremiumThemes,
}: ThemeSelectorProps) {
  const shouldReduce = useReducedMotion();
  // `undefined` means the caller is on an Unlimited plan — all premium themes unlocked.
  const allUnlocked = unlockedPremiumThemes === undefined;
  const unlockedSet = unlockedPremiumThemes ?? [];
  return (
    <div className="w-full">
      <h2 className="font-heading text-2xl text-[#1A1B18] mb-2">Choose a theme</h2>
      <p className="text-[#6F6E68] mb-6">
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
              onClick={() => onSelect(theme.id)}
              initial={false}
              animate={{ scale: isSelected ? 1.02 : 1 }}
              whileTap={shouldReduce ? {} : { scale: 0.96 }}
              transition={makeReducedMotionTransition(shouldReduce, springs.soft)}
              className={cn(
                "relative rounded-2xl overflow-hidden border-2 transition-colors text-left group",
                isSelected
                  ? "border-[#3E6B5C] shadow-[0_0_0_4px_rgba(62, 107, 92,0.15)]"
                  : "border-transparent hover:border-[#E9E6DF] hover:shadow-[0_4px_16px_rgba(26, 27, 24,0.08)]"
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
                    <p className="font-medium text-[#1A1B18] text-sm leading-tight">
                      {theme.name}
                    </p>
                    <p className="text-[#6F6E68] text-xs mt-0.5 leading-tight">
                      {theme.description}
                    </p>
                  </div>
                  {theme.isPremium && !isUnlocked && (
                    <div className="shrink-0 flex items-center gap-0.5 bg-[#8A6F35]/10 text-[#8A6F35] text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-[#8A6F35]/20">
                      <Sparkles className="w-2.5 h-2.5" />
                      Premium
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
                <div className="absolute inset-0 border-2 border-[#3E6B5C] rounded-2xl pointer-events-none" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
