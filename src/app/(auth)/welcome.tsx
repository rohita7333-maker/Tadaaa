/**
 * A1 — Welcome.
 *
 * Frame anatomy: a full-bleed photo at `opacity .32, brightness .6` under an
 * ink gradient · content bottom-aligned — sand "TaDaaaa" micro-label, 40px
 * serif headline, 17px body at max-width 300 · a 3-dot pager whose active dot
 * is a 22×4 pill · and BELOW the pager, the auth buttons, which never move
 * between panes. That last part is the whole frame: the CTA is fixed furniture,
 * only the story above it changes.
 *
 * DEVIATIONS
 *
 * 1. No photography. Same unanswered licensing question as B2/B3 — the panes
 *    use the theme gradients that ship with the app, under the frame's own
 *    scrim, so the treatment is right even though the art is not final.
 * 2. "Continue with Apple" is hidden unless Apple Sign In is actually
 *    available. It needs `expo-apple-authentication`, a paid Apple developer
 *    account and an entitlement — none of which exist in Expo Go. A button that
 *    cannot sign anyone in is worse than three-quarters of a frame.
 */
import { useRef, useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { EdToast, palette } from "@/components/editorial";
import { useAuth } from "@/providers/AuthProvider";
import { WELCOME_PANES } from "@/lib/onboarding";
import { gradientStops, themes } from "@/lib/themes";
import { overlay, radii, space, touch, type } from "@/theme/tokens";

/** The frame's own scrim — darker at the foot than the reveal's. */
const WELCOME_SCRIM = ["rgba(26,26,26,0.2)", "rgba(26,26,26,0.92)"] as const;
const WELCOME_SCRIM_STOPS = [0, 0.62] as const;

/**
 * Apple Sign In needs `expo-apple-authentication` plus an entitlement that only
 * a paid developer account can issue, and it cannot work in Expo Go at all.
 * Hard-coded rather than probed: a probe would imply it is one permission away.
 */
function appleSignInAvailable(): boolean {
  return false;
}

export default function Welcome() {
  const router = useRouter();
  const { signInWithGoogle } = useAuth();
  const [pane, setPane] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const width = useRef(Dimensions.get("window").width).current;

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== pane) setPane(next);
  }

  const current = WELCOME_PANES[Math.min(pane, WELCOME_PANES.length - 1)];

  return (
    <View style={{ flex: 1, backgroundColor: palette.ink }}>
      {/* One ground per pane, cross-faded by the pager, so the photo changes
          with the story while the buttons below stay put. */}
      <LinearGradient
        colors={gradientStops(themes[pane % themes.length]) as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", inset: 0, opacity: 0.32 }}
      />
      <LinearGradient
        colors={WELCOME_SCRIM as unknown as [string, string, ...string[]]}
        locations={WELCOME_SCRIM_STOPS as unknown as [number, number, ...number[]]}
        style={{ position: "absolute", inset: 0 }}
      />

      <SafeAreaView style={{ flex: 1 }}>
        {/* The pager scrolls; the copy is rendered ONCE beneath it and driven by
            the page index. Rendering three copies would let the headline slide
            out from under a pinned CTA, which is the thing the frame forbids. */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={{ flex: 1 }}
        >
          {WELCOME_PANES.map((p) => (
            <View key={p.headline} style={{ width }} accessible accessibilityLabel={p.headline} />
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: 32, paddingBottom: 8 }}>
          <Text style={{ ...type.revealMicroLabel, letterSpacing: 11 * 0.18, fontSize: 11, marginBottom: 14 }}>
            TaDaaaa
          </Text>
          <Text
            style={{
              ...type.revealHeadline,
              fontSize: 40,
              lineHeight: 40 * 1.1,
              letterSpacing: 40 * -0.02,
              marginBottom: 16,
            }}
          >
            {current.headline}
          </Text>
          <Text
            style={{
              ...type.body,
              fontSize: 17,
              lineHeight: 17 * 1.6,
              color: overlay.textStrong,
              maxWidth: 300,
              marginBottom: 28,
            }}
          >
            {current.body}
          </Text>

          <View
            accessibilityRole="tablist"
            accessibilityLabel={`Page ${pane + 1} of ${WELCOME_PANES.length}`}
            style={{ flexDirection: "row", gap: 7, marginBottom: 30 }}
          >
            {WELCOME_PANES.map((p, i) => (
              <View
                key={p.headline}
                style={{
                  width: i === pane ? 22 : 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: i === pane ? palette.paper : "rgba(255,254,253,0.35)",
                }}
              />
            ))}
          </View>
        </View>

        {/* Pinned. Never moves between panes. */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 10, gap: space.x3 }}>
          {appleSignInAvailable() ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue with Apple"
              onPress={() => setToast("Apple sign-in is not configured yet.")}
              style={({ pressed }) => ({
                minHeight: touch.control,
                borderRadius: radii.pill,
                backgroundColor: palette.paper,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ ...type.buttonLabel, fontSize: 13, color: palette.ink }}>
                Continue with Apple
              </Text>
            </Pressable>
          ) : null}

          {/* A1's Google button is an OUTLINED TRANSLUCENT pill on ink. The
              shared `GoogleButton` is the paper-ground `.gbtn` the sign-in card
              uses — reusing it here would drop a white card onto the scrim. */}
          <Pressable
            onPress={async () => {
              try {
                await signInWithGoogle();
              } catch (e) {
                setToast((e as Error).message || "Google sign-in failed. Try again.");
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
            style={({ pressed }) => ({
              minHeight: touch.control,
              borderRadius: radii.pill,
              borderWidth: 1,
              borderColor: overlay.borderStrong,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ ...type.buttonLabel, fontSize: 13, color: palette.paper }}>
              Continue with Google
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(auth)/sign-in")}
            accessibilityRole="button"
            accessibilityLabel="Use email instead"
            style={({ pressed }) => ({
              minHeight: touch.control,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text
              style={{
                ...type.buttonLabel,
                fontSize: 13,
                letterSpacing: 13 * 0.04,
                textTransform: "none",
                color: palette.sand,
              }}
            >
              Use email instead
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {toast ? <EdToast message={toast} onDismiss={() => setToast(null)} /> : null}
    </View>
  );
}
