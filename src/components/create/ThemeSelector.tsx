"use client";

import { themes } from "@/lib/themes";
import { cn } from "@/lib/utils";
import { WIZ_H2 } from "./editorial";

interface ThemeSelectorProps {
  selectedTheme: string;
  onSelect: (themeId: string) => void;
  unlockedPremiumThemes?: string[];
}

/**
 * Theme picker — mockup `.themecard` (L326-330): a mist-bordered swatch, a
 * serif name underneath, and a 10px uppercase label that turns coral when the
 * theme is premium. No emoji: the editorial identity bans emoji-as-content.
 *
 * Selection is free — entitlement is settled once, at publish. Premium themes
 * carry a label here and no price: the only $ moment in the wizard is the
 * publish gate.
 */
export default function ThemeSelector({
  selectedTheme,
  onSelect,
  unlockedPremiumThemes,
}: ThemeSelectorProps) {
  // `undefined` means the caller is on an Unlimited plan — all premium themes unlocked.
  const allUnlocked = unlockedPremiumThemes === undefined;
  const unlockedSet = unlockedPremiumThemes ?? [];

  return (
    <div className="w-full">
      <h2 className={WIZ_H2}>Choose a theme</h2>
      <p className="text-sm text-stone mb-6">
        The colour the whole reveal is built from. Three are free.
      </p>

      <div
        className="grid grid-cols-2 gap-4 sm:grid-cols-3"
        role="radiogroup"
        aria-label="Theme"
      >
        {themes.map((theme) => {
          const isUnlocked =
            !theme.isPremium || allUnlocked || unlockedSet.includes(theme.id);
          const isSelected = selectedTheme === theme.id;

          return (
            <button
              key={theme.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(theme.id)}
              className="text-left group focus-visible:outline-2 focus-visible:outline-coral focus-visible:outline-offset-2"
            >
              <span
                className={cn(
                  "block h-[120px] rounded-[var(--r-md)] transition-[border-color,transform] duration-200",
                  isSelected
                    ? "border-2 border-coral"
                    : "border border-mist group-hover:-translate-y-1 group-hover:shadow-[var(--sh-card)]"
                )}
                style={{ background: theme.colors.background }}
              />
              <span className="mt-2.5 block font-heading text-[15px] text-ink">
                {theme.name}
              </span>
              <span
                className={cn(
                  "block text-[10px] font-semibold uppercase tracking-[0.12em]",
                  theme.isPremium && !isUnlocked ? "text-coral-deep" : "text-stone"
                )}
              >
                {theme.isPremium ? (isUnlocked ? "Premium · unlocked" : "Premium") : "Free"}
              </span>
              <span className="mt-0.5 block text-[13px] leading-snug text-stone">
                {theme.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
