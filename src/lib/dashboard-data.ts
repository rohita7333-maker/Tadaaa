import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Per-request memoized auth + profile fetch shared by the dashboard layout and
 * page. React `cache()` dedupes within one render pass, so the single sign-in
 * round-trip and the single profile row are fetched once instead of twice each.
 */
export const getDashboardUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export interface DashboardProfile {
  subscription_tier: string | null;
  subscription_expires_at: string | null;
  avatar_url: string | null;
}

export const getDashboardProfile = cache(
  async (userId: string): Promise<DashboardProfile | null> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("subscription_tier, subscription_expires_at, avatar_url")
      .eq("id", userId)
      .single();
    return data;
  }
);
