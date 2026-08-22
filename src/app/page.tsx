import Link from "next/link";
import { redirect } from "next/navigation";

import LandingShell from "@/components/landing/LandingShell";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import TemplateShowcase from "@/components/landing/TemplateShowcase";
import PerfectFor from "@/components/landing/PerfectFor";
import HowItWorks from "@/components/landing/HowItWorks";
import RevealStyles from "@/components/landing/RevealStyles";
import OnePlace from "@/components/landing/OnePlace";
import Testimonials from "@/components/landing/Testimonials";
import Examples from "@/components/landing/Examples";
import ThemeRow from "@/components/landing/ThemeRow";
import OccasionCards from "@/components/landing/OccasionCards";
import Support from "@/components/landing/Support";
import Footer from "@/components/landing/Footer";
import { SEC, IN, BTN, BTN_LG, BTN_CORAL } from "@/components/landing/editorial";
import { createClient } from "@/lib/supabase/server";

export default async function LandingPage() {
  // Logged-in users clicking the logo (e.g. from /pricing) should land on their
  // dashboard, not the marketing page with a misleading "Sign in" CTA. Session
  // is intact here — the landing Navbar is just auth-unaware.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <LandingShell>
      <Navbar />
      <Hero />
      <TemplateShowcase />
      <PerfectFor />
      <HowItWorks />
      <RevealStyles />
      <OnePlace />
      <Testimonials />
      <Examples />
      <ThemeRow />
      <OccasionCards />
      <Support />

      {/* Final CTA — mockup `.sec.inkbg.finalcta` */}
      <section
        aria-labelledby="final-cta-heading"
        className={`${SEC} bg-ink text-center`}
      >
        <div className={IN}>
          <h2
            id="final-cta-heading"
            className="text-[clamp(34px,5vw,48px)] text-paper"
          >
            Stop sending links that get buried.
          </h2>
          <p className="mt-3.5 mb-8 text-lg text-sand">
            Create a surprise they&apos;ll actually remember.
          </p>
          <Link
            href="/auth/signup"
            className={`${BTN} ${BTN_LG} ${BTN_CORAL}`}
          >
            Create your first surprise — free
          </Link>
        </div>
      </section>

      <Footer />
    </LandingShell>
  );
}
