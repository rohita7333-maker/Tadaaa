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
      {/* Not `.ed-panel`: that class flexes its heading into a two-column row,
          which is wrong for a centred error card. Same tokens, plain block. */}
      <div className="max-w-md w-full text-center bg-paper border border-mist rounded-[12px] p-10">
        <div className="w-14 h-14 mx-auto mb-5 rounded-[6px] bg-pebble flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-coral-deep" strokeWidth={1.6} />
        </div>
        <h2 className="font-heading text-xl mb-2">
          Couldn&apos;t load your dashboard
        </h2>
        <p className="text-sm leading-relaxed mb-6">
          Something went wrong on our side. Your surprises are safe — try again
          or head home.
        </p>
        <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
          <button onClick={() => reset()} className="ed-btn ed-btn-coral ed-btn-sm">
            <RotateCw className="w-3.5 h-3.5" strokeWidth={1.6} />
            Try again
          </button>
          <Link href="/" className="ed-btn ed-btn-line ed-btn-sm">
            Back home
          </Link>
        </div>
        {error.digest && (
          <p className="text-[10px] text-stone mt-6 opacity-70">
            Reference: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
