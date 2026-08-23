/**
 * Template mode collapses step 1 into one plaque: the template already decided
 * the occasion, theme and reveal style, so the wizard never re-asks. "Change"
 * is the escape hatch back to the full pickers, prefilled with these values.
 *
 * Editorial skin — the mockup's `.sumcard` row language, no emoji tile. The
 * `?template=` hydration and its premium gate are untouched; picking is still
 * free and entitlement is still settled once, at publish.
 */
import { View } from "react-native";
import { SlidersHorizontal } from "lucide-react-native";
import { Body, EdButton, EdSummaryCard, Heading, palette } from "@/components/editorial";
import { spacing } from "@/components/ui";
import { REVEAL_STYLE_LABELS, type Template } from "@/lib/templates";
import { occasions, getThemeById } from "@/lib/themes";

interface Props {
  template: Template;
  /** Leaves template mode and reveals the full occasion + theme pickers. */
  onChange: () => void;
}

export default function TemplateSummaryChip({ template, onChange }: Props) {
  const occasionLabel = occasions.find((o) => o.id === template.occasionId)?.label ?? "Custom";
  const themeName = getThemeById(template.themeId)?.name ?? template.themeId;

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ gap: 6 }}>
        <Heading size={24}>{template.name}</Heading>
        <Body size={14}>This template already made these calls. Change any of them below.</Body>
      </View>

      <EdSummaryCard
        rows={[
          { key: "Occasion", value: occasionLabel },
          { key: "Look", value: themeName },
          { key: "Reveal", value: REVEAL_STYLE_LABELS[template.revealType] },
          { key: "Plan", value: template.tier === "premium" ? "Premium" : "Free" },
        ]}
      />

      <View style={{ flexDirection: "row" }}>
        <EdButton
          title="Change"
          variant="line"
          small
          left={<SlidersHorizontal size={14} color={palette.ink} />}
          onPress={onChange}
        />
      </View>
    </View>
  );
}
