/**
 * Editorial app-chrome atoms — the RN equivalents of the mockup's *app* CSS
 * classes (`tadaaaa/tadaaaa-editorial.html`), as opposed to the marketing/auth
 * primitives that already live in `./index.tsx`:
 *
 *   `.phead`      -> EdPageHead     `.panel`     -> EdPanel
 *   `.stat`       -> EdStat         `.stat-pill` -> EdStatusPill
 *   `.srow`       -> EdListRow      `.ib`        -> EdIconButton
 *   `.feedi`      -> EdFeedItem     `.chip`      -> EdChip
 *   `.setrow`     -> EdSetRow       `.sw`        -> EdSwitch
 *   `.empty`      -> EdEmpty        (hairlines)  -> EdHairline
 *
 * Split out of `index.tsx` purely to keep both files under the 800-line ceiling;
 * everything is re-exported from `@/components/editorial`.
 *
 * Colour comes only from `palette` / `derived`; type only from `fonts` /
 * `typography` and the documented ratios. No new token is defined here — where
 * the mockup uses a literal that has no token (see EdStatusPill), the nearest
 * existing token is used and the swap is documented inline.
 */
import type { ReactNode } from "react";
import {
  Platform,
  Pressable,
  type PressableProps,
  StyleSheet,
  Switch,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import {
  derived,
  fonts,
  palette,
  radii,
  LETTER_SPACING_HEADING_RATIO,
  LINE_HEIGHT_BODY_RATIO,
  LINE_HEIGHT_HEADING_RATIO,
} from "@/theme/tokens";
import { INVITE_STATUS_LABELS, type InviteStatus } from "@/lib/invite-status";

/** Minimum comfortable touch target (iOS HIG 44pt / Material 48dp floor). */
export const TOUCH_MIN = 44;

/**
 * Local headline/body renderers rather than importing `Heading`/`Body` from
 * `./index`: the barrel re-exports this module, so importing back from it would
 * make the two files circular. Same token math, same result.
 */
function ChromeHeading({
  size,
  children,
  numberOfLines,
  style,
}: {
  size: number;
  children: ReactNode;
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
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
    >
      {children}
    </Text>
  );
}

function ChromeBody({ size, children }: { size: number; children: ReactNode }) {
  return (
    <Text
      style={{
        fontFamily: fonts.body,
        fontSize: size,
        lineHeight: size * LINE_HEIGHT_BODY_RATIO,
        color: palette.stone,
      }}
    >
      {children}
    </Text>
  );
}

/* ---------------------------------------------------------------- hairline */

/** `border-bottom:1px solid var(--mist)`. */
export function EdHairline({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: 1, backgroundColor: palette.mist }, style]} />;
}

/* --------------------------------------------------------------- page head */

/** `.phead` — `h1` at 30 with a 14px stone sub, plus an optional right action. */
export function EdPageHead({
  title,
  sub,
  right,
  style,
}: {
  title: string;
  sub?: string;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 16 },
        style,
      ]}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <ChromeHeading size={30}>{title}</ChromeHeading>
        {sub ? <ChromeBody size={14}>{sub}</ChromeBody> : null}
      </View>
      {right}
    </View>
  );
}

/* ------------------------------------------------------------------- panel */

/** `.panel` — paper ground, mist hairline, `--r-md`, 19px section heading. */
export function EdPanel({
  title,
  right,
  children,
  style,
}: {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: palette.paper,
          borderWidth: 1,
          borderColor: palette.mist,
          borderRadius: radii.md,
          padding: 20,
        },
        style,
      ]}
    >
      {title ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <ChromeHeading size={19} style={{ flex: 1 }}>
            {title}
          </ChromeHeading>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/* -------------------------------------------------------------------- stat */

/**
 * `.stats4 { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)) }` —
 * RN has no auto-fit, so the tile carries the basis/min itself and the caller
 * supplies `flexWrap: "wrap"`. Below ~320pt the row reflows instead of
 * truncating the uppercase caption.
 */
const STAT_MIN_WIDTH = 100;
const STAT_FLEX = { flexGrow: 1, flexBasis: STAT_MIN_WIDTH, minWidth: STAT_MIN_WIDTH } as const;

const STAT_VALUE_SIZE = 32;
const STAT_LABEL_SIZE = 11;
/** `.stat .l { letter-spacing:.1em }` resolved against its font size. */
const STAT_LABEL_TRACKING_RATIO = 0.1;

/**
 * `.stat` — headline numeral over an uppercase caption. Tappable stats get the
 * mockup's `:hover{border-color:var(--ink)}` as a press state, since RN has no
 * hover on touch.
 */
export function EdStat({
  value,
  label,
  onPress,
  accessibilityLabel,
}: {
  value: string;
  label: string;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  // Only the outer wrapper carries the flex basis; the card itself just fills
  // it. Putting the basis on both would give the pressable variant a 100pt
  // height basis in its column-direction parent.
  const body = (pressed: boolean) => (
    <View
      style={{
        width: "100%",
        backgroundColor: palette.paper,
        borderWidth: 1,
        borderColor: pressed ? palette.ink : palette.mist,
        borderRadius: radii.md,
        paddingVertical: 16,
        paddingHorizontal: 12,
        minHeight: TOUCH_MIN,
        gap: 2,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.heading,
          fontWeight: "400",
          fontSize: STAT_VALUE_SIZE,
          lineHeight: STAT_VALUE_SIZE * LINE_HEIGHT_HEADING_RATIO,
          letterSpacing: STAT_VALUE_SIZE * LETTER_SPACING_HEADING_RATIO,
          color: palette.ink,
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: STAT_LABEL_SIZE,
          fontWeight: "600",
          letterSpacing: STAT_LABEL_SIZE * STAT_LABEL_TRACKING_RATIO,
          textTransform: "uppercase",
          color: palette.stone,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );

  if (!onPress) return <View style={STAT_FLEX}>{body(false)}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `${label}, ${value}`}
      style={STAT_FLEX}
    >
      {({ pressed }) => body(pressed)}
    </Pressable>
  );
}

/* -------------------------------------------------------------- status pill */

const PILL_FONT_SIZE = 10;
/** `.stat-pill { letter-spacing:.08em }` resolved against its font size. */
const PILL_TRACKING_RATIO = 0.08;

/**
 * `.stat-pill` — live / scheduled / expired / archived.
 *
 * The mockup tints `scheduled` with `#8a6f5c`, a literal that has no token and
 * measures 4.35:1 on paper — under the AA floor for 10px text. This ships
 * `derived.chipMutedText` (#73635D, 5.43:1 on paper) against the sanctioned
 * `palette.sand` border instead: same read, AA-clean.
 *
 * `expired` and `archived` both fall through to the base pill, exactly as the
 * mockup's `.exp` class does (it is emitted but has no CSS rule of its own).
 */
const PILL_TONE: Record<InviteStatus, { border: string; fg: string }> = {
  live: { border: palette.coral, fg: derived.coralDeep },
  scheduled: { border: palette.sand, fg: derived.chipMutedText },
  expired: { border: palette.mist, fg: palette.stone },
  archived: { border: palette.mist, fg: palette.stone },
};

/**
 * `.ed-pill` base — any short uppercase status marker. Defaults to the neutral
 * mist/stone tone; `EdStatusPill` is the invite-status specialisation.
 */
export function EdPill({
  label,
  border = palette.mist,
  fg = palette.stone,
}: {
  label: string;
  border?: string;
  fg?: string;
}) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderWidth: 1,
        borderColor: border,
        borderRadius: radii.pill,
        paddingHorizontal: 9,
        paddingVertical: 3,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: PILL_FONT_SIZE,
          fontWeight: "600",
          letterSpacing: PILL_FONT_SIZE * PILL_TRACKING_RATIO,
          textTransform: "uppercase",
          color: fg,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export function EdStatusPill({ status }: { status: InviteStatus }) {
  const tone = PILL_TONE[status];
  return (
    <EdPill label={INVITE_STATUS_LABELS[status]} border={tone.border} fg={tone.fg} />
  );
}

/* -------------------------------------------------------------- icon button */

/**
 * `.ib` — 38px square in the mockup; grown to the 44pt floor here because a
 * pointer target is not a finger target. Border darkens to ink on press, the
 * touch equivalent of the mockup's `:hover`.
 */
export function EdIconButton({
  icon,
  onPress,
  accessibilityLabel,
  ...rest
}: Omit<PressableProps, "children" | "style"> & {
  icon: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      style={({ pressed }) => ({
        width: TOUCH_MIN,
        height: TOUCH_MIN,
        borderRadius: radii.sm,
        borderWidth: 1,
        borderColor: pressed ? palette.ink : palette.mist,
        alignItems: "center",
        justifyContent: "center",
      })}
      {...rest}
    >
      {icon}
    </Pressable>
  );
}

/* -------------------------------------------------------------------- chip */

const CHIP_FONT_SIZE = 13;

/** `.chip` / `.chip.on` — stone-on-paper, inverting to paper-on-ink when set. */
export function EdChip({
  label,
  selected,
  onPress,
  accessibilityLabel,
  left,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  left?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        minHeight: 38,
        paddingHorizontal: 18,
        paddingVertical: 9,
        borderRadius: radii.pill,
        borderWidth: 1,
        borderColor: selected ? palette.ink : palette.mist,
        backgroundColor: selected ? palette.ink : palette.paper,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {left}
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: CHIP_FONT_SIZE,
          fontWeight: "600",
          color: selected ? palette.paper : palette.stone,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* ---------------------------------------------------------------- list row */

const ROW_TITLE_SIZE = 17;

/**
 * `.srow` — thumbnail, title + meta, trailing actions, bottom hairline.
 * `last` drops the rule so a list does not end on a dangling line.
 */
export function EdListRow({
  thumb,
  title,
  meta,
  actions,
  onPress,
  last,
  accessibilityLabel,
}: {
  thumb?: ReactNode;
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
  onPress?: () => void;
  last?: boolean;
  accessibilityLabel?: string;
}) {
  const inner = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14 }}>
      {thumb}
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <ChromeHeading size={ROW_TITLE_SIZE} numberOfLines={1}>
          {title}
        </ChromeHeading>
        {meta ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {meta}
          </View>
        ) : null}
      </View>
      {actions}
    </View>
  );

  return (
    <View style={last ? undefined : { borderBottomWidth: 1, borderBottomColor: palette.mist }}>
      {onPress ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? title}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          {inner}
        </Pressable>
      ) : (
        inner
      )}
    </View>
  );
}

/**
 * `.srow .th` — the 60px square thumbnail. A flat wash, not a gradient: the
 * editorial identity bans decorative ramps, so the theme reads through one
 * colour plus the occasion glyph.
 */
export function EdThumb({ tint, glyph }: { tint: string; glyph: string }) {
  return (
    <View
      style={{
        width: 60,
        height: 60,
        borderRadius: radii.sm,
        backgroundColor: tint,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 26 }}>{glyph}</Text>
    </View>
  );
}

/** `.srow .m .sub span` — 12px stone meta text. */
export function EdMeta({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        fontFamily: fonts.body,
        fontSize: 12,
        lineHeight: 12 * LINE_HEIGHT_BODY_RATIO,
        color: palette.stone,
      }}
    >
      {children}
    </Text>
  );
}

/* --------------------------------------------------------------- feed item */

/** `.feedi` — coral dot, 14px ink line, 12px stone timestamp, bottom hairline. */
export function EdFeedItem({
  text,
  time,
  icon,
  last,
}: {
  text: string;
  time: string;
  /** Replaces the mockup's `.dot` when the row carries a typed icon. */
  icon?: ReactNode;
  last?: boolean;
}) {
  return (
    <View
      style={[
        { flexDirection: "row", gap: 12, paddingVertical: 10 },
        last ? null : { borderBottomWidth: 1, borderBottomColor: palette.mist },
      ]}
    >
      <View style={{ width: 16, alignItems: "center", paddingTop: icon ? 2 : 7 }}>
        {icon ?? (
          <View
            style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: palette.coral }}
          />
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: 14,
            lineHeight: 14 * LINE_HEIGHT_BODY_RATIO,
            color: palette.ink,
          }}
        >
          {text}
        </Text>
        <Text
          style={{ fontFamily: fonts.body, fontSize: 12, color: palette.stone, marginTop: 2 }}
        >
          {time}
        </Text>
      </View>
    </View>
  );
}

/* ----------------------------------------------------------------- set row */

/**
 * `.setrow` — label block plus one trailing control, separated by a hairline.
 * `danger` turns the label coral, per `.setrow.danger h4`.
 */
export function EdSetRow({
  title,
  sub,
  right,
  danger,
  last,
}: {
  title: string;
  sub?: string;
  right?: ReactNode;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
          paddingVertical: 16,
          minHeight: TOUCH_MIN + 16,
        },
        last ? null : { borderBottomWidth: 1, borderBottomColor: palette.mist },
      ]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: 15,
            fontWeight: "600",
            color: danger ? derived.coralDeep : palette.ink,
          }}
        >
          {title}
        </Text>
        {sub ? (
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 13,
              lineHeight: 13 * LINE_HEIGHT_BODY_RATIO,
              color: palette.stone,
            }}
          >
            {sub}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

/* ------------------------------------------------------------------ switch */

/**
 * `.sw` — mist track, ink when checked, white knob. Android needs the
 * unchecked track spelled out via `ios_backgroundColor`'s platform twin, so
 * both colours are passed to `trackColor`.
 */
export function EdSwitch({
  value,
  onValueChange,
  disabled,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  accessibilityLabel: string;
}) {
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      trackColor={{ false: palette.mist, true: palette.ink }}
      thumbColor={derived.white}
      ios_backgroundColor={palette.mist}
      style={Platform.OS === "android" ? undefined : styles.switchIos}
    />
  );
}

/* ------------------------------------------------------------------- empty */

/** `.empty` — centred stone copy with generous air. */
export function EdEmpty({ children }: { children: ReactNode }) {
  return (
    <View style={{ paddingVertical: 48, paddingHorizontal: 20 }}>
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: 15,
          lineHeight: 15 * LINE_HEIGHT_BODY_RATIO,
          color: palette.stone,
          textAlign: "center",
        }}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  /** iOS renders the switch a shade large next to 15px row copy. */
  switchIos: { transform: [{ scale: 0.9 }] },
});
