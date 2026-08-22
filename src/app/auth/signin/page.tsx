import AuthForm from "@/components/auth/AuthForm";
import Link from "next/link";

interface SignInPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { next } = await searchParams;
  return (
    <div className="min-h-screen bg-paper flex flex-col items-center px-6 py-14">
      <Link href="/" className="font-heading text-xl text-ink mb-10">
        TaDaaaa<span className="text-coral">.</span>
      </Link>

      <AuthForm mode="signin" next={next} />

      <p className="text-xs text-stone mt-8 text-center max-w-[320px]">
        By signing in you agree to our{" "}
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
