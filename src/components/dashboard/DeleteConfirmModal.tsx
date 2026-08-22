"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { springs, durations, makeReducedMotionTransition } from "@/lib/motion";

interface DeleteConfirmModalProps {
  open: boolean;
  title: string;
  deleting?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * In-app delete confirmation — replaces the native window.confirm() dialog so
 * the destructive moment stays inside TaDaaaa's warm visual language. Closes on
 * Escape or backdrop click; confirm button carries the rose "danger" weight.
 */
export default function DeleteConfirmModal({
  open,
  title,
  deleting = false,
  onConfirm,
  onClose,
}: DeleteConfirmModalProps) {
  const shouldReduce = useReducedMotion();
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Escape to dismiss + focus the safe (cancel) path on open.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !deleting) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, deleting, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: durations.quick }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-ink/45 backdrop-blur-sm"
            onClick={() => !deleting && onClose()}
            aria-hidden
          />

          {/* Card */}
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="del-title"
            initial={shouldReduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
            transition={makeReducedMotionTransition(shouldReduce, springs.weighty)}
            className="relative w-full max-w-sm bg-paper rounded-[12px] border border-mist shadow-[0_24px_64px_rgba(26,26,26,0.24)] p-6"
          >
            <button
              onClick={() => !deleting && onClose()}
              aria-label="Close"
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-stone hover:bg-pebble hover:text-ink transition-colors"
            >
              <X className="w-4 h-4" strokeWidth={1.6} />
            </button>

            <h2 id="del-title" className="font-heading text-xl mb-2">
              Delete surprise?
            </h2>
            <p className="text-sm leading-relaxed mb-6">
              <span className="font-medium text-ink">“{title}”</span> — its link
              stops working immediately, and everything on it goes with it.
              There is no undo.
            </p>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={deleting}
                className="ed-btn ed-btn-line ed-btn-sm flex-1"
              >
                Keep it
              </button>
              <button
                type="button"
                ref={confirmRef}
                onClick={onConfirm}
                disabled={deleting}
                className="ed-btn ed-btn-coral ed-btn-sm flex-1"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
