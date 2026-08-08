"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Template } from "@/lib/templates";
import { durations, easings, makeReducedMotionTransition } from "@/lib/motion";
import TemplateCard from "./TemplateCard";

interface Props {
  items: Template[];
}

export default function TemplateGrid({ items }: Props) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.ul
      layout={!reducedMotion}
      aria-label="Template collection"
      className="m-0 grid list-none gap-[22px] p-0 [grid-template-columns:repeat(auto-fill,minmax(min(230px,100%),1fr))]"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {items.map((template) => (
          <motion.li
            key={template.id}
            layout={!reducedMotion}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={makeReducedMotionTransition(reducedMotion, {
              duration: durations.base,
              ease: easings.entrance,
            })}
          >
            <TemplateCard template={template} />
          </motion.li>
        ))}
      </AnimatePresence>
    </motion.ul>
  );
}
