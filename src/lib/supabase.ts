/**
 * Supabase client for React Native / Expo.
 *
 * Session persistence uses AsyncStorage (the documented Expo pattern). Tokens
 * are short-lived RLS-scoped JWTs; every table is protected server-side by RLS,
 * so the anon key + a stored session grant only what the signed-in user is
 * allowed. autoRefresh is driven by AppState so tokens refresh while the app is
 * foregrounded and pause when backgrounded.
 */
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import { createClient } from "@supabase/supabase-js";
import { ENV } from "./env";
import type { Database } from "./database.types";

export const supabase = createClient<Database>(
  ENV.supabaseUrl,
  ENV.supabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // RN has no URL to parse
      flowType: "pkce", // required for the native Google OAuth code exchange
    },
  }
);

// Refresh the session only while the app is in the foreground.
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
