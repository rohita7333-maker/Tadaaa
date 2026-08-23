"use client";

import Link from "next/link";
import { Download, Lock } from "lucide-react";
import type { StyleVariant } from "@/lib/designer-art";

interface Props {
  slug: string;
  /** Owner tier allows designer art (plus/unlimited). */
  canUse: boolean;
  variant?: "full" | "compact";
  /** "art" = 1200×1500 invite card (D1 default); "story" = 1080×1920 vertical (D3); "collage" = photo grid (D4). */
  type?: "art" | "story" | "collage";
  /** D5 style variant. Appended as ?style=<variant> (classic is the default and can be omitted). */
  style?: StyleVariant;
}

const CONFIG = {
  art: {
    base: (slug: string) => `/api/invite/${slug}/art`,
    label: "Download designer invite",
    lockedLabel: "Unlock designer invites — go Pro",
  },
  story: {
    base: (slug: string) => `/api/invite/${slug}/story`,
    label: "Download story (1080×1920)",
    lockedLabel: "Unlock story export — go Pro",
  },
  collage: {
    base: (slug: string) => `/api/invite/${slug}/collage`,
    label: "Download photo collage",
    lockedLabel: "Unlock photo collage — go Pro",
  },
} as const;

function buildHref(slug: string, type: "art" | "story" | "collage", style?: StyleVariant): string {
  const base = CONFIG[type].base(slug);
  // Omit style param when classic (the server default) to keep URLs clean.
  if (!style || style === "classic") return base;
  return `${base}?style=${style}`;
}

/**
 * Designer invite art / story / collage control (D1 / D3 / D4).
 * Paid → download link to the server-rendered image route.
 * Free → locked tile linking to /pricing.
 * Accepts a D5 style variant; appends ?style=<variant> to paid URLs.
 */
export function DesignerArtButton({
  slug,
  canUse,
  variant = "full",
  type = "art",
  style,
}: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full font-medium transition";
  const size = variant === "compact" ? "px-3 py-1.5 text-sm" : "px-5 py-2.5";
  const cfg = CONFIG[type];

  if (canUse) {
    return (
      <Link
        href={buildHref(slug, type, style)}
        download
        className={`${base} ${size} bg-[#3E6B5C] text-white hover:bg-[#a8555a]`}
      >
        <Download className="w-4 h-4" />
        {cfg.label}
      </Link>
    );
  }

  return (
    <Link
      href="/pricing"
      className={`${base} ${size} bg-[#F1E3DA] text-[#6F6E68] hover:bg-[#e9d6ca]`}
    >
      <Lock className="w-4 h-4" />
      {cfg.lockedLabel}
    </Link>
  );
}
