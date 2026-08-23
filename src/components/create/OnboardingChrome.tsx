/**
 * A3/A4 chrome — the three 26×3 progress bars and the live "Skip".
 *
 * Skip is live on EVERY step, including the last. The handoff is explicit that
 * the picks only bias template ordering, so nothing here may gate the app: a
 * user who skips all three lands on Home with a working account.
 */
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette } from "@/components/editorial";
import { onboardingProgress } from "@/lib/onboarding";
import { touch, type } from "@/theme/tokens";

export function OnboardingChrome({
  step,
  onSkip,
  ground = palette.paper,
  children,
}: {
  step: number;
  onSkip: () => void;
  /** A4 sits on pebble; A3 on paper. */
  ground?: string;
  children: ReactNode;
}) {
  const bars = onboardingProgress(step);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: ground }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 24,
          paddingTop: 10,
          minHeight: touch.min,
        }}
      >
        <View
          style={{ flexDirection: "row", gap: 5 }}
          accessible
          accessibilityLabel={`Step ${step} of ${bars.length}`}
        >
          {bars.map((done, i) => (
            <View
              key={i}
              style={{
                width: 26,
                height: 3,
                borderRadius: 2,
                backgroundColor: done ? palette.coral : palette.mist,
              }}
            />
          ))}
        </View>

        <Pressable
          onPress={onSkip}
          accessibilityRole="button"
          accessibilityLabel="Skip setup"
          hitSlop={12}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <Text style={{ ...type.body, fontSize: 13, fontWeight: "600", color: palette.stone }}>
            Skip
          </Text>
        </Pressable>
      </View>

      {children}
    </SafeAreaView>
  );
}
