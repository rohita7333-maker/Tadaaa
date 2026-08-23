/**
 * B3 → full-screen theme preview.
 *
 * Frame note: "Tapping a card opens a full-screen preview that plays the reveal
 * style with sample content, with 'Use this theme' pinned at the bottom — that's
 * the shortcut into the wizard with occasion, style and theme pre-filled."
 *
 * The preview renders the theme's ground under the reveal scrim with sample
 * copy set in the reveal's own type roles, and the CTA carries occasion, reveal
 * style and theme into the wizard.
 *
 * KNOWN GAP, disclosed rather than hidden: this shows the reveal's opening
 * frame, it does not run the full reveal engine (the scroll story's six scenes,
 * the countdown's live tick, the letters list). Mounting the real renderers
 * needs fixture photos and a fixture invite id, which is C-phase work.
 */
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { EdButton, palette } from "@/components/editorial";
import { getTemplate, REVEAL_STYLE_LABELS } from "@/lib/templates";
import { getThemeById, gradientStops } from "@/lib/themes";
import { occasionLabel } from "@/lib/occasions";
import { themePriceLabel } from "@/lib/theme-browse";
import { overlay, revealScrim, space, type } from "@/theme/tokens";

const SAMPLE_TITLE = "Maya turns thirty";
const SAMPLE_BODY = "Thirty looks good on you. Everyone you love is already in on this.";

export default function ThemePreview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const template = getTemplate(id ?? "");

  if (!template) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.paper }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}>
          <Text style={type.body}>That theme is no longer in the collection.</Text>
          <EdButton title="Back" variant="line" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const theme = getThemeById(template.themeId);
  const stops = theme ? gradientStops(theme) : [palette.pebble, palette.mist];

  return (
    <View style={{ flex: 1, backgroundColor: palette.ink }}>
      <LinearGradient
        colors={stops as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", inset: 0 }}
      />
      <LinearGradient
        colors={revealScrim.colors as unknown as [string, string, ...string[]]}
        locations={revealScrim.locations as unknown as [number, number, ...number[]]}
        style={{ position: "absolute", inset: 0 }}
      />

      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Close preview"
            hitSlop={12}
          >
            <Text style={{ fontSize: 24, color: palette.paper }}>✕</Text>
          </Pressable>
        </View>

        <View style={{ flex: 1, justifyContent: "flex-end", padding: 20, paddingBottom: 0 }}>
          <Text style={type.revealMicroLabel}>
            {occasionLabel(template.occasionId)} · {REVEAL_STYLE_LABELS[template.revealType]}
          </Text>
          <Text style={{ ...type.revealHeadline, fontSize: 42, lineHeight: 42 * 1.1, marginTop: 8 }}>
            {SAMPLE_TITLE}
          </Text>
          <Text
            style={{
              ...type.body,
              color: overlay.textStrong,
              maxWidth: 270,
              marginTop: space.x4,
            }}
          >
            {SAMPLE_BODY}
          </Text>
          <Text style={{ ...type.bodySecondary, color: overlay.textSoft, marginTop: space.x6 }}>
            Sample content — your own words and photos replace this.
          </Text>
        </View>

        <View style={{ padding: 20, gap: space.x3 }}>
          <EdButton
            title="Use this theme"
            onPress={() =>
              router.push({
                pathname: "/create",
                params: {
                  template: template.id,
                  occasion: template.occasionId,
                  reveal: template.revealType,
                  theme: template.themeId,
                },
              })
            }
          />
          <Text style={{ ...type.bodySecondary, color: overlay.textSoft, textAlign: "center" }}>
            {template.name} · {themePriceLabel(template.tier, theme?.price ?? 0)}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
