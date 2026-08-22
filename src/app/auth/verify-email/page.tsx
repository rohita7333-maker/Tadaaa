import Link from "next/link";

export const metadata = {
  title: "Check your inbox — TaDaaaa",
};

// Class strings are inlined rather than imported from AuthForm: this is a
// Server Component, and AuthForm is a "use client" module.
export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col items-center px-6 py-14">
      <Link href="/" className="font-heading text-xl text-ink mb-10">
        TaDaaaa<span className="text-coral">.</span>
      </Link>

      <div className="w-full max-w-[400px] bg-paper border border-mist rounded-[var(--r-md)] px-9 py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone">
          One more step
        </p>
        <h1 className="text-[26px] mt-1 mb-1">Check your inbox</h1>
        <p className="text-sm mb-[26px]">
          We sent a link to confirm your email. Open it and you&apos;ll be signed
          in automatically — usually under a minute.
        </p>

        <p className="text-[13px] text-stone mb-[26px]">
          Didn&apos;t get it? Check spam, or try the{" "}
          <Link
            href="/auth/signin"
            className="text-coral-deep font-semibold hover:underline"
          >
            magic link sign-in
          </Link>
          .
        </p>

        <Link
          href="/auth/signin"
          className="inline-flex items-center justify-center gap-2 w-full min-h-[44px] px-[30px] py-[14px] rounded-full text-[13px] font-semibold uppercase tracking-[0.08em] bg-paper border border-mist text-ink hover:border-ink transition-[transform,box-shadow,border-color] duration-[180ms] ease-out active:scale-[0.98]"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
