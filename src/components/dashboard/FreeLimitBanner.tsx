"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

interface FreeLimitBannerProps {
  used: number;
  limit: number;
}

/**
 * Free-tier upsell, shown once the monthly limit is hit.
 *
 * Wears the mockup's `.resume` strip (tadaaaa-editorial.html:257-259): sand
 * border on a pebble ground, one line of copy, one action. The old version's
 * infinite breathing glow-ring is gone — a permanently pulsing banner is
 * exactly the "perpetual micro-interaction" the design rules ban, and this one
 * sits above the fold on every visit until the user pays.
 */
export default function FreeLimitBanner({ used, limit }: FreeLimitBannerProps) {
  const shouldReduce = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="ed-resume"
    >
      <p>
        You&apos;ve used all {limit} free surprise{limit !== 1 ? "s" : ""} this
        month. Upgrade for unlimited surprises that never expire.
      </p>
      <Link href="/pricing" className="ed-btn ed-btn-coral ed-btn-sm">
        Upgrade
      </Link>

      <span className="sr-only">
        {used} of {limit} monthly free surprises used.
      </span>
    </motion.div>
  );
}
