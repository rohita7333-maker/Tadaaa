"use client";

import { useEffect, useId, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Smile } from "lucide-react";
import { springs, durations, makeReducedMotionTransition } from "@/lib/motion";

// Curated set — covers the warm/celebratory register of TaDaaaa invites without
// shipping a multi-thousand-emoji dependency. Grouped for quick scanning.
const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  { label: "Love", emojis: ["❤️", "💕", "💖", "💘", "💝", "😍", "🥰", "😘", "💌", "💞"] },
  { label: "Celebrate", emojis: ["🎉", "🎊", "🥳", "🎂", "🍰", "🎈", "🎁", "✨", "🌟", "🥂"] },
  { label: "Faces", emojis: ["😊", "😁", "🤗", "😎", "🤩", "😇", "🙈", "😉", "🥹", "😌"] },
  { label: "Nature", emojis: ["🌹", "🌸", "🌷", "💐", "🌻", "🌈", "☀️", "🌙", "⭐", "🔥"] },
  { label: "Gestures", emojis: ["👋", "🙌", "👏", "🤝", "🙏", "💪", "👌", "🤞", "💯", "✌️"] },
];

export default function EmojiPicker({
  onPick,
  label = "Insert emoji",
}: {
  onPick: (emoji: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const shouldReduce = useReducedMotion();
  const panelId = useId();

  // Close on outside-click and Escape — standard popover dismissal.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={label}
        title={label}
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#6F6E68] hover:text-[#3E6B5C] hover:bg-[#FFF0EE] focus:outline-none focus:ring-2 focus:ring-[#3E6B5C]/30 transition-colors"
      >
        <Smile className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            role="dialog"
            aria-label="Emoji picker"
            initial={shouldReduce ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduce ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: -6 }}
            transition={makeReducedMotionTransition(shouldReduce, springs.soft)}
            className="absolute right-0 z-50 mt-2 w-64 max-h-72 overflow-y-auto rounded-xl border border-[#E9E6DF] bg-white p-3 shadow-lg"
          >
            {EMOJI_GROUPS.map((group) => (
              <div key={group.label} className="mb-2 last:mb-0">
                <p className="text-[10px] uppercase tracking-wider text-[#9C8E87] mb-1.5">
                  {group.label}
                </p>
                <div className="grid grid-cols-5 gap-1">
                  {group.emojis.map((emoji) => (
                    <motion.button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        onPick(emoji);
                        setOpen(false);
                      }}
                      whileTap={shouldReduce ? {} : { scale: 0.85 }}
                      transition={makeReducedMotionTransition(shouldReduce, {
                        duration: durations.quick,
                      })}
                      aria-label={`Insert ${emoji}`}
                      className="flex items-center justify-center h-8 rounded-lg text-lg hover:bg-[#FFF0EE] focus:outline-none focus:ring-2 focus:ring-[#3E6B5C]/30 transition-colors"
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
