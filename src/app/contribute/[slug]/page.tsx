import { type Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Heart } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { ContributeForm } from "@/components/contribute/ContributeForm";

interface Props {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = {
  title: "Add to the surprise — TaDaaaa",
  robots: "noindex",
};

export default async function ContributePage({ params }: Props) {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data: invite } = await supabase
    .from("invites")
    .select("id, title, accept_contributions, is_active, expires_at")
    .eq("slug", slug)
    .maybeSingle();

  // 404 if the invite doesn't exist OR the owner hasn't opened it up for
  // contributions. The condition mirrors the API route so a forged link
  // can't trick the form into showing. invites has no `status` column
  // (split-brain schema retired) — gate on is_active + expires_at.
  const isExpired = invite?.expires_at && new Date(invite.expires_at) < new Date();
  if (!invite || !invite.accept_contributions || !invite.is_active || isExpired) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#FFF8F0] flex items-start justify-center px-6 py-12">
      <div className="max-w-md w-full">
        <Link href="/" className="inline-flex items-center gap-2 mb-8">
          <Heart className="w-5 h-5 fill-[#C4686D] text-[#C4686D]" />
          <span className="font-heading text-lg text-[#2D2926]">TaDaaaa</span>
        </Link>

        <h1 className="font-heading text-3xl text-[#2D2926]">
          Add to &ldquo;{invite.title}&rdquo;
        </h1>
        <p className="mt-2 text-[#6B5E57] text-sm">
          Drop a photo or short message — it&apos;ll appear in the reveal.
        </p>

        <ContributeForm slug={slug} />
      </div>
    </main>
  );
}
