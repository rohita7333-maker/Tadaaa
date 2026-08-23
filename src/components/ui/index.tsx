/**
 * Brand UI kit — the small set of primitives every screen composes from.
 * Mirrors the web design language (globals.css) and the mobile mockups:
 * warm cream ground, rose primary, Bricolage headings, DM Sans body, Caveat
 * handwritten accents.
 */
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  ScrollView,
  StyleSheet,
  type StyleProp,
  Text,
  type TextProps,
  TextInput,
  type TextInputProps,
  View,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { colors, fonts, gradients, palette, radii, shadows, spacing, typography } from "@/theme/tokens";

type TxtVariant =
  | "h1"
  | "h2"
  | "h3"
  | "title"
  | "body"
  | "label"
  | "eyebrow"
  | "kicker"
  | "hand";

const txtStyles = StyleSheet.create({
  h1: { fontFamily: fonts.heading, fontSize: 30, color: colors.charcoal, letterSpacing: -0.5 },
  h2: { fontFamily: fonts.heading, fontSize: 24, color: colors.charcoal, letterSpacing: -0.4 },
  h3: { fontFamily: fonts.heading, fontSize: 19, color: colors.charcoal, letterSpacing: -0.3 },
  title: { fontFamily: fonts.headingSemi, fontSize: 16, color: colors.charcoal },
  body: { fontFamily: fonts.body, fontSize: 14, color: colors.charcoal, lineHeight: 20 },
  label: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.charcoal },
  eyebrow: { fontFamily: fonts.hand, fontSize: 20, color: colors.rose },
  kicker: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: colors.gold,
  },
  hand: { fontFamily: fonts.hand, fontSize: 15, color: colors.charcoal },
});

export function Txt({
  variant = "body",
  muted,
  style,
  ...rest
}: TextProps & { variant?: TxtVariant; muted?: boolean }) {
  return (
    <Text
      style={[txtStyles[variant], muted && { color: colors.warmGray }, style]}
      {...rest}
    />
  );
}

export function Screen({
  children,
  edges = ["top", "bottom"],
  scroll,
  bg = colors.creamDark,
  contentStyle,
  overlay,
  ...rest
}: ViewProps & {
  children: ReactNode;
  edges?: Edge[];
  scroll?: boolean;
  bg?: string;
  contentStyle?: ViewProps["style"];
  /**
   * Rendered as a SIBLING of the scroll container, so it pins to the viewport.
   *
   * Anything absolutely-positioned that must stay put — toasts, snackbars —
   * has to go here. Passing it as a normal child puts it inside the
   * ScrollView's content container, where `position: "absolute"` is relative
   * to the scrolled content and the element drifts off-screen as the user
   * scrolls. That is not obvious from the call site, which is why this slot
   * exists rather than a comment telling people to be careful.
   */
  overlay?: ReactNode;
}) {
  const inner = scroll ? (
    <ScrollView
      contentContainerStyle={[{ padding: spacing.xl, gap: spacing.lg }, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, padding: spacing.xl, gap: spacing.lg }, contentStyle]}>{children}</View>
  );
  return (
    <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: bg }, rest.style]}>
      {inner}
      {overlay}
    </SafeAreaView>
  );
}

export function Card({ style, children, ...rest }: ViewProps & { children: ReactNode }) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.white,
          borderColor: colors.hair,
          borderWidth: 1,
          borderRadius: radii.xl,
          padding: spacing.lg,
        },
        shadows.sm,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

type ChipTone = "neutral" | "rose" | "gold" | "green";
const chipTone: Record<ChipTone, { bg: string; fg: string; border: string }> = {
  neutral: { bg: colors.white, fg: colors.warmGray, border: colors.hair },
  rose: { bg: colors.roseChipBg, fg: colors.roseDeep, border: colors.roseChipBorder },
  gold: { bg: colors.goldChipBg, fg: colors.goldChipText, border: colors.goldChipBorder },
  green: { bg: colors.greenChipBg, fg: colors.greenChipText, border: colors.greenChipBorder },
};

export function Chip({ label, tone = "neutral" }: { label: string; tone?: ChipTone }) {
  const c = chipTone[tone];
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: c.bg,
        borderColor: c.border,
        borderWidth: 1,
        borderRadius: radii.pill,
        paddingHorizontal: 11,
        paddingVertical: 5,
      }}
    >
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11.5, color: c.fg }}>{label}</Text>
    </View>
  );
}

type BtnVariant = "primary" | "outline" | "dark";
export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  small,
  left,
  style,
  ...rest
}: Omit<PressableProps, "children" | "style"> & {
  title: string;
  onPress?: () => void;
  variant?: BtnVariant;
  loading?: boolean;
  small?: boolean;
  left?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const isDisabled = disabled || loading;
  const height = small ? 40 : 52;
  const label = (color: string) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      {left}
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: small ? 13 : 15, color }}>
        {title}
      </Text>
    </View>
  );

  const base = {
    height,
    borderRadius: small ? radii.md : radii.lg,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: small ? 16 : 20,
    opacity: isDisabled ? 0.55 : 1,
  };

  if (variant === "primary") {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }, style]}
        {...rest}
      >
        <LinearGradient
          colors={gradients.rose}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[base, shadows.md]}
        >
          {loading ? <ActivityIndicator color="#fff" /> : label("#fff")}
        </LinearGradient>
      </Pressable>
    );
  }

  const bg = variant === "dark" ? colors.charcoal : colors.white;
  const fg = variant === "dark" ? "#fff" : colors.charcoal;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        base,
        {
          backgroundColor: bg,
          borderWidth: variant === "outline" ? 1.5 : 0,
          borderColor: colors.lightGray,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
      {...rest}
    >
      {loading ? <ActivityIndicator color={fg} /> : label(fg)}
    </Pressable>
  );
}

export function Field({
  label,
  error,
  style,
  ...rest
}: TextInputProps & { label?: string; error?: string }) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <Txt variant="label">{label}</Txt> : null}
      <TextInput
        placeholderTextColor={colors.warmGray}
        style={[
          {
            fontFamily: fonts.body,
            fontSize: 14,
            color: colors.charcoal,
            paddingHorizontal: 14,
            paddingVertical: 13,
            borderWidth: 1.5,
            borderColor: error ? colors.rose : colors.lightGray,
            borderRadius: radii.md,
            backgroundColor: colors.white,
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: colors.roseDeep }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export { colors, fonts, gradients, palette, radii, shadows, spacing, typography };
