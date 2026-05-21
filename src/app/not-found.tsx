import Link from "next/link";
import { Heart, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="font-heading text-8xl text-[#C4686D]/20 mb-4">404</div>
        <div className="w-14 h-14 rounded-2xl bg-[#C4686D]/10 flex items-center justify-center mx-auto mb-6">
          <Heart className="w-7 h-7 text-[#C4686D]" />
        </div>
        <h1 className="font-heading text-3xl text-[#2D2926] mb-3">
          This page doesn&apos;t exist
        </h1>
        <p className="text-[#6B5E57] text-sm mb-8 leading-relaxed">
          Maybe the surprise you&apos;re looking for has expired, or the link was typed wrong.
        </p>
        <Link
          href="/"
          className="inline-flex items-center h-11 px-6 rounded-xl bg-gradient-to-r from-[#C4686D] to-[#9B3D42] text-white font-semibold text-sm transition-all hover:scale-[1.02]"
        >
          <Home className="w-4 h-4 mr-2" />
          Back to TaDaaaa
        </Link>
      </div>
    </div>
  );
}
