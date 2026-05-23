import { redirect } from "next/navigation";
import Link from "next/link";
import { Heart, Gift, AlertCircle } from "lucide-react";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Redeem Gift — TaDaaaa",
};

interface GiftRedeemPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function GiftRedeemPage({ searchParams }: GiftRedeemPageProps) {
  const { token } = await searchParams;

  if (!token) {
    return <InvalidToken reason="No token provided." />;
  }

  const adminSupabase = createAdminClient();

  // Look up the gift by redeem_token
  const { data: gift, error } = await adminSupabase
    .from("gift_purchases")
    .select("id, status, expires_at, recipient_email")
    .eq("redeem_token", token)
    .maybeSingle();

  if (error || !gift) {
    return <InvalidToken reason="This gift link is invalid or has already been redeemed." />;
  }

  if (gift.status !== "pending") {
    return (
      <InvalidToken
        reason={
          gift.status === "redeemed"
            ? "This gift has already been redeemed."
            : "This gift link has expired."
        }
      />
    );
  }

  if (new Date(gift.expires_at) < new Date()) {
    // Mark expired
    await adminSupabase
      .from("gift_purchases")
      .update({ status: "expired" })
      .eq("id", gift.id);
    return <InvalidToken reason="This gift link has expired (90-day limit)." />;
  }

  // Check if user is logged in
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Redirect to signup; after signup, Next Auth redirects back here
    const next = encodeURIComponent(`/gift/redeem?token=${token}`);
    redirect(`/auth/signup?next=${next}`);
  }

  // User is logged in — atomically mark gift as redeemed.
  // Using .eq("status", "pending") on the UPDATE (not just the SELECT) closes
  // the TOCTOU window: if a concurrent request redeemed it between our SELECT
  // and this UPDATE, count will be 0 and we show the already-redeemed message.
  const { data: updatedRows } = await adminSupabase
    .from("gift_purchases")
    .update({
      status: "redeemed",
      redeemed_by: user.id,
      redeemed_at: new Date().toISOString(),
    })
    .eq("id", gift.id)
    .eq("status", "pending") // atomic guard — only succeeds if still pending
    .select("id");

  if (!updatedRows || updatedRows.length !== 1) {
    // Another request redeemed this gift in the race window.
    return <InvalidToken reason="This gift has already been redeemed." />;
  }

  // Redirect to /create with gift_id so the create flow can bypass tier check
  redirect(`/create?gift=${gift.id}`);
}

function InvalidToken({ reason }: { reason: string }) {
  return (
    <div className="min-h-screen bg-[#FFF8F0] flex flex-col items-center justify-center px-6">
      <Link href="/" className="flex items-center gap-2 mb-12 group">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C4686D] to-[#9B3D42] flex items-center justify-center group-hover:scale-105 transition-transform">
          <Heart className="w-5 h-5 fill-white text-white" />
        </div>
        <span className="font-heading text-xl text-[#2D2926]">TaDaaaa</span>
      </Link>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-[0_4px_24px_rgba(45,41,38,0.08)] border border-[#D4CBC3]/30 p-10 text-center">
        <div className="flex items-center justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-[#FFF0E8] flex items-center justify-center">
            <AlertCircle className="w-9 h-9 text-[#C4686D]" />
          </div>
        </div>

        <h1 className="font-heading text-2xl text-[#2D2926] mb-3">Gift link issue</h1>
        <p className="text-[#6B5E57] text-base leading-relaxed mb-8">{reason}</p>

        <div className="flex flex-col gap-3">
          <Link
            href="/pricing"
            className="h-12 rounded-2xl bg-gradient-to-r from-[#C4686D] to-[#9B3D42] text-white font-semibold text-sm flex items-center justify-center hover:from-[#9B3D42] hover:to-[#C4686D] transition-all duration-300 shadow-md shadow-[#C4686D]/20"
          >
            <Gift className="w-4 h-4 mr-2" />
            Browse plans
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
