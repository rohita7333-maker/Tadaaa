"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
            className="absolute inset-0 bg-[#1A1B18]/40 backdrop-blur-sm"
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
            className="relative w-full max-w-sm bg-white rounded-3xl border border-[#E9E6DF]/40 shadow-[0_24px_64px_rgba(26,27,24,0.24)] p-6 text-center"
          >
            <button
              onClick={() => !deleting && onClose()}
              aria-label="Close"
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-[#9B8E87] hover:bg-[#FAF9F6] hover:text-[#1A1B18] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-[#FFF0EE] flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-[#3E6B5C]" />
            </div>

            <h2 id="del-title" className="font-heading text-xl text-[#1A1B18] mb-2">
              Take down this surprise?
            </h2>
            <p className="text-sm text-[#6F6E68] leading-relaxed mb-6 px-1">
              <span className="font-medium text-[#1A1B18]">“{title}”</span> will
              disappear from your dashboard and its share link will stop working.
              This one&apos;s permanent — make sure you&apos;ve saved anything you
              want to keep. 💛
            </p>

            <div className="flex gap-3">
              <Button
                onClick={onClose}
                disabled={deleting}
                variant="outline"
                className="flex-1 h-11 rounded-full border-[#E9E6DF] text-[#1A1B18] hover:bg-[#FAF9F6] font-medium"
              >
                Keep it
              </Button>
              <Button
                ref={confirmRef}
                onClick={onConfirm}
                disabled={deleting}
                className="flex-1 h-11 rounded-full bg-gradient-to-r from-[#3E6B5C] to-[#2E5145] hover:from-[#2E5145] hover:to-[#3E6B5C] text-white font-medium shadow-md shadow-[#3E6B5C]/25"
              >
                {deleting ? "Deleting…" : "Yes, delete"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
