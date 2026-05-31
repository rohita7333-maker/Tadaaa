import { type Metadata } from "next";
import Link from "next/link";
import { Heart, Sparkles, Gift, Camera, MessageCircleHeart } from "lucide-react";
import Navbar from "@/components/landing/Navbar";

export const metadata: Metadata = {
  title: "About — TaDaaaa",
  description: "TaDaaaa turns your photos and messages into magical surprise experiences your loved ones will never forget.",
};

const steps = [
  {
    icon: Camera,
    title: "Upload your photos",
    description: "Pick your favorite moments together — up to 8 photos per surprise.",
  },
  {
    icon: MessageCircleHeart,
    title: "Write your message",
    description: "Add a heartfelt message that appears after the big reveal.",
  },
  {
    icon: Gift,
    title: "Choose a reveal style",
    description: "Tap-to-reveal or countdown timer — pick what fits the moment.",
  },
  {
    icon: Sparkles,
    title: "Share the magic",
    description: "Send the link via WhatsApp, text, or any way you like. Watch them smile.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <Navbar />
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-24 pb-16 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-[#C4686D]/5 to-transparent" />
        <div className="relative max-w-2xl mx-auto">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#C4686D] to-[#9B3D42] flex items-center justify-center shadow-lg shadow-[#C4686D]/20">
            <Heart className="w-8 h-8 fill-white text-white" />
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl text-[#2D2926] mb-4">
            Surprises made simple
          </h1>
          <p className="text-lg text-[#6B5E57] leading-relaxed max-w-lg mx-auto">
            TaDaaaa turns your photos and messages into magical experiences
            your loved ones will never forget.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-heading text-2xl text-[#2D2926] text-center mb-12">
            How it works
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {steps.map((step, i) => (
              <div
                key={i}
                className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(45,41,38,0.06)] border border-[#D4CBC3]/30"
              >
                <div className="w-10 h-10 rounded-xl bg-[#FFF0E8] flex items-center justify-center mb-4">
                  <step.icon className="w-5 h-5 text-[#C4686D]" />
                </div>
                <h3 className="font-heading text-lg text-[#2D2926] mb-2">{step.title}</h3>
                <p className="text-sm text-[#6B5E57] leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="px-6 pb-20">
        <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 sm:p-10 shadow-[0_4px_24px_rgba(45,41,38,0.06)] border border-[#D4CBC3]/30 text-center">
          <h2 className="font-heading text-2xl text-[#2D2926] mb-4">Why we built this</h2>
          <p className="text-[#6B5E57] leading-relaxed mb-4">
            We believe the best gifts aren&apos;t things — they&apos;re moments. A birthday message
            that makes someone cry-laugh, an anniversary reveal that brings back all the memories,
            an apology that shows you really care.
          </p>
          <p className="text-[#6B5E57] leading-relaxed">
            TaDaaaa gives you the tools to create those moments in minutes, no design skills needed.
            Just your photos, your words, and a little bit of magic.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-24 text-center">
        <Link
          href="/create"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-[#C4686D] to-[#9B3D42] text-white px-8 py-4 rounded-full font-semibold text-lg hover:opacity-90 transition-opacity shadow-lg shadow-[#C4686D]/25"
        >
          <Heart className="w-5 h-5 fill-white" />
          Create your first surprise
        </Link>
        <p className="text-sm text-[#6B5E57] mt-4">Free to start. No credit card required.</p>
      </section>
    </div>
  );
}
