"use server";

import { createClient } from "@/lib/supabase/server";
import { signInSchema, signUpSchema, magicLinkSchema } from "@/lib/schemas";
import { redirect } from "next/navigation";
import { APP_URL } from "@/lib/constants";
import { rateLimit, getIp } from "@/lib/rate-limit";
import { headers } from "next/headers";

async function ipKey(prefix: string): Promise<string> {
  const h = await headers();
  return `${prefix}:${getIp(h)}`;
}

export async function signUp(formData: FormData) {
  if (!(await rateLimit(await ipKey("auth:signup"), 5, 60_000))) {
    return { error: "Too many signup attempts. Please wait a minute." };
  }

  const raw = {
    fullName: formData.get("fullName") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const result = signUpSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: {
      data: { full_name: result.data.fullName },
      emailRedirectTo: `${APP_URL}/auth/callback`,
    },
  });

  if (error) return { error: error.message };

  // Welcome email is sent ONCE from the auth callback after confirmation
  // (see app/auth/callback/route.ts). Avoid a duplicate at signup time.

  redirect("/auth/verify-email");
}

export async function signIn(formData: FormData) {
  if (!(await rateLimit(await ipKey("auth:signin"), 10, 60_000))) {
    return { error: "Too many sign-in attempts. Please wait a minute." };
  }

  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const result = signInSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: result.data.email,
    password: result.data.password,
  });

  if (error) return { error: error.message };
  redirect("/dashboard");
}

export async function signInWithMagicLink(formData: FormData) {
  // Magic-link is an email-bomb vector; tighter limit than password sign-in.
  if (!(await rateLimit(await ipKey("auth:magiclink"), 3, 60_000))) {
    return { error: "Too many magic-link requests. Please wait a minute." };
  }

  const parsed = magicLinkSchema.safeParse({
    email: (formData.get("email") as string)?.trim(),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Magic-link is sign-in only; new users must use /auth/signup so they
      // pass the Terms-of-Service gate. Prevents silent auto-registration.
      shouldCreateUser: false,
      emailRedirectTo: `${APP_URL}/auth/callback`,
    },
  });

  if (error) {
    // Supabase responds "Signups not allowed for otp" when the address is new.
    // Re-frame for the user.
    if (/signups? not allowed/i.test(error.message)) {
      return {
        error: "No account found. Please sign up first to accept the Terms.",
      };
    }
    return { error: error.message };
  }
  return { success: "Check your email for a sign-in link!" };
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${APP_URL}/auth/callback`,
    },
  });

  if (error) {
    // Supabase returns "Unsupported provider: provider is not enabled" when
    // Google OAuth isn't configured in the project dashboard. Re-frame so
    // users don't see a raw API error.
    if (/provider is not enabled|unsupported provider/i.test(error.message)) {
      return {
        error:
          "Google sign-in isn't configured yet. Use email + password or the magic link.",
      };
    }
    return { error: error.message };
  }
  if (data.url) redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function sendPasswordReset(formData: FormData) {
  if (!(await rateLimit(await ipKey("auth:reset"), 3, 60_000))) {
    return { error: "Too many reset requests. Please wait a minute." };
  }

  const email = (formData.get("email") as string)?.trim();
  if (!email) return { error: "Email is required" };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${APP_URL}/auth/callback?next=/auth/reset-password`,
  });

  if (error) return { error: error.message };
  return { success: "Check your email for a password reset link." };
}

export async function updatePassword(formData: FormData) {
  if (!(await rateLimit(await ipKey("auth:updatepw"), 5, 60_000))) {
    return { error: "Too many requests. Please wait a minute." };
  }

  const password = formData.get("password") as string;
  const currentPassword = formData.get("currentPassword") as string | null;
  // `recovery` means we're acting on a password-reset magic link — no current
  // password possible. UI sets this to "1" for the reset flow.
  const isRecovery = formData.get("recovery") === "1";

  if (!password || password.length < 8)
    return { error: "Password must be at least 8 characters" };

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (password === currentPassword) {
    return { error: "New password must be different from current password" };
  }

  // Non-recovery path: re-verify current password to block session-hijack lockout.
  if (!isRecovery) {
    if (!currentPassword) return { error: "Current password required" };
    if (!user.email) return { error: "Account is missing an email address" };

    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (verifyErr) return { error: "Current password is incorrect" };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  return { success: "Password updated" };
}
