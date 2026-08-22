import { type Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { ContributeForm } from "@/components/contribute/ContributeForm";

interface Props {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = {
  title: "Add to the surprise · TaDaaaa",
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

  // Mockup `.contribw` (L510-512): 480px rail, 48px top / 110px bottom.
  return (
    <main className="min-h-screen bg-paper">
      <header className="sticky top-0 z-40 border-b border-mist bg-paper px-5 py-3.5">
        <div className="mx-auto max-w-[1080px]">
          <Link href="/" className="font-heading text-xl tracking-[-0.01em] text-ink">
            TaDaaaa<span className="text-coral">.</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[480px] px-6 pt-12 pb-[110px]">
        <h1 className="font-heading text-[26px] leading-tight text-ink">
          You&rsquo;re invited to add to &ldquo;{invite.title}&rdquo;.
        </h1>
        <p className="mt-1.5 mb-7 text-sm text-stone">
          No account needed. Just your words, and a photo if you have one.
        </p>

        <ContributeForm slug={slug} />
      </div>
    </main>
  );
}
