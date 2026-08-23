/**
 * A3 step 1 — "What do you celebrate?"
 *
 * Frame anatomy: three 26×3 progress bars and a live Skip · a 32px serif
 * question and a 16px sub · a wrapping multi-select chip field, selected chips
 * ink-filled with paper text · Continue pinned to the bottom of the content
 * area, not the end of a scroll.
 */
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { EdButton, palette } from "@/components/editorial";
import { OnboardingChrome } from "@/components/create/OnboardingChrome";
import { CELEBRATE_CHIPS, toggleChip } from "@/lib/onboarding";
import { radii, space, touch, type } from "@/theme/tokens";

export default function Celebrate() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);

  return (
    <OnboardingChrome step={1} onSkip={() => router.replace("/(onboarding)/notifications")}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 34, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ ...type.screenTitle, fontSize: 32, lineHeight: 32 * 1.15, marginBottom: 8 }}>
          What do you celebrate?
        </Text>
        <Text style={{ ...type.body, fontSize: 16, color: palette.stone, marginBottom: 26 }}>
          We&apos;ll tune your templates. Pick any.
        </Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.x3 }}>
          {CELEBRATE_CHIPS.map((chip) => {
            const on = selected.includes(chip.id);
            return (
              <Pressable
                key={chip.id}
                onPress={() => setSelected((s) => toggleChip(s, chip.id))}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={chip.label}
                style={({ pressed }) => ({
                  minHeight: touch.min,
                  justifyContent: "center",
                  paddingHorizontal: 20,
                  borderRadius: radii.pill,
                  backgroundColor: on ? palette.ink : "transparent",
                  borderWidth: on ? 0 : 1,
                  borderColor: palette.mist,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    ...type.body,
                    fontSize: 15,
                    fontWeight: "600",
                    color: on ? palette.paper : palette.stone,
                  }}
                >
                  {chip.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ marginTop: "auto", paddingBottom: 14, paddingTop: space.x8 }}>
          <EdButton
            title="Continue"
            variant="ink"
            onPress={() =>
              router.push({
                pathname: "/(onboarding)/who",
                params: { occasions: selected.join(",") },
              })
            }
          />
        </View>
      </ScrollView>
    </OnboardingChrome>
  );
}
