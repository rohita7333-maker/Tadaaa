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
          <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-[#D4CBC3]/60 shadow-[0_20px_60px_rgba(45,41,38,0.18)] p-5">
            <p
              id="cookie-consent-title"
              className="text-sm leading-relaxed text-[#2D2926]"
            >
              We use a sprinkle of cookies for analytics to make TaDaaaa better.
              No ads, ever.{" "}
              <Link
                href="/privacy"
                className="text-[#C4686D] underline underline-offset-2 hover:text-[#9B3D42] transition-colors"
              >
                Privacy policy
              </Link>
              .
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={deny}
                className="text-xs font-medium px-4 py-2 rounded-full text-[#6B5E57] hover:text-[#2D2926] hover:bg-[#FFF8F0] transition-colors"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={accept}
                className="text-xs font-semibold px-4 py-2 rounded-full bg-gradient-to-r from-[#C4686D] to-[#9B3D42] text-white hover:from-[#9B3D42] hover:to-[#C4686D] transition-all shadow-md shadow-[#C4686D]/25"
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
