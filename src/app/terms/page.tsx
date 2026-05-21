import Link from "next/link";
import { Heart } from "lucide-react";

export const metadata = { title: "Terms of Service — TaDaaaa" };

export default function TermsPage() {
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
        <h1 className="font-heading text-4xl text-[#2D2926] mb-2">Terms of Service</h1>
        <p className="text-sm text-[#6B5E57] mb-10">Last updated: {updated}</p>

        <div className="prose prose-sm max-w-none text-[#2D2926] space-y-8">

          <section>
            <h2 className="font-heading text-2xl mb-3">1. Acceptance</h2>
            <p className="text-[#6B5E57] leading-relaxed">
              By using TaDaaaa you agree to these terms. If you do not agree, please stop using the
              service.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl mb-3">2. Acceptable use</h2>
            <p className="text-[#6B5E57] leading-relaxed">
              TaDaaaa is for personal surprise messages between people who know each other. You may not
              use it to send harassment, explicit content, spam, or anything illegal. We reserve the
              right to remove content and suspend accounts that violate this policy.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl mb-3">3. Content</h2>
            <p className="text-[#6B5E57] leading-relaxed">
              You own the content you upload. By uploading photos or text, you grant TaDaaaa a limited
              licence to store and serve that content for the purpose of operating the service. You
              are responsible for ensuring you have rights to any content you upload.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl mb-3">4. Payments & refunds</h2>
            <p className="text-[#6B5E57] leading-relaxed">
              Paid plans are billed in advance. Subscriptions renew automatically until cancelled.
              Per-invite purchases are non-refundable once the invite is created. Subscriptions may be
              refunded within 7 days of purchase if no invites have been created under the paid plan.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl mb-3">5. Service availability</h2>
            <p className="text-[#6B5E57] leading-relaxed">
              We aim for high availability but make no uptime guarantees. We may modify or discontinue
              features with reasonable notice.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl mb-3">6. Limitation of liability</h2>
            <p className="text-[#6B5E57] leading-relaxed">
              TaDaaaa is provided as-is. We are not liable for indirect, incidental, or consequential
              damages arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl mb-3">7. Contact</h2>
            <p className="text-[#6B5E57] leading-relaxed">
              Questions about these terms?{" "}
              <a href="mailto:hello@tadaaaa.app" className="text-[#C4686D] hover:underline">
                hello@tadaaaa.app
              </a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
