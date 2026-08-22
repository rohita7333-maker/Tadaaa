"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { signIn, signUp, signInWithGoogle, signInWithMagicLink } from "@/actions/auth";
import { signInSchema, signUpSchema, type SignInValues, type SignUpValues } from "@/lib/schemas";
import { PASSWORD_CRITERIA, passwordCriteriaMet, passwordsMatch } from "@/lib/password";
import { toast } from "sonner";

/* ---------------------------------------------------------------------------
 * Editorial atoms — ported from the mockup's `.auth` / `.field` / `.btn`
 * blocks. Written as Tailwind utilities because the token layer is frozen and
 * globals.css `.label` is unlayered (a colour utility could not override it).
 * ------------------------------------------------------------------------- */
export const AUTH_CARD =
  "w-full max-w-[400px] bg-paper border border-mist rounded-[var(--r-md)] px-9 py-10";
export const FIELD_LABEL =
  "block text-[11px] font-semibold uppercase tracking-[0.08em] text-stone mb-[7px]";
export const FIELD_INPUT =
  "w-full px-[14px] py-[13px] rounded-[var(--r-sm)] border border-mist bg-paper text-ink placeholder:text-stone/55 transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-coral focus:shadow-[0_0_0_1px_var(--coral)]";
/**
 * Mockup `.field.err` — coral border + coral 1px ring.
 *
 * `border-coral!` needs the important flag: Tailwind emits `border-coral`
 * before `border-mist` (same utility family, alphabetical), so the base
 * FIELD_INPUT border won on specificity-free order and the error border
 * rendered mist. Only the ring was ever coral.
 */
export const FIELD_INPUT_ERROR =
  "border-coral! shadow-[0_0_0_1px_var(--coral)]";
export const FIELD_MSG = "mt-[5px] text-xs text-coral-deep";
export const BTN_BASE =
  "inline-flex items-center justify-center gap-2 w-full min-h-[44px] px-[30px] py-[14px] rounded-full text-[13px] font-semibold uppercase tracking-[0.08em] transition-[transform,box-shadow,background-color] duration-[180ms] ease-out active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed";
export const BTN_INK = `${BTN_BASE} bg-ink text-paper hover:shadow-[var(--sh-card)]`;
export const BTN_CORAL = `${BTN_BASE} bg-coral text-white hover:bg-coral-deep hover:shadow-[var(--sh-card)]`;
export const TLINK =
  "text-coral-deep font-semibold text-sm hover:underline";

/**
 * Mockup `.meter` — one 5px bar whose fill width and colour track how many of
 * the five password criteria are met, plus a live-region word underneath.
 *
 * Display only. It never gates submission and never touches `signUpSchema`;
 * the server contract is the sole authority on what is accepted. The counting
 * lives in `@/lib/password` so it can be unit-tested without a DOM.
 */
function PasswordStrengthMeter({ password }: { password: string }) {
  const met = passwordCriteriaMet(password);
  // Mockup colours: coral under 3, sand under 5, green at 5. The green is now
  // the --success token (the mockup's #2E7D4F, darkened to clear AA on pebble).
  const fill =
    met < 3 ? "var(--coral)" : met < 5 ? "var(--sand)" : "var(--success)";
  const word = !password ? "" : met < 3 ? "Weak" : met < 5 ? "Fair" : "Strong";

  return (
    <>
      <div className="h-[5px] rounded-[3px] bg-pebble mt-[7px] overflow-hidden">
        <div
          className="h-full w-full rounded-[3px] origin-left transition-[transform,background-color] duration-300 ease-out"
          style={{
            transform: `scaleX(${met / PASSWORD_CRITERIA.length})`,
            backgroundColor: fill,
          }}
        />
      </div>
      <p className="text-xs text-stone mt-1 min-h-[18px]" aria-live="polite">
        {word}
      </p>
    </>
  );
}

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
  // Confirm-password is client-side only: it is deliberately NOT in
  // `signUpSchema` and is never appended to the FormData the action receives.
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);

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

  const watchedPassword = (watch("password") as string | undefined) || "";

  const confirmMismatch =
    isSignUp && !passwordsMatch(watchedPassword, confirmPassword);
  const showConfirmError = confirmTouched && confirmMismatch;

  async function onSubmit(data: SignUpValues | SignInValues) {
    if (isSignUp && !passwordsMatch(data.password, confirmPassword)) {
      setConfirmTouched(true);
      return;
    }
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

  // The mockup has one tabbed screen; the product has two real routes, so the
  // inactive tab is a link. `next` rides along on the sign-in href exactly as
  // the old cross-links did — sign-up has never read it.
  const signInHref = next
    ? `/auth/signin?next=${encodeURIComponent(next)}`
    : "/auth/signin";
  const tabBase =
    "flex-1 min-h-[44px] flex items-center justify-center rounded-[9px] text-sm font-semibold transition-colors duration-150 ease-out";
  const tabOn = "bg-paper text-ink shadow-[var(--sh)]";
  const tabOff = "text-stone hover:text-ink";

  return (
    <div className={AUTH_CARD}>
      {/* Tabs — mockup `.authtabs` */}
      <div className="flex gap-1.5 bg-pebble rounded-[12px] p-[5px] mb-[22px]">
        {isSignUp ? (
          <Link href={signInHref} className={`${tabBase} ${tabOff}`}>
            Sign in
          </Link>
        ) : (
          <span aria-current="page" className={`${tabBase} ${tabOn}`}>
            Sign in
          </span>
        )}
        {isSignUp ? (
          <span aria-current="page" className={`${tabBase} ${tabOn}`}>
            Sign up
          </span>
        ) : (
          <Link href="/auth/signup" className={`${tabBase} ${tabOff}`}>
            Sign up
          </Link>
        )}
      </div>

      <h1 className="text-[26px] mb-1">
        {isSignUp ? "Create your account" : "Welcome back"}
      </h1>
      <p className="text-sm mb-[26px]">
        {isSignUp
          ? "It takes about a minute. No card needed."
          : "Pick up where you left off."}
      </p>

      {/* Google — mockup `.gbtn` */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={googleLoading}
        className="w-full min-h-[44px] flex items-center justify-center gap-2.5 px-4 py-[13px] rounded-[var(--r-sm)] border border-mist bg-paper text-sm font-semibold text-ink hover:border-ink transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        {googleLoading ? "Opening Google…" : "Continue with Google"}
      </button>

      {/* Divider — mockup `.hr` */}
      <div className="flex items-center gap-3.5 my-[18px] text-xs uppercase tracking-[0.1em] text-stone">
        <span className="flex-1 h-px bg-mist" />
        or
        <span className="flex-1 h-px bg-mist" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {isSignUp && (
          <div className="mb-4">
            <label htmlFor="fullName" className={FIELD_LABEL}>
              Full name
            </label>
            <input
              id="fullName"
              autoComplete="name"
              placeholder="Your name"
              className={`${FIELD_INPUT} ${
                "fullName" in errors && errors.fullName ? FIELD_INPUT_ERROR : ""
              }`}
              {...register("fullName")}
            />
            {"fullName" in errors && errors.fullName && (
              <p className={FIELD_MSG}>{errors.fullName.message}</p>
            )}
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="email" className={FIELD_LABEL}>
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className={`${FIELD_INPUT} ${errors.email ? FIELD_INPUT_ERROR : ""}`}
            {...register("email")}
          />
          {errors.email && <p className={FIELD_MSG}>{errors.email.message}</p>}
        </div>

        <div className="mb-4">
          <label htmlFor="password" className={FIELD_LABEL}>
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              placeholder={
                isSignUp ? "8+ chars, mixed case, number, symbol" : "Your password"
              }
              className={`${FIELD_INPUT} pr-[68px] ${
                errors.password ? FIELD_INPUT_ERROR : ""
              }`}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-1.5 text-xs text-stone hover:text-ink transition-colors"
            >
              {showPassword ? "hide" : "show"}
            </button>
          </div>
          {errors.password && (
            <p className={FIELD_MSG}>{errors.password.message}</p>
          )}
          {isSignUp && <PasswordStrengthMeter password={watchedPassword} />}
        </div>

        {isSignUp && (
          <div className="mb-4">
            <label htmlFor="confirmPassword" className={FIELD_LABEL}>
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => setConfirmTouched(true)}
              aria-invalid={showConfirmError || undefined}
              aria-describedby={showConfirmError ? "confirmPassword-error" : undefined}
              className={`${FIELD_INPUT} ${showConfirmError ? FIELD_INPUT_ERROR : ""}`}
            />
            {showConfirmError && (
              <p id="confirmPassword-error" className={FIELD_MSG}>
                Passwords do not match.
              </p>
            )}
          </div>
        )}

        {isSignUp && (
          <label className="flex gap-2.5 items-start text-[13px] text-stone mb-3.5 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="w-[18px] h-[18px] mt-0.5 accent-coral shrink-0"
            />
            <span>
              I agree to the{" "}
              <Link href="/terms" target="_blank" className="text-coral-deep font-semibold hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" target="_blank" className="text-coral-deep font-semibold hover:underline">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
        )}

        <button
          type="submit"
          disabled={loading || (isSignUp && !acceptedTerms)}
          className={isSignUp ? BTN_CORAL : BTN_INK}
        >
          {loading
            ? isSignUp
              ? "Creating…"
              : "Signing in…"
            : isSignUp
              ? "Create account"
              : "Sign in"}
        </button>

        {!isSignUp && (
          <>
            <p className="mt-3.5 text-sm text-center">
              <button
                type="button"
                onClick={handleMagicLink}
                disabled={magicLinkLoading}
                className={`${TLINK} disabled:opacity-60`}
              >
                {magicLinkLoading
                  ? "Sending link…"
                  : "Or sign in with a magic link →"}
              </button>
            </p>
            <p className="mt-2 text-[13px] text-center text-stone">
              Forgot password?{" "}
              <Link href="/auth/forgot-password" className={TLINK}>
                Reset it
              </Link>
            </p>
          </>
        )}
      </form>
    </div>
  );
}
