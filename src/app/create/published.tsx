/**
 * C7 — Published.
 *
 * Frame anatomy: a full ink screen · sand "IT'S LIVE" · 34px serif title · the
 * delivery sentence · a 196px white QR card generated LOCALLY so it works
 * offline at a party · the short URL in 14px monospace sand · a coral "Share the
 * link" over Copy / Save QR / Done. Confetti fires once on entry and settles,
 * and is skipped entirely under Reduce Motion.
 */
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, Share, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import * as MediaLibrary from "expo-media-library";
// SDK 54 moved expo-file-system to a File/Paths class API; the string-path
// helpers this needs live on the legacy entry point, which is still shipped.
import * as FileSystem from "expo-file-system/legacy";
import { EdButton, EdToast, palette, useReducedMotion } from "@/components/editorial";
import { Confetti } from "@/components/reveal/Particles";
import { QrCard } from "@/components/handoff/QrCard";
import { getThemeById, themes } from "@/lib/themes";
import { ENV } from "@/lib/env";
import { overlay, radii, space, touch, type } from "@/theme/tokens";

export default function Published() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const { slug, themeId, delivery } = useLocalSearchParams<{
    slug: string;
    themeId?: string;
    delivery?: string;
  }>();
  const [toast, setToast] = useState<string | null>(null);
  const qrRef = useRef<{ toDataURL: (cb: (data: string) => void) => void } | null>(null);

  // One shot, on entry, then it settles — never a loop.
  const [confetti, setConfetti] = useState(false);
  useEffect(() => {
    if (reduced) return;
    setConfetti(true);
    const t = setTimeout(() => setConfetti(false), 2600);
    return () => clearTimeout(t);
  }, [reduced]);

  const url = `${ENV.siteUrl}/surprise/${slug}`;
  const theme = getThemeById(themeId ?? "") ?? themes[0];

  async function saveQr() {
    const png = await new Promise<string | null>((resolve) => {
      if (!qrRef.current?.toDataURL) return resolve(null);
      qrRef.current.toDataURL((data) => resolve(data));
    });
    if (!png) {
      setToast("Couldn't render the QR to save.");
      return;
    }
    const { granted } = await MediaLibrary.requestPermissionsAsync();
    if (!granted) {
      setToast("Allow photo access to save the QR.");
      return;
    }
    try {
      // `toDataURL` hands back bare base64, not a data: URI.
      const path = `${FileSystem.cacheDirectory}tadaaaa-${slug}.png`;
      await FileSystem.writeAsStringAsync(path, png, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await MediaLibrary.saveToLibraryAsync(path);
      setToast("QR saved to your photos.");
    } catch {
      setToast("Couldn't save the QR. Try sharing the link instead.");
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.ink }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <Text style={type.revealMicroLabel}>It&apos;s live</Text>
          <Text
            style={{
              ...type.revealHeadline,
              textAlign: "center",
              marginTop: space.x3,
              marginBottom: space.x3,
            }}
          >
            Sent into the world.
          </Text>
          <Text
            style={{
              ...type.body,
              color: overlay.textStrong,
              textAlign: "center",
              marginBottom: space.x8,
            }}
          >
            {delivery ?? "They can open it right now."}
          </Text>

          <QrCard url={url} getRef={(r) => (qrRef.current = r)} />

          <Text
            style={{
              fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
              fontSize: 14,
              color: palette.sand,
              marginTop: space.x4,
            }}
            numberOfLines={1}
          >
            {url}
          </Text>
        </View>

        <View style={{ paddingHorizontal: 24, paddingBottom: 10, gap: space.x3 }}>
          <EdButton
            title="Share the link"
            onPress={() =>
              Share.share({ message: `Something's waiting for you: ${url}` }).catch(() => {})
            }
          />
          <View style={{ flexDirection: "row", gap: space.x3 }}>
            <InkOutlineButton
              label="Copy"
              onPress={async () => {
                await Clipboard.setStringAsync(url);
                setToast("Link copied.");
              }}
            />
            <InkOutlineButton label="Save QR" onPress={saveQr} />
            <InkOutlineButton label="Done" onPress={() => router.replace("/(tabs)")} />
          </View>
        </View>
      </SafeAreaView>

      <Confetti run={confetti} theme={theme} reduced={reduced} />
      {toast ? <EdToast message={toast} reduced={reduced} onDismiss={() => setToast(null)} /> : null}
    </View>
  );
}

/** The frame's translucent outline buttons — only ever on ink. */
function InkOutlineButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 48,
        borderRadius: radii.pill,
        borderWidth: 1,
        borderColor: overlay.borderStrong,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ ...type.buttonLabel, letterSpacing: 12 * 0.06, color: palette.paper }}>
        {label}
      </Text>
    </Pressable>
  );
}

export { touch };
