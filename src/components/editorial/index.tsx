/**
 * Editorial primitives — the RN equivalents of the mockup's shared CSS classes
 * (`tadaaaa/tadaaaa-editorial.html`): `.btn`/`.btn-coral|ink|line`, `.field`,
 * `.label`, `.hr`, `.tlink`, `.gbtn`.
 *
 * Why a local module instead of editing `@/components/ui`: that kit is shared
 * with the tabs / create / reveal surfaces which are owned by other phases, and
 * its `Button` is gradient-filled by construction. These primitives are scoped
 * to the P1 marketing/auth surfaces (auth + pricing) and are the intended
 * adoption target when P2/P3 re-skin their own screens.
 *
 * Colour comes only from `palette` / `derived` in `@/theme/tokens` — no new
 * colour or type constants are defined here. Headline face always resolves
 * through `fonts.heading` (Platform.select), never a bare "Georgia".
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Pressable,
  type PressableProps,
  StyleSheet,
  Text,
  type TextProps,
  TextInput,
  type TextInputProps,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  derived,
  fonts,
  palette,
  radii,
  shadows,
  typography,
  LETTER_SPACING_LABEL_RATIO,
  LINE_HEIGHT_BODY_RATIO,
  LINE_HEIGHT_HEADING_RATIO,
  LETTER_SPACING_HEADING_RATIO,
} from "@/theme/tokens";

/* ------------------------------------------------------------------ motion */

/**
 * OS reduce-motion flag, following the pattern already used by
 * `create/index.tsx` and the reveal screens.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (alive) setReduced(v);
    });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (v) => setReduced(v));
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

/* -------------------------------------------------------------- typography */

/** `h1..h4` — headline face, weight 400, -.02em, 1.1 leading, ink. */
export function Heading({
  size = 26,
  style,
  ...rest
}: TextProps & { size?: number }) {
  return (
    <Text
      style={[
        {
          fontFamily: fonts.heading,
          fontWeight: "400",
          fontSize: size,
          lineHeight: size * LINE_HEIGHT_HEADING_RATIO,
          letterSpacing: size * LETTER_SPACING_HEADING_RATIO,
          color: palette.ink,
        },
        style,
      ]}
      {...rest}
    />
  );
}

/** `p` — body face, 1.6 leading, stone (pass `tone="ink"` for the ink variant). */
export function Body({
  size = 15,
  tone = "stone",
  style,
  ...rest
}: TextProps & { size?: number; tone?: "stone" | "ink" }) {
  return (
    <Text
      style={[
        {
          fontFamily: fonts.body,
          fontSize: size,
          lineHeight: size * LINE_HEIGHT_BODY_RATIO,
          color: tone === "ink" ? palette.ink : palette.stone,
        },
        style,
      ]}
      {...rest}
    />
  );
}

/** `.label` — 12 / 600 / .12em / uppercase / stone. */
export function Label({ style, ...rest }: TextProps) {
  return <Text style={[typography.label, style]} {...rest} />;
}

/** `.tlink` — coral, 600, 14. */
export function TextLink({
  title,
  onPress,
  align = "center",
  style,
}: {
  title: string;
  onPress: () => void;
  align?: "center" | "left";
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="link"
      style={[{ minHeight: 44, justifyContent: "center" }, style]}
    >
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: 14,
          fontWeight: "600",
          color: palette.coral,
          textAlign: align,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ button */

/** Mirrors the web's `.ed-btn-coral|ink|line|danger` in `globals.css`. */
export type EdButtonVariant = "coral" | "ink" | "line" | "danger";

const BTN_FONT_SIZE = 13;
const BTN_FONT_SIZE_SM = 11;
/** `.btn { letter-spacing:.08em }` resolved against the font size (RN is absolute). */
const BTN_TRACKING_RATIO = 0.08;

const btnFill: Record<EdButtonVariant, { bg: string; fg: string; border: string | undefined }> = {
  /**
   * `.ed-btn-coral` — grounded in coralDeep, NOT coral, exactly as on web
   * (`surprise-invite/src/app/globals.css`, pinned by `ed-atoms.test.ts`).
   * The label is 13px/600 white, which is TEXT: white on #D45847 is 3.97:1 and
   * fails AA; on #B8412F it is 5.48:1. This is the app's primary CTA, so the
   * failure applied to every screen.
   */
  coral: { bg: derived.coralDeep, fg: derived.white, border: undefined },
  ink: { bg: palette.ink, fg: palette.paper, border: undefined },
  line: { bg: palette.paper, fg: palette.ink, border: palette.mist },
  /** `.ed-btn-danger` — coralDeep on paper, so 11px small text still clears AA. */
  danger: { bg: palette.paper, fg: derived.coralDeep, border: derived.coralDeep },
};

/**
 * `.btn` — pill, uppercase, 600, .08em, `min-height:44px`.
 * `:active{transform:scale(.98)}` is honoured unless the OS asks for reduced motion.
 */
export function EdButton({
  title,
  onPress,
  variant = "coral",
  small,
  loading,
  disabled,
  left,
  style,
  ...rest
}: Omit<PressableProps, "children" | "style"> & {
  title: string;
  onPress?: () => void;
  variant?: EdButtonVariant;
  small?: boolean;
  loading?: boolean;
  left?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const isDisabled = disabled || loading;
  const fill = btnFill[variant];
  const fontSize = small ? BTN_FONT_SIZE_SM : BTN_FONT_SIZE;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      style={({ pressed }) => [
        {
          minHeight: 44,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          paddingVertical: small ? 9 : 14,
          paddingHorizontal: small ? 18 : 30,
          borderRadius: radii.pill,
          backgroundColor: fill.bg,
          borderWidth: fill.border ? 1 : 0,
          borderColor: fill.border,
          opacity: isDisabled ? 0.55 : 1,
          transform: [{ scale: pressed && !reduced ? 0.98 : 1 }],
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={fill.fg} />
      ) : (
        <>
          {left}
          <Text
            numberOfLines={1}
            style={{
              fontFamily: fonts.body,
              fontSize,
              fontWeight: "600",
              letterSpacing: fontSize * BTN_TRACKING_RATIO,
              textTransform: "uppercase",
              color: fill.fg,
            }}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

/* ------------------------------------------------------------------- field */

const FIELD_LABEL_SIZE = 11;
/** `.field label { letter-spacing:.08em }`. */
const FIELD_LABEL_TRACKING_RATIO = 0.08;

export const fieldStyles = StyleSheet.create({
  label: {
    fontFamily: fonts.body,
    fontSize: FIELD_LABEL_SIZE,
    fontWeight: "600",
    letterSpacing: FIELD_LABEL_SIZE * FIELD_LABEL_TRACKING_RATIO,
    textTransform: "uppercase",
    color: palette.stone,
    marginBottom: 7,
  },
  input: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: palette.ink,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderRadius: radii.sm,
    backgroundColor: palette.paper,
  },
  message: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: derived.coralDeep,
    marginTop: 5,
  },
});

/**
 * `.field` — uppercase label, mist border, `--r-sm`, and the mockup's
 * `box-shadow:0 0 0 1px var(--coral)` focus/error ring rendered as a 1px
 * wrapper border (React Native has no box-shadow spread).
 *
 * `right` hosts the `.eye` show/hide control.
 */
export function EdField({
  label,
  error,
  right,
  style,
  onFocus,
  onBlur,
  ...rest
}: TextInputProps & { label?: string; error?: string; right?: ReactNode }) {
  const [focused, setFocused] = useState(false);
  const accent = error ? palette.coral : focused ? palette.coral : "transparent";
  const borderColor = error || focused ? palette.coral : palette.mist;

  /**
   * Frame A2: an error shakes the field ±5px over 300ms. Fires on the
   * TRANSITION into an error, not on every render — a field that shakes each
   * keystroke while the message is up is a field fighting the person fixing it.
   * Silent under Reduce Motion; the coral border and the message carry it.
   */
  const reduced = useReducedMotion();
  const shake = useRef(new Animated.Value(0)).current;
  const wasErrored = useRef(false);
  useEffect(() => {
    const has = !!error;
    if (has && !wasErrored.current && !reduced) {
      shake.setValue(0);
      Animated.sequence(
        [1, -1, 1, -1, 0].map((dir) =>
          Animated.timing(shake, {
            toValue: dir * 5,
            duration: 60,
            useNativeDriver: true,
          })
        )
      ).start();
    }
    wasErrored.current = has;
  }, [error, reduced, shake]);

  return (
    <Animated.View style={{ transform: [{ translateX: shake }] }}>
      {label ? <Text style={fieldStyles.label}>{label}</Text> : null}
      <View
        style={{
          borderWidth: 1,
          borderColor: accent,
          borderRadius: radii.sm + 1,
        }}
      >
        <View style={{ justifyContent: "center" }}>
          <TextInput
            placeholderTextColor={palette.stone}
            accessibilityLabel={label}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            style={[fieldStyles.input, { borderColor }, right ? { paddingRight: 62 } : null, style]}
            {...rest}
          />
          {right ? (
            <View style={{ position: "absolute", right: 10 }} pointerEvents="box-none">
              {right}
            </View>
          ) : null}
        </View>
      </View>
      {error ? (
        <Text style={fieldStyles.message} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ divider */

/** `.hr` — uppercase caption between two hairlines. */
export function EdDivider({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: palette.mist }} />
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: 12,
          letterSpacing: 12 * LETTER_SPACING_LABEL_RATIO,
          textTransform: "uppercase",
          color: palette.stone,
        }}
      >
        {label}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: palette.mist }} />
    </View>
  );
}

/* -------------------------------------------------------------------- card */

/** `.auth` / `.tier` shell — paper ground, mist hairline, `--r-md`. */
export function EdCard({
  children,
  accent,
  style,
}: {
  children: ReactNode;
  /** `.tier.mid` — 2px coral border for the highlighted tier. */
  accent?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: palette.paper,
          borderWidth: accent ? 2 : 1,
          borderColor: accent ? palette.coral : palette.mist,
          borderRadius: radii.md,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * App-chrome atoms (`.phead` / `.panel` / `.stat` / `.srow` / `.setrow` / …)
 * live in `./chrome` purely to keep both files under the 800-line ceiling.
 * They mirror the web's `.ed-*` classes in `surprise-invite/src/app/globals.css`.
 */
export * from "./chrome";

/**
 * Wizard selection + input atoms (`.ocard` / `.rcard` / `.radio` / `.drop` /
 * `.cc` / `.progressbar` / `.sumcard` / `.paywall`) live in `./select` for the
 * same line-ceiling reason.
 */
export * from "./select";
export * from "./toast";

export { palette, derived, fonts, radii, shadows, typography };
