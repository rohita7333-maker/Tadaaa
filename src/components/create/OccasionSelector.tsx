"use client";

import { PenLine } from "lucide-react";
import { occasions } from "@/lib/themes";
import { LABEL, INPUT, SELECTABLE, SELECTABLE_ON } from "./editorial";

interface Props {
  selected: string;
  onSelect: (id: string) => void;
  onPromptSelect?: (prompt: string) => void;
  /** Current title value — used to highlight the matching quick-fill chip. */
  selectedPrompt?: string;
}

/**
 * Occasion icons — stroke paths in the mockup's own hand (`OICON`, L1140).
 * Emoji-as-content is banned by the editorial identity, so `occasion.emoji`
 * from `themes.ts` is deliberately unused on this surface.
 */
const OICON: Record<string, React.ReactNode> = {
  date: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  birthday: <path d="M12 3v4M8 7h8l1 5H7zM5 12h14v8H5zM5 16h14" />,
  festival: <path d="M12 3l2 5h5l-4 3.5L16.5 17 12 14l-4.5 3L9 11.5 5 8h5z" />,
  mothers_day: <path d="M12 20s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.5-7 10-7 10z" />,
  fathers_day: <path d="M4 8h12v8a4 4 0 01-4 4H8a4 4 0 01-4-4zM16 10h2a2 2 0 010 4h-2" />,
  apology: <path d="M4 6h16v10H8l-4 4z" />,
  custom: <path d="M12 5v14M5 12h14" />,
};

/** One line per occasion — mockup `.ocard p`. */
const OBLURB: Record<string, string> = {
  date: "Make the ask impossible to refuse.",
  birthday: "Cake, candles, everyone in on it.",
  festival: "Lights, family, the whole crew.",
  mothers_day: "The thank-you she never asks for.",
  fathers_day: "A thank-you he will not expect.",
  apology: "Say it properly this time.",
  custom: "Any moment worth a reveal.",
};

export default function OccasionSelector({
  selected,
  onSelect,
  onPromptSelect,
  selectedPrompt = "",
}: Props) {
  const selectedOcc = occasions.find((o) => o.id === selected);
  const isCustom = selectedOcc?.id === "custom";
  const hasChips = (selectedOcc?.prompts.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      {/* Mockup `.occsel` — a vertical stack of `.ocard`s, not an emoji grid. */}
      <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Occasion">
        {occasions.map((occ) => {
          const on = selected === occ.id;
          return (
            <button
              key={occ.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onSelect(occ.id)}
              className={`${SELECTABLE} flex items-center gap-4 ${
                on ? `${SELECTABLE_ON} px-[17px] py-[15px]` : "px-[18px] py-4"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-[26px] h-[26px] shrink-0 text-ink"
              >
                {OICON[occ.id] ?? OICON.custom}
              </svg>
              <span className="min-w-0">
                <span className="block font-heading text-[17px] text-ink">
                  {occ.label}
                </span>
                <span className="block text-[13px] text-stone">
                  {OBLURB[occ.id] ?? OBLURB.custom}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Quick-fill + custom authoring. Renders for every occasion so users can
          always write their own line; "custom" shows only the free-text input. */}
      {selectedOcc && onPromptSelect && (
        <div className="space-y-4">
          {hasChips && (
            <div>
              <p className={LABEL}>Quick-fill</p>
              <div className="flex flex-wrap gap-2">
                {selectedOcc.prompts.map((p) => {
                  const isSelected = selectedPrompt.trim() === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => onPromptSelect(p)}
                      aria-pressed={isSelected}
                      className={`ed-chip ${isSelected ? "ed-chip-on" : ""}`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Free-text custom fill — the only path for "custom", a complement
              beside chips for everything else. */}
          <div>
            <label htmlFor="occasion-custom-fill" className={`${LABEL} flex items-center gap-1.5`}>
              <PenLine className="w-3 h-3" aria-hidden="true" />
              {isCustom ? "Write your own" : hasChips ? "Or write your own" : "Write your own"}
            </label>
            <input
              id="occasion-custom-fill"
              type="text"
              value={selectedPrompt}
              onChange={(e) => onPromptSelect(e.target.value)}
              placeholder={isCustom ? "Will you be my maid of honour?" : "Type your own line…"}
              className={INPUT}
            />
          </div>
        </div>
      )}
    </div>
  );
}
