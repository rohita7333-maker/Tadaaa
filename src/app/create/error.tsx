"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";

export default function CreateError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[create] route error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center bg-white rounded-3xl p-10 border border-[#D4CBC3]/40 shadow-[0_4px_24px_rgba(45,41,38,0.06)]">
        <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-amber-50 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
        </div>
        <h2 className="font-heading text-xl text-[#2D2926] mb-2">
          The create flow hit a snag
        </h2>
        <p className="text-[#6B5E57] text-sm leading-relaxed mb-6">
          Your draft isn&apos;t lost — try again. If it keeps happening, head
          back to the dashboard and start fresh.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-2xl bg-gradient-to-r from-[#C4686D] to-[#9B3D42] text-white text-sm font-semibold hover:from-[#9B3D42] hover:to-[#C4686D] transition-all"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center h-11 px-6 rounded-2xl border border-[#D4CBC3] text-[#2D2926] text-sm font-medium hover:bg-[#FFF8F0]"
          >
            Back to dashboard
          </Link>
        </div>
        {error.digest && (
          <p className="text-[10px] text-[#6B5E57] mt-6 opacity-60">
            Reference: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
