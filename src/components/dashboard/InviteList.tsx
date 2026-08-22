"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { springs, durations, easings, staggers } from "@/lib/motion";
import InviteCard from "@/components/dashboard/InviteCard";

type Invite = {
  id: string;
  slug: string;
  title: string;
  theme: string;
  view_count: number;
  response_count: number;
  rsvp_count?: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  reveal_type: "tap" | "countdown";
  accept_contributions?: boolean;
  revealed_at?: string | null;
  countdown_date?: string | null;
};

interface InviteListProps {
  invites: Invite[];
  creatorName?: string;
  tier?: "free" | "plus" | "unlimited";
}

// Container orchestrates stagger; children inherit the delay automatically.
const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: staggers.support,
    },
  },
};

// Variant-as-function: `custom` prop carries the original index.
// Index 0 (lead): heavier spring settle + slight scale compression.
// Index 1+ (support/detail): lighter ease entrance, no scale.
const cardVariants = {
  hidden: (i: number) => ({
    opacity: 0,
    y: i === 0 ? 12 : 6,
    scale: i === 0 ? 0.97 : 1,
  }),
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition:
      i === 0
        ? springs.soft
        : { duration: durations.base, ease: easings.entrance },
  }),
};

// Reduced-motion variant: opacity only, instant.
const reducedCardVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: durations.instant },
  },
};

// Exit animation for deleted cards.
const cardExitNormal = {
  opacity: 0,
  scale: 0.95,
  y: -4,
  transition: { duration: durations.quick, ease: easings.exit },
};
const cardExitReduced = {
  opacity: 0,
  transition: { duration: durations.instant },
};

export default function InviteList({ invites, creatorName, tier = "free" }: InviteListProps) {
  const shouldReduce = useReducedMotion();
  const router = useRouter();
  // Track cards being removed for optimistic exit animation.
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  // Original index in the full list (before any removals) used for entrance stagger role.
  const originalIndexMap = new Map(invites.map((inv, i) => [inv.id, i]));

  const visible = invites.filter((inv) => !removingIds.has(inv.id));

  function handleDelete(id: string) {
    setRemovingIds((prev) => new Set([...prev, id]));
    router.refresh();
  }

  return (
    // The mockup's `#slist` — hairline-separated rows inside the panel, not a
    // card grid (tadaaaa-editorial.html:1038-1050).
    <motion.div
      className="ed-srow-list"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <AnimatePresence mode="popLayout">
        {visible.map((invite) => {
          const origIdx = originalIndexMap.get(invite.id) ?? 0;
          return (
            <motion.div
              key={invite.id}
              custom={origIdx}
              variants={shouldReduce ? reducedCardVariants : cardVariants}
              exit={shouldReduce ? cardExitReduced : cardExitNormal}
              transition={springs.soft}
            >
              <InviteCard
                invite={invite}
                creatorName={creatorName}
                tier={tier}
                onDelete={() => handleDelete(invite.id)}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}
