import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const PLACEHOLDER = "your_supabase_project_url";
const isConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== PLACEHOLDER;

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    isConfigured ? process.env.NEXT_PUBLIC_SUPABASE_URL! : "https://placeholder.supabase.co",
    isConfigured ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! : "placeholder",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component — ignore cookie set errors
          }
        },
      },
    }
  );
}

export async function createServiceClient() {
  const cookieStore = await cookies();

  return createServerClient(
    isConfigured ? process.env.NEXT_PUBLIC_SUPABASE_URL! : "https://placeholder.supabase.co",
    isConfigured ? process.env.SUPABASE_SERVICE_ROLE_KEY! : "placeholder",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // ignore
          }
        },
      },
    }
  );
}

// Pure service-role admin client — no cookies, for storage uploads & signed URLs
export function createAdminClient() {
  return createSupabaseClient(
    isConfigured ? process.env.NEXT_PUBLIC_SUPABASE_URL! : "https://placeholder.supabase.co",
    isConfigured ? process.env.SUPABASE_SERVICE_ROLE_KEY! : "placeholder",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
