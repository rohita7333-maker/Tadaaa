"use client";

import Link from "next/link";
import { Heart, RefreshCw } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-[#C4686D]/10 flex items-center justify-center mx-auto mb-6">
          <Heart className="w-8 h-8 text-[#C4686D]" />
        </div>
        <h1 className="font-heading text-3xl text-[#2D2926] mb-3">
          Oops! Something broke
        </h1>
        <p className="text-[#6B5E57] text-sm mb-8 leading-relaxed">
          Don&apos;t worry — your surprises are safe. This is just a temporary hiccup.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center h-11 px-6 rounded-xl bg-gradient-to-r from-[#C4686D] to-[#9B3D42] text-white font-semibold text-sm transition-all hover:scale-[1.02]"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center h-11 px-6 rounded-xl border border-[#D4CBC3] text-[#2D2926] text-sm font-medium hover:bg-white transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
