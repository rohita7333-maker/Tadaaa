"use client";

import Link from "next/link";
import { Download, Lock } from "lucide-react";

interface Props {
  slug: string;
  /** Owner tier allows designer art (plus/unlimited). */
  canUse: boolean;
  variant?: "full" | "compact";
  /** "art" = 1200×1500 invite card (D1 default); "story" = 1080×1920 vertical (D3). */
  type?: "art" | "story";
}

const CONFIG = {
  art: {
    href: (slug: string) => `/api/invite/${slug}/art`,
    label: "Download designer invite",
    lockedLabel: "Unlock designer invites — go Pro",
  },
  story: {
    href: (slug: string) => `/api/invite/${slug}/story`,
    label: "Download story (1080×1920)",
    lockedLabel: "Unlock story export — go Pro",
  },
} as const;

/**
 * Designer invite art / story control (D1 / D3).
 * Paid → download link to the server-rendered image route.
 * Free → locked tile linking to /pricing.
 */
export function DesignerArtButton({
  slug,
  canUse,
  variant = "full",
  type = "art",
}: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full font-medium transition";
  const size = variant === "compact" ? "px-3 py-1.5 text-sm" : "px-5 py-2.5";
  const cfg = CONFIG[type];

  if (canUse) {
    return (
      <Link
        href={cfg.href(slug)}
        download
        className={`${base} ${size} bg-[#C4686D] text-white hover:bg-[#a8555a]`}
      >
        <Download className="w-4 h-4" />
        {cfg.label}
      </Link>
    );
  }

  return (
    <Link
      href="/pricing"
      className={`${base} ${size} bg-[#F1E3DA] text-[#6B5E57] hover:bg-[#e9d6ca]`}
    >
      <Lock className="w-4 h-4" />
      {cfg.lockedLabel}
    </Link>
  );
}
