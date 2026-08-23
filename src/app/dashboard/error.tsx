"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard] route error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center bg-white rounded-3xl p-10 border border-[#E9E6DF]/40 shadow-[0_4px_24px_rgba(26, 27, 24,0.06)]">
        <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-amber-50 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
        </div>
        <h2 className="font-heading text-xl text-[#1A1B18] mb-2">
          Couldn&apos;t load your dashboard
        </h2>
        <p className="text-[#6F6E68] text-sm leading-relaxed mb-6">
          Something went wrong on our side. Your surprises are safe — try again
          or head home.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-2xl bg-gradient-to-r from-[#3E6B5C] to-[#2E5145] text-white text-sm font-semibold hover:from-[#2E5145] hover:to-[#3E6B5C] transition-all"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center h-11 px-6 rounded-2xl border border-[#E9E6DF] text-[#1A1B18] text-sm font-medium hover:bg-[#FAF9F6]"
          >
            Back home
          </Link>
        </div>
        {error.digest && (
          <p className="text-[10px] text-[#6F6E68] mt-6 opacity-60">
            Reference: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
