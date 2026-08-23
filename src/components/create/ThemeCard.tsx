/**
 * One selectable theme row.
 *
 * Extracted rather than inlined into the sheet so that any future theme
 * surface renders the identical thing. The sheet and the themes tab showing
 * subtly different cards is the one long-term weakness of keeping the picker
 * in the wizard, and it is cheap to remove up front.
 *
 * Selection follows the C1 occasion rows exactly: 1px mist → 2px coral with
 * padding reduced by one so nothing shifts, plus a filled check. Coral on paper
 * is ~3.9:1, which reads at 2x in a screenshot and not at 1x on a phone in
 * daylight, so colour is never the only cue.
 */
import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Check } from "lucide-react-native";
import { derived, palette } from "@/components/editorial";
import { gradientStops, type Theme } from "@/lib/themes";
import { radii, space, touch, type } from "@/theme/tokens";

const SWATCH = 44;

export function ThemeCard({
  theme,
  selected,
  onPress,
}: {
  theme: Theme;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={
        theme.isPremium
          ? `${theme.name}. ${theme.description}. Premium, $${theme.price.toFixed(2)}.`
          : `${theme.name}. ${theme.description}. Free.`
      }
      style={({ pressed }) => ({
        flexDirection: "row",
        gap: space.x4,
        alignItems: "center",
        borderRadius: radii.md,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? palette.coral : palette.mist,
        paddingVertical: selected ? 11 : 12,
        paddingHorizontal: selected ? 12 : 13,
        minHeight: touch.min,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: SWATCH,
          height: SWATCH,
          borderRadius: radii.sm,
          overflow: "hidden",
          backgroundColor: palette.mist,
        }}
      >
        <LinearGradient
          colors={gradientStops(theme) as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1 }}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ ...type.screenTitle, fontSize: 17, lineHeight: 17 * 1.2 }}>
          {theme.name}
        </Text>
        <Text style={type.bodySecondary} numberOfLines={1}>
          {theme.description}
        </Text>
        {theme.isPremium ? (
          // Shown at the point of choice so a premium pick is not a surprise
          // two steps later at C6, where `canPublishTheme` settles entitlement.
          <Text
            style={{
              ...type.buttonLabel,
              fontSize: 10,
              letterSpacing: 10 * 0.12,
              color: derived.coralDeep,
              marginTop: 3,
            }}
          >
            {`PREMIUM · $${theme.price.toFixed(2)}`}
          </Text>
        ) : null}
      </View>

      {selected ? (
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: derived.coralDeep,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Check size={14} color={palette.paper} strokeWidth={2.5} />
        </View>
      ) : null}
    </Pressable>
  );
}
