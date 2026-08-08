import { Pressable, View } from "react-native";
import { SlidersHorizontal } from "lucide-react-native";
import { Chip, Txt, colors, fonts, radii, spacing } from "@/components/ui";
import { REVEAL_STYLE_LABELS, type Template } from "@/lib/templates";
import { occasions, getThemeById } from "@/lib/themes";

interface Props {
  template: Template;
  /** Leaves template mode and reveals the full occasion + theme pickers. */
  onChange: () => void;
}

/**
 * Template mode collapses step 1 into one plaque: the template already decided
 * the occasion, theme and reveal style, so the wizard never re-asks. "Change"
 * is the escape hatch back to the full pickers, prefilled with these values.
 */
export default function TemplateSummaryChip({ template, onChange }: Props) {
  const occasionLabel = occasions.find((o) => o.id === template.occasionId)?.label ?? "Custom";
  const themeName = getThemeById(template.themeId)?.name ?? template.themeId;
  const isPremium = template.tier === "premium";

  return (
    <View style={{ gap: spacing.md }}>
      <Txt variant="h2">Your template</Txt>

      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          gap: spacing.md,
          backgroundColor: colors.cream,
          borderWidth: 1,
          borderColor: colors.goldChipBorder,
          borderRadius: radii.lg,
          padding: spacing.md,
        }}
      >
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: radii.md,
            backgroundColor: colors.white,
            borderWidth: 1,
            borderColor: colors.hair,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Txt style={{ fontSize: 24 }}>{template.emoji}</Txt>
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" }}>
            <Txt variant="title">{template.name}</Txt>
            <Chip label={isPremium ? "Premium" : "Free"} tone={isPremium ? "gold" : "green"} />
          </View>
          <Txt variant="body" muted style={{ fontSize: 12.5 }}>
            {occasionLabel} · {themeName} · {REVEAL_STYLE_LABELS[template.revealType]}
          </Txt>
        </View>
      </View>

      <Pressable
        onPress={onChange}
        accessibilityRole="button"
        style={({ pressed }) => ({
          alignSelf: "flex-start",
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          height: 38,
          paddingHorizontal: 14,
          borderRadius: radii.pill,
          borderWidth: 1,
          borderColor: colors.lightGray,
          backgroundColor: colors.white,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <SlidersHorizontal size={14} color={colors.charcoal} />
        <Txt style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.charcoal }}>
          Change
        </Txt>
      </Pressable>
    </View>
  );
}
