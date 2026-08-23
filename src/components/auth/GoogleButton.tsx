/**
 * "Continue with Google" — reused on sign-in and sign-up. Drives
 * useAuth().signInWithGoogle (native OAuth reusing the web app's Google creds).
 *
 * Styled as the mockup's `.gbtn`: full-width, paper ground, mist hairline,
 * `--r-sm`, 14/600 — not a pill and not uppercase, unlike `.btn`. The mockup
 * places it above the "or" rule, so the divider now lives in the screens.
 */
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { useReducedMotion } from "@/components/editorial";
import { fonts, palette, radii } from "@/theme/tokens";
import { useAuth } from "@/providers/AuthProvider";

export function GoogleButton({ onNotify }: { onNotify?: (message: string) => void }) {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const reduced = useReducedMotion();

  async function onPress() {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      onNotify?.((e as Error).message || "Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: loading, busy: loading }}
      style={({ pressed }) => ({
        width: "100%",
        minHeight: 44,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        paddingVertical: 13,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: pressed && !reduced ? palette.ink : palette.mist,
        borderRadius: radii.sm,
        backgroundColor: palette.paper,
        opacity: loading ? 0.55 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator color={palette.ink} />
      ) : (
        <>
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: palette.mist,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontFamily: fonts.heading, fontSize: 12, color: palette.ink }}>G</Text>
          </View>
          <Text
            style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: "600", color: palette.ink }}
          >
            Continue with Google
          </Text>
        </>
      )}
    </Pressable>
  );
}
