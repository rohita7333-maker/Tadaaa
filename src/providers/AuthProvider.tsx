/**
 * Auth context — single source of truth for session + profile across the app.
 * Wraps Supabase auth (email/password + magic link) with the same rules as the
 * web app. Session is restored from AsyncStorage on boot and kept in sync via
 * onAuthStateChange.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import { supabase } from "@/lib/supabase";
import { getProfile, type Profile } from "@/lib/db";
import { ENV } from "@/lib/env";

// Lets the in-app browser hand the OAuth redirect back to a waiting session.
WebBrowser.maybeCompleteAuthSession();

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  initializing: boolean;
  refreshProfile: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ needsConfirmation: boolean }>;
  signInWithMagicLink: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [initializing, setInitializing] = useState(true);

  async function loadProfile(userId: string | undefined) {
    if (!userId) {
      setProfile(null);
      return;
    }
    try {
      setProfile(await getProfile(userId));
    } catch {
      setProfile(null);
    }
  }

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      loadProfile(data.session?.user.id).finally(() => {
        if (active) setInitializing(false);
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      loadProfile(next?.user.id);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      initializing,
      refreshProfile: () => loadProfile(session?.user.id),
      async signInWithPassword(email, password) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw new Error(error.message);
      },
      async signUpWithPassword(email, password, fullName) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: `${ENV.siteUrl}/auth/callback`,
          },
        });
        if (error) throw new Error(error.message);
        // If email confirmation is on, there's no session yet.
        return { needsConfirmation: !data.session };
      },
      async signInWithMagicLink(email) {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo: `tadaaaa://auth/callback` },
        });
        if (error) throw new Error(error.message);
      },
      async signInWithGoogle() {
        // Reuses the SAME Google OAuth credentials already configured in
        // Supabase for the web app. Native flow: open Google in an auth session,
        // catch the redirect back to the app, exchange the PKCE code for a
        // session. onAuthStateChange then routes into the app.
        const redirectTo = makeRedirectUri();
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo, skipBrowserRedirect: true },
        });
        if (error) throw new Error(error.message);
        if (!data?.url) throw new Error("Couldn't start Google sign-in.");

        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type !== "success") return; // user dismissed the browser

        const { params, errorCode } = QueryParams.getQueryParams(result.url);
        if (errorCode) throw new Error(errorCode);
        const { code, access_token, refresh_token } = params;
        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exErr) throw new Error(exErr.message);
        } else if (access_token) {
          const { error: sErr } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (sErr) throw new Error(sErr.message);
        } else {
          throw new Error("Google sign-in returned no session.");
        }
      },
      async signOut() {
        await supabase.auth.signOut();
      },
    }),
    [session, profile, initializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
