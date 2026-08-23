/**
 * `.field` with the mockup's `.eye` show/hide control, plus the optional
 * `.meter` / `.meterlbl` strength readout used on sign-up.
 *
 * The meter is display-only — see `password-strength.ts`. It never blocks
 * submission and the zod `signUpSchema` contract is untouched.
 */
import { useState } from "react";
import { Pressable, Text, View, type TextInputProps } from "react-native";
import { EdField, useReducedMotion } from "@/components/editorial";
import { derived, fonts, palette } from "@/theme/tokens";
import { passwordStrength } from "./password-strength";

/**
 * Meter fill colour by strength band. "Strong" is `derived.success`, the
 * AA-corrected shade of the mockup's `#2e7d4f` — the divergence that put
 * `palette.ink` here is resolved.
 */
const METER_COLOR = {
  weak: palette.coral,
  fair: palette.sand,
  strong: derived.success,
} as const;

/**
 * Readout colour by band. The field lives on the paper-ground auth card, where
 * `derived.success` measures 5.35:1 and `derived.coralDeep` 5.43:1 — both AA
 * for 12px text.
 */
const METER_LABEL_COLOR = {
  weak: derived.coralDeep,
  fair: palette.stone,
  strong: derived.success,
} as const;

export function PasswordField({
  label = "Password",
  error,
  value,
  meter,
  ...rest
}: TextInputProps & { label?: string; error?: string; value: string; meter?: boolean }) {
  const [visible, setVisible] = useState(false);
  const reduced = useReducedMotion();
  const strength = passwordStrength(value);
  const band =
    strength.label === "Strong" ? "strong" : strength.label === "Fair" ? "fair" : "weak";
  const fill = METER_COLOR[band];

  return (
    <View>
      <EdField
        label={label}
        error={error}
        value={value}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        right={
          <Pressable
            onPress={() => setVisible((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={visible ? "Hide password" : "Show password"}
            style={({ pressed }) => ({
              paddingHorizontal: 6,
              paddingVertical: 6,
              opacity: pressed && !reduced ? 0.6 : 1,
            })}
          >
            <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.stone }}>
              {visible ? "hide" : "show"}
            </Text>
          </Pressable>
        }
        {...rest}
      />

      {meter ? (
        <View style={{ marginTop: 7 }}>
          <View
            style={{
              height: 5,
              borderRadius: 3,
              backgroundColor: palette.pebble,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${strength.ratio * 100}%`,
                borderRadius: 3,
                backgroundColor: fill,
              }}
            />
          </View>
          <Text
            accessibilityLiveRegion="polite"
            style={{
              fontFamily: fonts.body,
              fontSize: 12,
              color: METER_LABEL_COLOR[band],
              marginTop: 4,
              minHeight: 16,
            }}
          >
            {strength.label}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
