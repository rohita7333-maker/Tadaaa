"use client";

import { occasions } from "@/lib/themes";
import { chipClassName, CHIP_ROW_CLASS } from "./chip-style";

const filterOptions: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  ...occasions.map((occasion) => ({ id: occasion.id, label: occasion.label })),
];

interface Props {
  active: string;
  onChange: (occasionId: string) => void;
}

export default function FilterChips({ active, onChange }: Props) {
  return (
    <div
      role="group"
      aria-label="Filter templates by occasion"
      className={CHIP_ROW_CLASS}
    >
      {filterOptions.map((option) => {
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
