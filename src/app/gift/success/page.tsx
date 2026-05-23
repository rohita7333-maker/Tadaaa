import Link from "next/link";
import { Heart, Gift, CheckCircle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gift Sent — TaDaaaa",
};

interface GiftSuccessPageProps {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function GiftSuccessPage({ searchParams }: GiftSuccessPageProps) {
  // We don't expose session details to the client for security;
  // the webhook handler already recorded the gift and sent the email.
  void searchParams; // acknowledged but not used (idempotency handled server-side)

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-12 group">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C4686D] to-[#9B3D42] flex items-center justify-center group-hover:scale-105 transition-transform">
          <Heart className="w-5 h-5 fill-white text-white" />
        </div>
        <span className="font-heading text-xl text-[#2D2926]">TaDaaaa</span>
      </Link>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-[0_4px_24px_rgba(45,41,38,0.08)] border border-[#D4CBC3]/30 p-10 text-center">
        {/* Icon */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FFF0E8] to-[#FFE4D6] flex items-center justify-center">
              <Gift className="w-9 h-9 text-[#C4686D]" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#5aaa69] flex items-center justify-center">
              <CheckCircle className="w-4 h-4 fill-white text-white" />
            </div>
          </div>
        </div>

        <h1 className="font-heading text-3xl text-[#2D2926] mb-3">Gift sent! 🎁</h1>
        <p className="text-[#6B5E57] text-base leading-relaxed mb-8">
          We&apos;ve sent the gift email. Your recipient will get a magic link to redeem their free TaDaaaa invite and create their own surprise.
        </p>

        <div className="bg-[#FFF8F0] rounded-2xl p-5 mb-8 border border-[#E8DDD4]/60">
          <p className="text-sm text-[#6B5E57] leading-relaxed">
            <strong className="text-[#2D2926]">What happens next?</strong>
            <br />
            They&apos;ll receive an email with a link to claim their invite. Links expire after 90 days.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/create"
            className="h-12 rounded-2xl bg-gradient-to-r from-[#C4686D] to-[#9B3D42] text-white font-semibold text-sm flex items-center justify-center hover:from-[#9B3D42] hover:to-[#C4686D] transition-all duration-300 shadow-md shadow-[#C4686D]/20"
          >
            Create your own surprise
          </Link>
          <Link
            href="/"
            className="h-12 rounded-2xl border border-[#D4CBC3]/60 text-[#6B5E57] font-medium text-sm flex items-center justify-center hover:bg-[#FFF0E8] transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
