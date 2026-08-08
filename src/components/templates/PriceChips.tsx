"use client";

import { chipClassName } from "./chip-style";

export type PriceFilterValue = "all" | "free" | "premium";

const priceOptions: { id: PriceFilterValue; label: string }[] = [
  { id: "all", label: "Any price" },
  { id: "free", label: "Free" },
  { id: "premium", label: "Premium" },
];

interface Props {
  active: PriceFilterValue;
  onChange: (tier: PriceFilterValue) => void;
}

export default function PriceChips({ active, onChange }: Props) {
  return (
    <div
      role="group"
      aria-label="Filter templates by price"
      className="flex flex-wrap gap-2"
    >
      {priceOptions.map((option) => {
        const isActive = option.id === active;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.id)}
            className={chipClassName(isActive)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
