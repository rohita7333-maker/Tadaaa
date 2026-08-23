"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { makeReducedMotionTransition, durations } from "@/lib/motion";
import Link from "next/link";

const STORAGE_KEY = "tadaaaa.cookies";

export function CookieConsent() {
  // SSR + first client render = same output (closed). After mount, read
  // localStorage and conditionally open. Two-render pattern avoids
  // hydration mismatch.
  const [show, setShow] = useState(false);
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShow(window.localStorage.getItem(STORAGE_KEY) === null);
    } catch {
      // private mode / blocked storage — leave hidden.
    }
  }, []);

  function accept() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "ok");
      window.dispatchEvent(new Event("cookies.accepted"));
    } catch {}
    setShow(false);
  }

  function deny() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "denied");
    } catch {}
    setShow(false);
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="dialog"
          aria-labelledby="cookie-consent-title"
          className="fixed bottom-4 inset-x-4 md:left-auto md:right-4 md:max-w-md z-50"
          initial={shouldReduce ? { opacity: 0 } : { y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={shouldReduce ? { opacity: 0 } : { y: 24, opacity: 0 }}
          transition={makeReducedMotionTransition(shouldReduce, { type: "spring", stiffness: 280, damping: 26 }, { duration: durations.instant })}
        >
          <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-[#E9E6DF]/60 shadow-[0_20px_60px_rgba(26, 27, 24,0.18)] p-5">
            <p
              id="cookie-consent-title"
              className="text-sm leading-relaxed text-[#1A1B18]"
            >
              We use a sprinkle of cookies for analytics to make TaDaaaa better.
              No ads, ever.{" "}
              <Link
                href="/privacy"
                className="text-[#3E6B5C] underline underline-offset-2 hover:text-[#2E5145] transition-colors"
              >
                Privacy policy
              </Link>
              .
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={deny}
                className="text-xs font-medium px-4 py-2 rounded-full text-[#6F6E68] hover:text-[#1A1B18] hover:bg-[#FAF9F6] transition-colors"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={accept}
                className="text-xs font-semibold px-4 py-2 rounded-full bg-gradient-to-r from-[#3E6B5C] to-[#2E5145] text-white hover:from-[#2E5145] hover:to-[#3E6B5C] transition-all shadow-md shadow-[#3E6B5C]/25"
              >
                Accept
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
