import Link from "next/link";
import { Heart, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="font-heading text-8xl text-[#3E6B5C]/20 mb-4">404</div>
        <div className="w-14 h-14 rounded-2xl bg-[#3E6B5C]/10 flex items-center justify-center mx-auto mb-6">
          <Heart className="w-7 h-7 text-[#3E6B5C]" />
        </div>
        <h1 className="font-heading text-3xl text-[#1A1B18] mb-3">
          This page doesn&apos;t exist
        </h1>
        <p className="text-[#6F6E68] text-sm mb-8 leading-relaxed">
          Maybe the surprise you&apos;re looking for has expired, or the link was typed wrong.
        </p>
        <Link
          href="/"
          className="inline-flex items-center h-11 px-6 rounded-xl bg-gradient-to-r from-[#3E6B5C] to-[#2E5145] text-white font-semibold text-sm transition-all hover:scale-[1.02]"
        >
          <Home className="w-4 h-4 mr-2" />
          Back to TaDaaaa
        </Link>
      </div>
    </div>
  );
}
