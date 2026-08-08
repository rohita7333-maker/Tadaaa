"use client";

import { allStyleTags } from "@/lib/templates";
import { chipClassName } from "./chip-style";

interface Props {
  active: string[];
  onToggle: (tag: string) => void;
}

/** Multi-select style facet — clicking a tag toggles it; several can be
 * active at once (they OR together in filterTemplates). */
export default function StyleTagChips({ active, onToggle }: Props) {
  const tags = allStyleTags();

  return (
    <div
      role="group"
      aria-label="Filter templates by style"
      className="flex flex-wrap gap-2"
    >
      {tags.map((tag) => {
        const isActive = active.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            aria-pressed={isActive}
            onClick={() => onToggle(tag)}
            className={chipClassName(isActive)}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
