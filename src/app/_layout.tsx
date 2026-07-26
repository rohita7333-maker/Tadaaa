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
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { colors } from "@/theme/tokens";

SplashScreen.preventAutoHideAsync();

/**
 * Redirects the user between the auth stack and the app tabs based on session
 * state. Recipients viewing /surprise/[slug] are never gated — the reveal is
 * public, exactly like the web link.
 */
function useProtectedRoute() {
  const { session, initializing } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;
    const seg0 = segments[0] as string | undefined;
    const inAuthGroup = seg0 === "(auth)";
    const isPublic = seg0 === "surprise";

    if (!session && !inAuthGroup && !isPublic) {
      router.replace("/(auth)/sign-in");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [session, initializing, segments, router]);
}

function RootNavigator() {
  const { initializing } = useAuth();
  useProtectedRoute();

  useEffect(() => {
    if (!initializing) SplashScreen.hideAsync();
  }, [initializing]);

  if (initializing) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.creamDark } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="surprise/[slug]" options={{ animation: "fade" }} />
      <Stack.Screen name="create" options={{ presentation: "modal" }} />
      <Stack.Screen name="invite/[id]" options={{ presentation: "card" }} />
    </Stack>
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
