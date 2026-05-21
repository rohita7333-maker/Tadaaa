import Link from "next/link";
import { Heart } from "lucide-react";

export const metadata = { title: "Privacy Policy — TaDaaaa" };

export default function PrivacyPage() {
  const updated = "May 7, 2026";

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <header className="bg-white border-b border-[#D4CBC3]/40 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <Heart className="w-5 h-5 fill-[#C4686D] text-[#C4686D]" />
            <span className="font-heading text-lg text-[#2D2926]">TaDaaaa</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="font-heading text-4xl text-[#2D2926] mb-2">Privacy Policy</h1>
        <p className="text-sm text-[#6B5E57] mb-10">Last updated: {updated}</p>

        <div className="prose prose-sm max-w-none text-[#2D2926] space-y-8">

          <section>
            <h2 className="font-heading text-2xl mb-3">1. What we collect</h2>
            <p className="text-[#6B5E57] leading-relaxed">
              We collect your email address when you sign up. When you create a surprise, we store your
              title, message, theme selection, photos you upload, and any custom questions you add.
              We also collect basic analytics such as how many times a surprise link was viewed.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl mb-3">2. How we use it</h2>
            <p className="text-[#6B5E57] leading-relaxed">
              Your data is used solely to operate the TaDaaaa service — to display your surprises to
              recipients, store your account settings, and process payments via Stripe. We do not sell
              your data to third parties. We do not use your content to train AI models.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl mb-3">3. Photos</h2>
            <p className="text-[#6B5E57] leading-relaxed">
              Photos you upload are stored securely in Supabase Storage and are only accessible via
              time-limited signed URLs. Free plan photos are accessible for 7 days per link;
              paid plans extend this. Photos are never shared beyond the surprise recipient.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl mb-3">4. Payments</h2>
            <p className="text-[#6B5E57] leading-relaxed">
              Payments are processed by Stripe. We never store your card details. Stripe&apos;s privacy
              policy applies to payment data.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl mb-3">5. Cookies</h2>
            <p className="text-[#6B5E57] leading-relaxed">
              We use only functional cookies required for authentication. We do not use tracking or
              advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl mb-3">6. Your rights</h2>
            <p className="text-[#6B5E57] leading-relaxed">
              You can delete your account and all associated data at any time from Settings → Danger
              zone. For any privacy requests, email us at{" "}
              <a href="mailto:hello@tadaaaa.app" className="text-[#C4686D] hover:underline">
                hello@tadaaaa.app
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl mb-3">7. Changes</h2>
            <p className="text-[#6B5E57] leading-relaxed">
              We may update this policy. Significant changes will be communicated via email. Continued
              use after changes constitutes acceptance.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
