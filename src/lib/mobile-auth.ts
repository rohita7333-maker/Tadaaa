/**
 * Bearer-token auth for the mobile BFF routes under /api/mobile/*.
 *
 * The web app authenticates browser requests via Supabase cookies. The mobile
 * app has no cookies — it sends the user's Supabase access token as
 * `Authorization: Bearer <jwt>`. This helper validates that JWT with the
 * service-role client and returns the user (or null). ADDITIVE — nothing in the
 * existing web app imports or is affected by this.
 */
import type { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";

export async function getBearerUser(req: NextRequest): Promise<User | null> {
  const header =
    req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token) return null;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}
