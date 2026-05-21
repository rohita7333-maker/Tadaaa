import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { welcomeEmail } from "@/lib/email/templates";

// Allowlist of safe next-path prefixes. Anything outside this list falls back
// to /dashboard. Prevents open-redirect via `?next=https://evil.com`.
const ALLOWED_NEXT_PREFIXES = [
  "/dashboard",
  "/create",
  "/settings",
  "/pricing",
  "/auth/reset-password",
  "/about",
];

function safeNext(raw: string | null): string {
  if (!raw) return "/dashboard";
  // Must be a same-origin path, not a protocol-relative URL.
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  // Strip any embedded scheme or `\` Windows hack.
  if (/[\\:]/.test(raw)) return "/dashboard";
  return ALLOWED_NEXT_PREFIXES.some((p) => raw === p || raw.startsWith(`${p}/`) || raw.startsWith(`${p}?`))
    ? raw
    : "/dashboard";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/signin?error=auth_callback_failed`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/auth/signin?error=auth_callback_failed`);
  }

  // Fire the branded welcome email exactly once per user — tracked via
  // profiles.welcomed_at. Using the admin client so it works whether the
  // profile row already exists or not.
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      const admin = createAdminClient();
      const { data: profile } = await admin
        .from("profiles")
        .select("welcomed_at")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.welcomed_at) {
        await admin.from("profiles").upsert({
          id: user.id,
          welcomed_at: new Date().toISOString(),
        });
        const name = (user.user_metadata?.full_name as string) || "there";
        const createUrl = `${origin}/create`;
        const email = welcomeEmail(name, createUrl);
        sendEmail(user.email, email.subject, email.html).catch(() => {});
      }
    }
  } catch (e) {
    console.error("[callback] welcome dispatch failed:", e);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
