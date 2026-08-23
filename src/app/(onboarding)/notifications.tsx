/**
 * A4 — Notification pre-permission.
 *
 * Frame anatomy: pebble ground · a 64px outlined circle mark · a 30px serif
 * headline and a 16px body at max-width 290 · a paper card listing the three
 * notification types with coral/sand dots · a coral "Turn on notifications" and
 * a plain "Not now".
 *
 * THE WHOLE POINT: the OS dialog fires ONLY after the coral tap. A decline then
 * costs nothing and can be asked again later — where asking cold burns the one
 * prompt iOS ever gives you. Camera, contacts and calendar are requested at the
 * step that needs them (C2, C3, C5), never here.
 *
 * This is the last onboarding step, so it is also where `welcomed_at` is
 * stamped — including on "Not now". Skipping the ask is not the same as not
 * having been onboarded.
 */
import { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { EdButton, EdToast, palette } from "@/components/editorial";
import { OnboardingChrome } from "@/components/create/OnboardingChrome";
import { useAuth } from "@/providers/AuthProvider";
import { registerAndSavePushToken } from "@/lib/push-notifications";
import { supabase } from "@/lib/supabase";
import { radii, space, touch, type } from "@/theme/tokens";

const TYPES: { tone: "coral" | "sand"; title: string; detail: string }[] = [
  { tone: "coral", title: "They opened it", detail: "The one you actually want" },
  { tone: "sand", title: "New contribution", detail: "So you can approve it fast" },
  { tone: "sand", title: "Occasion reminders", detail: "Two weeks out, so you have time" },
];

export default function Notifications() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function finish(askedForPush: boolean) {
    setBusy(true);
    try {
      if (askedForPush) {
        // The OS dialog lives inside here, and nowhere earlier.
        await registerAndSavePushToken();
      }
      if (user) {
        const { error } = await supabase
          .from("profiles")
          .update({ welcomed_at: new Date().toISOString() })
          .eq("id", user.id);
        if (error) throw new Error(error.message);
        await refreshProfile();
      }
    } catch (e) {
      // Never trap anyone in onboarding over a preference write.
      setToast((e as Error).message);
    } finally {
      setBusy(false);
      router.replace("/(tabs)");
    }
  }

  return (
    <OnboardingChrome step={3} ground={palette.pebble} onSkip={() => finish(false)}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 44, alignItems: "center" }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            borderWidth: 1.5,
            borderColor: palette.ink,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <Text style={{ ...type.screenTitle, fontSize: 26 }}>!</Text>
        </View>

        <Text
          style={{
            ...type.screenTitle,
            fontSize: 30,
            lineHeight: 30 * 1.15,
            textAlign: "center",
            marginBottom: 10,
          }}
        >
          Know the moment they open it.
        </Text>
        <Text
          style={{
            ...type.body,
            fontSize: 16,
            color: palette.stone,
            textAlign: "center",
            maxWidth: 290,
            marginBottom: 30,
          }}
        >
          One push when they view it, one when a friend adds a message. Nothing else, ever.
        </Text>

        <View
          style={{
            width: "100%",
            backgroundColor: palette.paper,
            borderWidth: 1,
            borderColor: palette.mist,
            borderRadius: radii.md,
            paddingVertical: 4,
            paddingHorizontal: 18,
          }}
        >
          {TYPES.map((t, i) => (
            <View
              key={t.title}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                paddingVertical: 15,
                borderBottomWidth: i === TYPES.length - 1 ? 0 : 1,
                borderBottomColor: palette.mist,
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: t.tone === "coral" ? palette.coral : palette.sand,
                }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ ...type.body, fontSize: 15, fontWeight: "600" }}>{t.title}</Text>
                <Text style={type.bodySecondary}>{t.detail}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ marginTop: "auto", width: "100%", paddingBottom: 14, gap: space.x3 }}>
          <EdButton title="Turn on notifications" loading={busy} onPress={() => finish(true)} />
          <EdButton
            title="Not now"
            variant="line"
            disabled={busy}
            onPress={() => finish(false)}
            style={{ minHeight: touch.min, borderColor: "transparent" }}
          />
        </View>
      </View>

      {toast ? <EdToast message={toast} onDismiss={() => setToast(null)} /> : null}
    </OnboardingChrome>
  );
}
