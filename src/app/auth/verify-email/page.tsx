import Link from "next/link";
import { Mail, Heart } from "lucide-react";

export const metadata = {
  title: "Check your inbox — TaDaaaa",
};

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-[#FFF8F0] flex flex-col">
      <header className="px-6 py-4 border-b border-[#D4CBC3]/40 bg-white/80 backdrop-blur-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#C4686D] to-[#9B3D42] flex items-center justify-center">
              <Heart className="w-4 h-4 fill-white text-white" />
            </div>
            <span className="font-heading text-lg text-[#2D2926]">TaDaaaa</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center bg-white rounded-3xl p-10 border border-[#D4CBC3]/40 shadow-[0_4px_24px_rgba(45,41,38,0.06)]">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#FFF0E8] to-[#F5EDE3] flex items-center justify-center">
            <Mail className="w-7 h-7 text-[#C4686D]" />
          </div>
          <h1 className="font-heading text-2xl text-[#2D2926] mb-3">
            Check your inbox
          </h1>
          <p className="text-[#6B5E57] text-sm leading-relaxed mb-6">
            We&apos;ve sent you a link to confirm your email. Open it and you&apos;ll
            be signed in automatically — usually under a minute.
          </p>
          <p className="text-xs text-[#6B5E57] mb-8">
            Didn&apos;t get it? Check spam, or try the{" "}
            <Link href="/auth/signin" className="text-[#C4686D] hover:underline font-medium">
              email link sign-in
            </Link>
            .
          </p>
          <Link
            href="/auth/signin"
            className="inline-flex items-center justify-center w-full h-12 rounded-2xl border border-[#D4CBC3] text-[#2D2926] hover:bg-[#FFF8F0] font-medium transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
