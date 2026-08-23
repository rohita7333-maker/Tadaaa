"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MagneticButton } from "@/components/ui/magnetic-button";

function computePasswordStrength(pwd: string): number {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return Math.min(4, score);
}

function PasswordStrengthMeter({ password }: { password: string }) {
  const shouldReduce = useReducedMotion();
  const strength = computePasswordStrength(password);
  const segments = [
    { color: "#DC6B6B", label: "Weak" },
    { color: "#E2A56B", label: "Fair" },
    { color: "#D4B85A", label: "Good" },
    { color: "#6B8F71", label: "Strong" },
  ];
  if (!password) return null;
  const activeLabel = strength > 0 ? segments[strength - 1].label : "";
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1.5">
        {segments.map((seg, i) => {
          const active = i < strength;
          return (
            <motion.div
              key={i}
              className="h-1 flex-1 rounded-full bg-[#E9E6DF]/40 overflow-hidden"
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: seg.color, originX: 0 }}
                initial={false}
                animate={{
                  scaleX: active ? 1 : 0,
                  opacity: active ? 1 : 0,
                }}
                transition={
                  shouldReduce
                    ? { duration: 0.15 }
                    : { type: "spring", stiffness: 240, damping: 22 }
                }
              />
            </motion.div>
          );
        })}
      </div>
      <p className="text-[10px] text-[#6F6E68] uppercase tracking-wider font-medium">
        {activeLabel}
      </p>
    </div>
  );
}
import { signIn, signUp, signInWithGoogle, signInWithMagicLink } from "@/actions/auth";
import { signInSchema, signUpSchema, type SignInValues, type SignUpValues } from "@/lib/schemas";
import { toast } from "sonner";

interface AuthFormProps {
  mode: "signin" | "signup";
  /** Where to land after auth completes — preserved from `?next=` on the page (e.g. /create?template=X). */
  next?: string;
}

export default function AuthForm({ mode, next }: AuthFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const isSignUp = mode === "signup";

  const {
    register,
    handleSubmit,
    getValues,
    watch,
    formState: { errors },
  } = useForm<SignUpValues | SignInValues>({
    resolver: zodResolver(isSignUp ? signUpSchema : signInSchema),
  });

  const watchedPassword = watch("password") || "";

  async function onSubmit(data: SignUpValues | SignInValues) {
    setLoading(true);
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => fd.append(k, v as string));
    if (next) fd.append("next", next);
    try {
      const result = (isSignUp ? await signUp(fd) : await signIn(fd)) as
        | { error?: string; success?: string }
        | undefined;
      if (result?.error) {
        toast.error(result.error);
      } else if (result?.success) {
        toast.success(result.success);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle(next);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
        setGoogleLoading(false);
      }
      // On success the server action calls redirect() which throws NEXT_REDIRECT
      // internally — the browser follows it automatically; we never reach here.
    } catch (err) {
      // Re-throw Next.js redirect "errors" so the browser can follow them.
      if (
        err &&
        typeof err === "object" &&
        "digest" in err &&
        typeof (err as { digest: unknown }).digest === "string" &&
        (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
      ) {
        throw err;
      }
      console.error("[auth] Google sign-in failed:", err);
      toast.error("Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  }

  async function handleMagicLink() {
    const email = (getValues("email") as string | undefined)?.trim();
    if (!email) {
      toast.error("Enter your email first");
      return;
    }
    setMagicLinkLoading(true);
    try {
      const fd = new FormData();
      fd.append("email", email);
      if (next) fd.append("next", next);
      const result = await signInWithMagicLink(fd);
      if (result.error) toast.error(result.error);
      else if (result.success) toast.success(result.success);
    } catch (err) {
      console.error("[auth] Magic link failed:", err);
      toast.error("Could not send link. Please try again.");
    } finally {
      setMagicLinkLoading(false);
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl text-[#1A1B18]">
          {isSignUp ? "Create your account" : "Welcome back"}
        </h1>
        <p className="text-[#6F6E68] text-sm mt-1.5">
          {isSignUp
            ? "Start crafting beautiful surprises in minutes"
            : "Sign in to continue creating magic"}
        </p>
      </div>

      {/* Google */}
      <Button
        type="button"
        variant="outline"
        className="w-full h-12 rounded-2xl border-[#E9E6DF] text-[#1A1B18] hover:bg-[#FAF9F6] hover:border-[#3E6B5C]/30 transition-all duration-300 font-medium"
        onClick={handleGoogle}
        disabled={googleLoading}
      >
        {googleLoading ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <svg className="w-5 h-5 mr-2.5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
        )}
        Continue with Google
      </Button>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#E9E6DF]/70" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs text-[#6F6E68] uppercase tracking-wider">or</span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {isSignUp && (
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-[#1A1B18] text-sm font-medium">
              Full name
            </Label>
            <Input
              id="fullName"
              placeholder="Your name"
              className="h-12 rounded-2xl border-[#E9E6DF] bg-white focus-visible:ring-[#3E6B5C] focus-visible:border-[#3E6B5C] transition-colors"
              {...register("fullName")}
            />
            {"fullName" in errors && errors.fullName && (
              <p className="text-[#3E6B5C] text-xs">{errors.fullName.message}</p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-[#1A1B18] text-sm font-medium">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            className="h-12 rounded-2xl border-[#E9E6DF] bg-white focus-visible:ring-[#3E6B5C] focus-visible:border-[#3E6B5C] transition-colors"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-[#3E6B5C] text-xs">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-[#1A1B18] text-sm font-medium">
              Password
            </Label>
            {!isSignUp && (
              <Link href="/auth/forgot-password" className="text-xs text-[#3E6B5C] hover:underline font-medium">
                Forgot password?
              </Link>
            )}
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder={isSignUp ? "Min. 8 characters" : "Your password"}
              className="h-12 rounded-2xl border-[#E9E6DF] bg-white focus-visible:ring-[#3E6B5C] focus-visible:border-[#3E6B5C] transition-colors pr-10"
              {...register("password")}
            />
            <button
              type="button"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6F6E68] hover:text-[#1A1B18] transition-colors"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-[#3E6B5C] text-xs">{errors.password.message}</p>
          )}
          {isSignUp && <PasswordStrengthMeter password={watchedPassword as string} />}
        </div>

        {isSignUp && (
          <label className="flex items-start gap-2.5 cursor-pointer mt-1">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-[#E9E6DF] text-[#3E6B5C] focus:ring-[#3E6B5C] accent-[#3E6B5C]"
            />
            <span className="text-xs text-[#6F6E68] leading-relaxed">
              I agree to the{" "}
              <Link href="/terms" target="_blank" className="text-[#3E6B5C] hover:underline font-medium">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" target="_blank" className="text-[#3E6B5C] hover:underline font-medium">
                Privacy Policy
              </Link>
            </span>
          </label>
        )}

        <MagneticButton
          type="submit"
          disabled={loading || (isSignUp && !acceptedTerms)}
          className="w-full h-12 rounded-2xl font-semibold mt-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {isSignUp ? "Create account" : "Sign in"}
        </MagneticButton>

        {!isSignUp && (
          <button
            type="button"
            onClick={handleMagicLink}
            disabled={magicLinkLoading}
            className="w-full text-center text-sm text-[#3E6B5C] hover:text-[#2E5145] font-medium transition-colors disabled:opacity-50 mt-1"
          >
            {magicLinkLoading ? "Sending link..." : "Sign in with email link instead"}
          </button>
        )}
      </form>

      {/* Switch mode */}
      <p className="text-center text-sm text-[#6F6E68]">
        {isSignUp ? (
          <>
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-[#3E6B5C] hover:underline font-semibold">
              Sign in
            </Link>
          </>
        ) : (
          <>
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="text-[#3E6B5C] hover:underline font-semibold">
              Sign up free
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
