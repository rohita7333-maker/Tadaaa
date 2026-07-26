/**
 * One header for every non-root screen, so nothing is a dead end.
 * - variant "back"  → ← chevron, for pushed screens (detail/pricing/settings/gift)
 * - variant "close" → ✕, for modals (the create wizard)
 * Defaults to router.back(); pass onPress to override (e.g. confirm-before-exit).
 * onDark tints the control for placement over a dark reveal background.
 */
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft, X } from "lucide-react-native";
import { colors, fonts, shadows } from "@/theme/tokens";

export function ScreenHeader({
  title,
  subtitle,
  variant = "back",
  onDark = false,
  onPress,
  right,
}: {
  title?: string;
  subtitle?: string;
  variant?: "back" | "close";
  onDark?: boolean;
  onPress?: () => void;
  right?: ReactNode;
}) {
  const router = useRouter();
  const Icon = variant === "close" ? X : ChevronLeft;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
      <Pressable
        onPress={onPress ?? (() => router.back())}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={variant === "close" ? "Close" : "Back"}
        style={({ pressed }) => [
          {
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: onDark ? "rgba(255,255,255,0.14)" : "#fff",
            borderWidth: 1,
            borderColor: onDark ? "rgba(255,255,255,0.25)" : colors.hair,
            transform: [{ scale: pressed ? 0.92 : 1 }],
          },
          !onDark && shadows.sm,
        ]}
      >
        <Icon size={19} color={onDark ? "#fff" : colors.charcoal} strokeWidth={2.2} />
      </Pressable>

      <View style={{ flex: 1 }}>
        {title ? (
          <Text
            numberOfLines={1}
            style={{ fontFamily: fonts.heading, fontSize: 15, textAlign: "center", color: onDark ? "#fff" : colors.charcoal }}
          >
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text
            style={{ fontFamily: fonts.bodyMedium, fontSize: 10.5, textAlign: "center", color: onDark ? "rgba(255,255,255,0.6)" : colors.warmGray }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={{ width: 36, alignItems: "flex-end" }}>{right}</View>
    </View>
  );
}
