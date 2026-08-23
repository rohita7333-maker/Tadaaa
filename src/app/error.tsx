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
    <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-[#3E6B5C]/10 flex items-center justify-center mx-auto mb-6">
          <Heart className="w-8 h-8 text-[#3E6B5C]" />
        </div>
        <h1 className="font-heading text-3xl text-[#1A1B18] mb-3">
          Oops! Something broke
        </h1>
        <p className="text-[#6F6E68] text-sm mb-8 leading-relaxed">
          Don&apos;t worry — your surprises are safe. This is just a temporary hiccup.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center h-11 px-6 rounded-xl bg-gradient-to-r from-[#3E6B5C] to-[#2E5145] text-white font-semibold text-sm transition-all hover:scale-[1.02]"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center h-11 px-6 rounded-xl border border-[#E9E6DF] text-[#1A1B18] text-sm font-medium hover:bg-white transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
