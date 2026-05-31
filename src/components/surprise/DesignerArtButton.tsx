"use client";

import Link from "next/link";
import { Download, Lock } from "lucide-react";

interface Props {
  slug: string;
  /** Owner tier allows designer art (plus/unlimited). */
  canUse: boolean;
  variant?: "full" | "compact";
}

/**
 * Designer invite art control (D1).
 * Paid → download link to the server-rendered art route.
 * Free → locked tile linking to /pricing. The locked state is the upsell:
 * non-paid owners see the feature advertised on their own dashboard.
 */
export function DesignerArtButton({ slug, canUse, variant = "full" }: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full font-medium transition";
  const size = variant === "compact" ? "px-3 py-1.5 text-sm" : "px-5 py-2.5";

  if (canUse) {
    return (
      <Link
        href={`/api/invite/${slug}/art`}
        download
        className={`${base} ${size} bg-[#C4686D] text-white hover:bg-[#a8555a]`}
      >
        <Download className="w-4 h-4" />
        Download designer invite
      </Link>
    );
  }

  return (
    <Link
      href="/pricing"
      className={`${base} ${size} bg-[#F1E3DA] text-[#6B5E57] hover:bg-[#e9d6ca]`}
    >
      <Lock className="w-4 h-4" />
      Unlock designer invites — go Pro
    </Link>
  );
}
