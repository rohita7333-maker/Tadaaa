"use server";

import { createClient } from "@/lib/supabase/server";
import { signInSchema, signUpSchema, magicLinkSchema } from "@/lib/schemas";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { APP_URL } from "@/lib/constants";
import { rateLimit, getIp } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { logAudit, getRequestMeta } from "@/lib/audit";
import { safeNext } from "@/lib/auth-redirect";

async function ipKey(prefix: string): Promise<string> {
  const h = await headers();
  return `${prefix}:${getIp(h)}`;
}

/** Extract the bit after @ for low-signal logging (never the full email). */
function emailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  return at >= 0 ? email.slice(at + 1).toLowerCase() : null;
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
  const { data, error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: {
      data: { full_name: result.data.fullName },
      emailRedirectTo: `${APP_URL}/auth/callback`,
    },
  });

  if (error) return { error: error.message };

  const userId = data.user?.id ?? null;
  const domain = emailDomain(result.data.email);
  const meta = await getRequestMeta();
  after(async () => {
    await logAudit({
      userId,
      action: "signup",
      ip: meta.ip,
      userAgent: meta.userAgent,
      meta: { email_domain: domain },
    });
  });

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
  const { data, error } = await supabase.auth.signInWithPassword({
    email: result.data.email,
    password: result.data.password,
  });

  if (error) return { error: error.message };

  const userId = data.user?.id ?? null;
  const domain = emailDomain(result.data.email);
  const meta = await getRequestMeta();
  after(async () => {
    await logAudit({
      userId,
      action: "signin.password",
      ip: meta.ip,
      userAgent: meta.userAgent,
      meta: { email_domain: domain },
    });
  });

  const next = safeNext(formData.get("next") as string | null);
  redirect(next);
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

  // Preserve wherever the user was headed (e.g. /create?template=X) through
  // the email round-trip — /auth/callback re-validates this via safeNext.
  const rawNext = formData.get("next") as string | null;
  const callbackUrl = rawNext
    ? `${APP_URL}/auth/callback?next=${encodeURIComponent(rawNext)}`
    : `${APP_URL}/auth/callback`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Magic-link is sign-in only; new users must use /auth/signup so they
      // pass the Terms-of-Service gate. Prevents silent auto-registration.
      shouldCreateUser: false,
      emailRedirectTo: callbackUrl,
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

  // Magic-link is pre-auth — no user id yet. Log domain + IP only.
  const domain = emailDomain(email);
  const meta = await getRequestMeta();
  after(async () => {
    await logAudit({
      userId: null,
      action: "signin.magic_link",
      ip: meta.ip,
      userAgent: meta.userAgent,
      meta: { email_domain: domain },
    });
  });

  return { success: "Check your email for a sign-in link!" };
}

export async function signInWithGoogle(next?: string) {
  const supabase = await createClient();
  const redirectTo = next
    ? `${APP_URL}/auth/callback?next=${encodeURIComponent(next)}`
    : `${APP_URL}/auth/callback`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
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
  // Capture the user BEFORE signing out — the cookie is invalidated after.
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? null;
  const meta = await getRequestMeta();
  await supabase.auth.signOut();
  after(async () => {
    await logAudit({
      userId,
      action: "signout",
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
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

  // Pre-auth — no user id available, log domain + IP only.
  const domain = emailDomain(email);
  const meta = await getRequestMeta();
  after(async () => {
    await logAudit({
      userId: null,
      action: "password.reset_request",
      ip: meta.ip,
      userAgent: meta.userAgent,
      meta: { email_domain: domain },
    });
  });

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

  const meta = await getRequestMeta();
  after(async () => {
    await logAudit({
      userId: user.id,
      action: "password.update",
      ip: meta.ip,
      userAgent: meta.userAgent,
      meta: { recovery: isRecovery },
    });
  });

  return { success: "Password updated" };
}
