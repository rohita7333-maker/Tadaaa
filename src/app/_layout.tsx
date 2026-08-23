import { useEffect } from "react";
import { Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_800ExtraBold,
} from "@expo-google-fonts/bricolage-grotesque";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { Caveat_700Bold } from "@expo-google-fonts/caveat";
import * as Notifications from "expo-notifications";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import {
  registerAndSavePushToken,
  registerNotificationCategories,
} from "@/lib/push-notifications";
import { contributionActionStatus, notificationRoute } from "@/lib/push-categories";
import { OfflineBanner } from "@/components/handoff/EdgeStates";
import { moderateContribution } from "@/lib/contributions";
import { colors } from "@/theme/tokens";

SplashScreen.preventAutoHideAsync();

/**
 * Redirects the user between the auth stack and the app tabs based on session
 * state. Recipients viewing /surprise/[slug] are never gated — the reveal is
 * public, exactly like the web link.
 */
function useProtectedRoute() {
  const { session, profile, initializing } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;
    const seg0 = segments[0] as string | undefined;
    const inAuthGroup = seg0 === "(auth)";
    // Public on web, therefore public here. Each of these renders for
    // signed-out visitors on web rather than redirecting, so gating them was a
    // mobile-only wall:
    //   surprise  — the reveal link itself
    //   pricing   — `app/pricing/page.tsx` branches on `isAuthed`
    //   templates — `app/templates/page.tsx`; the mobile screen reads no session
    //   gift      — a gift link is opened by a recipient who has no account
    //               yet; `gift/[token].tsx` already branches on `!user` to show
    //               "Sign in to redeem", which the guard made unreachable.
    // Tapping through to /create still requires a session — the guard catches
    // that on the create route, which is where web asks for it too.
    //   add       — E1's contributor form. A contributor has no account BY
    //               DESIGN ("No account needed" is on the screen), so gating it
    //               would bounce every person the feature exists for to a
    //               sign-in wall. This omission shipped with E1 and is fixed
    //               here.
    const PUBLIC_SEGMENTS = ["surprise", "pricing", "templates", "gift", "add"];
    const isPublic = PUBLIC_SEGMENTS.includes(seg0 ?? "");

    const inOnboarding = seg0 === "(onboarding)";
    // A3/A4 have not run until `welcomed_at` is stamped. Null profile means it
    // is still loading — sending them to onboarding on a null would flash the
    // chip screen at every returning user.
    const needsOnboarding = !!session && profile != null && !profile.welcomed_at;

    if (!session && !inAuthGroup && !isPublic) {
      router.replace("/(auth)/welcome");
    } else if (session && needsOnboarding && !inOnboarding) {
      router.replace("/(onboarding)/celebrate");
    } else if (session && !needsOnboarding && (inAuthGroup || inOnboarding)) {
      router.replace("/(tabs)");
    }
  }, [session, profile, initializing, segments, router]);
}

function RootNavigator() {
  const { initializing, user } = useAuth();
  const router = useRouter();
  useProtectedRoute();

  useEffect(() => {
    if (!initializing) SplashScreen.hideAsync();
  }, [initializing]);

  // Best-effort push registration once signed in. Never blocks navigation —
  // see push-notifications.ts for why this still no-ops until an EAS project
  // id is configured.
  useEffect(() => {
    if (user) void registerAndSavePushToken();
  }, [user]);

  /**
   * Frame F1 — the notification categories and their long-press actions.
   *
   * Registered unconditionally, not on sign-in: the categories describe the
   * app's notifications, and a notification can be delivered while signed out
   * (the OS holds it; the action resolves when the session is restored).
   */
  useEffect(() => {
    void registerNotificationCategories();
  }, []);

  /**
   * Frame F1 — acting on a notification.
   *
   * Approve / Reject resolve WITHOUT foregrounding the app, which is the
   * frame's own promise ("Hold to approve without opening the app"). Anything
   * else routes to the screen the payload names. `notificationRoute` refuses a
   * malformed or unknown payload rather than pushing an arbitrary path — the
   * data comes from the push service, not from this app.
   */
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      const status = contributionActionStatus(response.actionIdentifier);
      const contributionId = (data as { contributionId?: unknown })?.contributionId;

      if (status && typeof contributionId === "string" && contributionId !== "") {
        // Fire and forget: there is no UI to report into from a Lock Screen
        // action, and the queue reconciles on next open either way.
        void moderateContribution(contributionId, status);
        return;
      }

      const route = notificationRoute(data);
      if (route) router.push(route as never);
    });
    return () => sub.remove();
  }, [router]);

  if (initializing) return null;

  return (
    <>
      {/*
        Frame F3 — "a coral bar directly under the status bar … it PUSHES
        CONTENT DOWN rather than covering it". A flow sibling ABOVE the
        navigator is the only arrangement that does that; anything absolutely
        positioned covers the header it is warning about.
      */}
      <OfflineBanner />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.creamDark } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="add/[slug]" options={{ presentation: "card" }} />
      <Stack.Screen name="theme/[id]" options={{ presentation: "modal" }} />
      <Stack.Screen name="surprise/[slug]" options={{ animation: "fade" }} />
      <Stack.Screen name="create" options={{ presentation: "modal" }} />
      <Stack.Screen name="invite/[id]" options={{ presentation: "card" }} />
      <Stack.Screen name="analytics/[id]" options={{ presentation: "card" }} />
      <Stack.Screen name="templates" options={{ presentation: "card" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Bricolage_800ExtraBold: BricolageGrotesque_800ExtraBold,
    Bricolage_600SemiBold: BricolageGrotesque_600SemiBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    Caveat_700Bold,
  });

  if (!fontsLoaded && !fontError) return null;

  // On web (a non-target platform used for review/testing), constrain the app
  // to a centered phone-width column so it doesn't stretch edge-to-edge on a
  // desktop browser. On native this is a plain flex:1 passthrough.
  const webFrame =
    Platform.OS === "web"
      ? ({ flex: 1, width: "100%", maxWidth: 480, alignSelf: "center", backgroundColor: colors.creamDark } as const)
      : ({ flex: 1 } as const);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.appBg }}>
      <View style={webFrame}>
        <SafeAreaProvider>
          <AuthProvider>
            <StatusBar style="dark" />
            <RootNavigator />
          </AuthProvider>
        </SafeAreaProvider>
      </View>
    </GestureHandlerRootView>
  );
}
