"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";

export default function SurpriseError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[surprise] route error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center px-6 text-center">
      <span className="text-6xl mb-6">💌</span>
      <h1 className="font-heading text-3xl text-[#1A1B18] mb-3">
        Hmm, this surprise didn&apos;t open
      </h1>
      <p className="text-[#6F6E68] mb-8 max-w-sm">
        Something glitched while opening this page. Try again — if it keeps
        failing, ask the sender to check the link.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-[#3E6B5C] to-[#2E5145] text-white px-6 py-3 rounded-full font-medium hover:opacity-90"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium border border-[#E9E6DF] text-[#1A1B18] hover:bg-white"
        >
          <Heart className="w-4 h-4" />
          Visit TaDaaaa
        </Link>
      </div>
    </div>
  );
}
