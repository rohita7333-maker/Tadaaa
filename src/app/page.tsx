import Hero from "@/components/landing/Hero";
import TemplateShowcase from "@/components/landing/TemplateShowcase";
import HowItWorks from "@/components/landing/HowItWorks";
import Testimonials from "@/components/landing/Testimonials";
import Footer from "@/components/landing/Footer";
import Navbar from "@/components/landing/Navbar";
import LandingShell from "@/components/landing/LandingShell";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Heart, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

async function getLandingStats() {
  try {
    const supabase = await createClient();
    const { count } = await supabase
      .from("invites")
      .select("*", { count: "exact", head: true });
    return { surprises: count ?? 0 };
  } catch {
    return { surprises: 0 };
  }
}

export default async function LandingPage() {
  // Logged-in users clicking the logo (e.g. from /pricing) should land on their
  // dashboard, not the marketing page with a misleading "Sign in" CTA. Session
  // is intact here — the landing Navbar is just auth-unaware.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  const { surprises } = await getLandingStats();
  return (
    <LandingShell>
      <Navbar />
      <Hero surpriseCount={surprises} />
      <TemplateShowcase />
      <HowItWorks />
      <Testimonials />

      {/* Final CTA */}
      <section className="py-28 px-6 relative overflow-hidden">
        {/* Dark warm background */}
        <div className="absolute inset-0 bg-[#2D2926]" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 30% 50%, rgba(196,104,109,0.25) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(201,169,110,0.15) 0%, transparent 60%)",
          }}
        />

        {/* Floating emoji decorations */}
        <div className="absolute top-12 left-12 text-3xl opacity-30 rotate-12">🎊</div>
        <div className="absolute top-16 right-16 text-2xl opacity-25 -rotate-6">✨</div>
        <div className="absolute bottom-12 left-20 text-2xl opacity-20 rotate-6">❤️</div>
        <div className="absolute bottom-16 right-12 text-3xl opacity-25 -rotate-12">🎁</div>

        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#C4686D]/20 border border-[#C4686D]/30 flex items-center justify-center mx-auto mb-8">
            <Heart className="w-8 h-8 fill-[#C4686D] text-[#C4686D]" />
          </div>
          <h2 className="font-heading text-5xl md:text-6xl text-white mb-6 leading-tight">
            Ready to make
            <br />
            <span className="text-gradient">someone&apos;s day?</span>
          </h2>
          <p className="text-white/60 text-lg mb-10 leading-relaxed">
            Free to start. No credit card required.
            <br />
            Create your first surprise in under 3 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center h-14 px-10 rounded-2xl bg-gradient-to-r from-[#C4686D] to-[#9B3D42] hover:from-[#9B3D42] hover:to-[#C4686D] text-white font-semibold text-base transition-all duration-300 hover:scale-[1.02] pulse-glow shadow-xl shadow-[#C4686D]/30"
            >
              Create a surprise — free
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center h-14 px-10 rounded-2xl border border-white/20 text-white/80 hover:bg-white/10 text-base transition-all duration-300 font-medium"
            >
              <Sparkles className="w-4 h-4 mr-2 text-[#C9A96E]" />
              See pricing
            </Link>
          </div>
          <p className="text-white/30 text-xs mt-8">
            Loved by 12,400+ people who made someone&apos;s day unforgettable
          </p>
        </div>
      </section>

      <Footer />
    </LandingShell>
  );
}
