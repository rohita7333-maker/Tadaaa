import AuthForm from "@/components/auth/AuthForm";
import Link from "next/link";
import { Heart, Star } from "lucide-react";

const polaroids = [
  { rotate: "-6deg", top: "10%", left: "6%", emoji: "🎂", label: "Happy Birthday!" },
  { rotate: "5deg", top: "6%", right: "8%", emoji: "💍", label: "She said YES!" },
  { rotate: "-2deg", bottom: "30%", left: "4%", emoji: "🌸", label: "Mother's Day" },
  { rotate: "8deg", bottom: "24%", right: "5%", emoji: "🎉", label: "Surprise!!" },
];

interface SignInPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { next } = await searchParams;
  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[52%] relative bg-[#1A1B18] flex-col overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 20% 30%, rgba(62, 107, 92,0.3) 0%, transparent 55%), radial-gradient(ellipse at 80% 70%, rgba(138, 111, 53,0.2) 0%, transparent 55%)",
          }}
        />
        {polaroids.map((p, i) => (
          <div
            key={i}
            className="absolute bg-white shadow-2xl p-3 pb-8 w-32"
            style={{ transform: `rotate(${p.rotate})`, top: p.top, left: p.left, right: p.right, bottom: p.bottom, borderRadius: "4px" }}
          >
            <div className="w-full aspect-square bg-gradient-to-br from-[#FFF0E8] to-[#F1EFE9] rounded-sm flex items-center justify-center text-3xl">
              {p.emoji}
            </div>
            <p className="text-center text-[#4a4a4a] mt-2 leading-tight" style={{ fontFamily: "var(--font-caveat), cursive", fontSize: "13px" }}>
              {p.label}
            </p>
          </div>
        ))}
        <div className="relative z-10 flex flex-col justify-center items-center flex-1 px-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#3E6B5C]/20 border border-[#3E6B5C]/30 flex items-center justify-center mb-6">
            <Heart className="w-8 h-8 fill-[#3E6B5C] text-[#3E6B5C]" />
          </div>
          <h2 className="font-heading text-4xl text-white leading-tight mb-4">
            Turn moments
            <br />
            <span className="text-gradient">into magic</span>
          </h2>
          <p className="text-white/60 text-base leading-relaxed max-w-xs">
            Create stunning surprise pages your loved ones will never forget.
          </p>
          <div className="flex gap-8 mt-10">
            {[{ num: "10k+", label: "Surprises" }, { num: "98%", label: "Love it" }, { num: "3 min", label: "To create" }].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-bold text-white">{s.num}</p>
                <p className="text-white/50 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 px-10 pb-10">
          <div className="bg-white/8 border border-white/10 rounded-2xl p-5">
            <div className="flex gap-1 mb-3">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-[#8A6F35] text-[#8A6F35]" />)}
            </div>
            <p className="text-white/80 text-sm italic leading-relaxed">
              &ldquo;My mom literally cried happy tears. She said it was the most thoughtful gift she&apos;d ever received.&rdquo;
            </p>
            <p className="text-white/50 text-xs mt-3 font-medium">— Sarah M.</p>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-6 py-12">
        <Link href="/" className="flex items-center gap-2 mb-10 lg:hidden">
          <Heart className="w-5 h-5 fill-[#3E6B5C] text-[#3E6B5C]" />
          <span className="font-heading text-xl text-[#1A1B18]">TaDaaaa</span>
        </Link>
        <div className="hidden lg:flex items-center gap-2 self-start mb-10 w-full max-w-md">
          <Heart className="w-5 h-5 fill-[#3E6B5C] text-[#3E6B5C]" />
          <span className="font-heading text-xl text-[#1A1B18]">TaDaaaa</span>
        </div>
        <div className="w-full max-w-md">
          <AuthForm mode="signin" next={next} />
        </div>
        <p className="text-xs text-[#6F6E68]/60 mt-10 text-center max-w-xs">
          By signing in you agree to our{" "}
          <Link href="/terms" className="underline hover:text-[#3E6B5C] transition-colors">Terms</Link>{" "}and{" "}
          <Link href="/privacy" className="underline hover:text-[#3E6B5C] transition-colors">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
