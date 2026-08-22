import AuthForm from "@/components/auth/AuthForm";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col items-center px-6 py-14">
      <Link href="/" className="font-heading text-xl text-ink mb-10">
        TaDaaaa<span className="text-coral">.</span>
      </Link>

      <AuthForm mode="signup" />

      <p className="text-xs text-stone mt-8 text-center max-w-[320px]">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="underline hover:text-ink transition-colors">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline hover:text-ink transition-colors">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
