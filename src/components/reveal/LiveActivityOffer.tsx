/**
 * D4's offer card, above the home indicator.
 *
 * Frame: a 1px translucent card, a 34px outlined circle mark, "Keep it on your
 * Lock Screen" over "Live Activity until it opens", and a white "Add" pill.
 *
 * BLOCKED — the Live Activity itself. ActivityKit needs `expo-live-activity`,
 * which is not installed and cannot run in Expo Go at all: it requires a
 * development build with a Widget Extension target. The handoff already
 * specifies the degrade path — "degrades to 'Notify me' (email capture) on web
 * and Android" — so that is what the card does everywhere today, and it says so
 * rather than offering a button that silently does nothing.
 *
 * When ActivityKit lands, `liveActivityAvailable()` is the only thing that
 * changes; the card, the copy switch and the fallback all stay.
 */
import { useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import { requestNotify } from "./WaitingRoom";
import { overlay, palette, radii, space, touch, type } from "@/theme/tokens";

/**
 * iOS 16.2+ AND a build that ships a Widget Extension. Expo Go ships neither,
 * so this is false in every build that exists today — deliberately hard-coded
 * rather than probed, because a probe would imply the capability is one
 * permission away.
 */
export function liveActivityAvailable(): boolean {
  return false;
}

const MARK = 34;

export default function LiveActivityOffer({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "invalid" | "error">("idle");

  const native = liveActivityAvailable();

  async function submit() {
    setStatus("sending");
    setStatus(await requestNotify(slug, email.trim()));
  }

  if (status === "ok") {
    return (
      <View style={{ paddingHorizontal: 24, paddingBottom: 12 }}>
        <Text style={{ ...type.bodySecondary, color: overlay.textSoft, textAlign: "center" }}>
          We&apos;ll tell you the moment it opens.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 24, paddingBottom: 12 }}>
      <View
        style={{
          borderWidth: 1,
          borderColor: overlay.borderSoft,
          borderRadius: radii.md,
          paddingVertical: space.x4,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <View
          style={{
            width: MARK,
            height: MARK,
            borderRadius: MARK / 2,
            borderWidth: 1,
            borderColor: overlay.borderStrong,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 15, color: palette.sand }}>◔</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ ...type.body, fontSize: 13, fontWeight: "600", color: palette.paper }}>
            {native ? "Keep it on your Lock Screen" : "Know the moment it opens"}
          </Text>
          <Text
            style={{ ...type.bodySecondary, fontSize: 12, color: overlay.textSoft, marginTop: 1 }}
          >
            {native
              ? "Live Activity until it opens"
              : Platform.OS === "ios"
                ? "We'll email you — Lock Screen needs the full app"
                : "We'll email you the moment it's live"}
          </Text>
        </View>

        <Pressable
          onPress={() => setOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={native ? "Add to Lock Screen" : "Email me when it opens"}
          style={({ pressed }) => ({
            minHeight: 36,
            paddingHorizontal: 14,
            borderRadius: radii.pill,
            backgroundColor: palette.paper,
            justifyContent: "center",
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <Text
            style={{
              ...type.buttonLabel,
              fontSize: 10.5,
              color: palette.ink,
            }}
          >
            {native ? "Add" : open ? "Close" : "Notify me"}
          </Text>
        </Pressable>
      </View>

      {open && !native ? (
        <View style={{ flexDirection: "row", gap: space.x2, marginTop: space.x3 }}>
          <TextInput
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (status !== "idle") setStatus("idle");
            }}
            placeholder="you@example.com"
            placeholderTextColor={overlay.textSoft}
            autoCapitalize="none"
            keyboardType="email-address"
            accessibilityLabel="Your email"
            style={{
              flex: 1,
              minHeight: touch.control,
              borderWidth: 1,
              borderColor: status === "invalid" ? palette.coral : overlay.borderSoft,
              borderRadius: radii.pill,
              paddingHorizontal: 16,
              ...type.body,
              color: palette.paper,
            }}
          />
          <Pressable
            onPress={submit}
            disabled={status === "sending"}
            accessibilityRole="button"
            accessibilityLabel="Notify me when it opens"
            style={({ pressed }) => ({
              minHeight: touch.control,
              paddingHorizontal: 18,
              borderRadius: radii.pill,
              backgroundColor: palette.paper,
              justifyContent: "center",
              opacity: status === "sending" ? 0.5 : pressed ? 0.75 : 1,
            })}
          >
            <Text style={{ ...type.buttonLabel, color: palette.ink }}>Notify</Text>
          </Pressable>
        </View>
      ) : null}

      {status === "invalid" || status === "error" ? (
        <Text style={{ ...type.bodySecondary, color: palette.sand, marginTop: space.x2 }}>
          {status === "invalid"
            ? "That address doesn't look right."
            : "That didn't send. Try again in a moment."}
        </Text>
      ) : null}
    </View>
  );
}
