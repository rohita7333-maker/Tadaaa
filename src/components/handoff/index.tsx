/**
 * Handoff component kit — the primitives every B/C/F frame is assembled from.
 *
 * Values here are lifted from the frames in `design-handoff/TaDaaaa-Mobile.dc.html`,
 * not approximated: where a frame says `padding:14px 12px` or `font:400 28px
 * Georgia`, that is what ships. Colour and type come from `@/theme/tokens` — no
 * raw hex below, per the handoff's "never inline a raw hex anywhere else".
 *
 * Naming follows the handoff's kit list (StatTile, StatusPill, SurpriseRow,
 * SectionLabel…) rather than the older `Ed*` vocabulary, so a frame's prose maps
 * onto a component without translation.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, Pressable, Text, View, type ViewStyle } from "react-native";
import { palette, derived, radii, space, touch, type } from "@/theme/tokens";

// ---------------------------------------------------------------------------
// SectionLabel — 11px / 600 / +.12em / uppercase / stone
// ---------------------------------------------------------------------------
export function SectionLabel({ children }: { children: string }) {
  return <Text style={[type.sectionLabel, { marginBottom: space.x3 }]}>{children}</Text>;
}

// ---------------------------------------------------------------------------
// StatTile — frame B1: equal bordered tiles, 28px serif value over a 10px label
// ---------------------------------------------------------------------------
export interface StatTileProps {
  value: string;
  label: string;
  /** Frame B1: Pending's value is coral — the only number that implies work. */
  emphasis?: boolean;
  /**
   * `compact` is B1/B2's 3-up strip (28px value, 14/12 pad). `wide` is B5's
   * 2-up pair, which the frame draws a size larger: 30px value, 15px pad all
   * round. Same component so the two never drift apart in border, radius or
   * label tracking.
   */
  variant?: "compact" | "wide";
  onPress?: () => void;
  accessibilityLabel?: string;
}

export function StatTile({
  value,
  label,
  emphasis,
  variant = "compact",
  onPress,
  accessibilityLabel,
}: StatTileProps) {
  const wide = variant === "wide";
  const body = (
    <>
      <Text
        style={[
          type.statValue,
          { fontSize: wide ? 30 : 28, color: emphasis ? palette.coral : palette.ink },
        ]}
      >
        {value}
      </Text>
      <Text
        style={{
          ...type.fieldLabel,
          letterSpacing: 10 * 0.1,
          fontSize: 10,
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </>
  );

  const style: ViewStyle = {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.mist,
    borderRadius: radii.md,
    paddingVertical: wide ? 15 : space.x4,
    paddingHorizontal: wide ? 15 : 12,
    minHeight: touch.min,
  };

  if (!onPress) return <View style={style}>{body}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `${label}, ${value}`}
      style={({ pressed }) => [style, { opacity: pressed ? 0.7 : 1 }]}
    >
      {body}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// StatusPill — frame B1: 10px/600/uppercase, 1px border, radius 100, pad 3/8
// ---------------------------------------------------------------------------
export type PillTone = "live" | "scheduled" | "expired" | "draft";

/**
 * `sandInk` on the scheduled pill, never `sand`: sand measures 2.09:1 on paper.
 * The handoff calls this out explicitly and the frame's own markup uses #8a6f5c.
 */
const PILL_TONES: Record<PillTone, { text: string; border: string }> = {
  live: { text: palette.coral, border: palette.coral },
  scheduled: { text: derived.sandInk, border: palette.sand },
  expired: { text: palette.stone, border: palette.mist },
  draft: { text: palette.stone, border: palette.mist },
};

export function StatusPill({ tone, children }: { tone: PillTone; children: string }) {
  const c = PILL_TONES[tone];
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: radii.pill,
        paddingVertical: 3,
        paddingHorizontal: space.x2,
        alignSelf: "flex-start",
      }}
    >
      <Text
        style={{
          ...type.buttonLabel,
          fontSize: 10,
          letterSpacing: 10 * 0.08,
          color: c.text,
        }}
      >
        {children}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// SurpriseRow — frame B1: 64px thumb, 18px serif title, pill + stats, chevron
// ---------------------------------------------------------------------------
export interface SurpriseRowProps {
  title: string;
  tone: PillTone;
  pillLabel: string;
  meta: string;
  /** Solid fallback when no photo is available — never a broken image box. */
  thumbColor?: string;
  thumbUri?: string | null;
  last?: boolean;
  /** Frame B1: the whole expired row sits at opacity .6. */
  dimmed?: boolean;
  onPress?: () => void;
}

const THUMB = 64;

export function SurpriseRow({
  title,
  tone,
  pillLabel,
  meta,
  thumbColor,
  thumbUri,
  last,
  dimmed,
  onPress,
}: SurpriseRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${pillLabel}. ${meta}`}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: space.x4,
        paddingVertical: space.x4,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: palette.mist,
        opacity: dimmed ? 0.6 : pressed ? 0.7 : 1,
        minHeight: touch.min,
      })}
    >
      <View
        style={{
          width: THUMB,
          height: THUMB,
          borderRadius: radii.sm,
          backgroundColor: thumbColor ?? palette.pebble,
          overflow: "hidden",
        }}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ ...type.screenTitle, fontSize: 18, lineHeight: 18 * 1.2 }}>
          {title}
        </Text>
        <View style={{ flexDirection: "row", gap: space.x2, alignItems: "center", marginTop: 5 }}>
          <StatusPill tone={tone}>{pillLabel}</StatusPill>
          <Text style={{ ...type.bodySecondary, fontSize: 12 }} numberOfLines={1}>
            {meta}
          </Text>
        </View>
      </View>
      <Text style={{ fontSize: 22, color: palette.stone }}>›</Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// ResumeDraftCard — frame B1: 1px sand border, pebble fill, radius 12
// Only rendered when a local draft exists.
// ---------------------------------------------------------------------------
export function ResumeDraftCard({
  title,
  detail,
  onResume,
  onDiscard,
}: {
  title: string;
  detail: string;
  onResume: () => void;
  onDiscard?: () => void;
}) {
  return (
    <Pressable
      onPress={onResume}
      onLongPress={onDiscard}
      accessibilityRole="button"
      accessibilityLabel={`Resume draft: ${title}. ${detail}`}
      accessibilityHint={onDiscard ? "Long press to discard" : undefined}
      style={{
        borderWidth: 1,
        borderColor: palette.sand,
        backgroundColor: palette.pebble,
        borderRadius: radii.md,
        paddingVertical: 15,
        paddingHorizontal: space.x4 + 2,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ ...type.body, fontSize: 15, fontWeight: "600" }}>{title}</Text>
        <Text style={{ ...type.bodySecondary, marginTop: 2 }}>{detail}</Text>
      </View>
      <View
        style={{
          minHeight: 38,
          paddingHorizontal: space.x4 + 2,
          borderRadius: radii.pill,
          backgroundColor: palette.ink,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ ...type.buttonLabel, fontSize: 11, color: palette.paper }}>Resume</Text>
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Avatar + IconCircle — frame B1 header: two 44px circles
// ---------------------------------------------------------------------------
export function Avatar({ initial, onPress }: { initial: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Your account"
      style={{
        width: touch.min,
        height: touch.min,
        borderRadius: touch.min / 2,
        backgroundColor: palette.ink,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ ...type.body, fontSize: 15, fontWeight: "600", color: palette.paper }}>
        {initial.toUpperCase()}
      </Text>
    </Pressable>
  );
}

export function IconCircle({
  children,
  badge,
  onPress,
  accessibilityLabel,
}: {
  children: ReactNode;
  badge?: boolean;
  onPress?: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={{
        width: touch.min,
        height: touch.min,
        borderRadius: touch.min / 2,
        borderWidth: 1,
        borderColor: palette.mist,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
      {badge && (
        <View
          style={{
            position: "absolute",
            top: 10,
            right: 11,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: palette.coral,
            borderWidth: 1.5,
            borderColor: palette.paper,
          }}
        />
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Toggle — handoff "Toggle spec": 46×26 track, radius 13; knob 20px white,
// top 3, left 3 off / left 23 on; track mist → ink; 180ms ease.
// ---------------------------------------------------------------------------
const TRACK_W = 46;
const TRACK_H = 26;
const KNOB = 20;
const KNOB_OFF = 3;
const KNOB_ON = 23;
const TOGGLE_MS = 180;

export function Toggle({
  value,
  onValueChange,
  disabled,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  accessibilityLabel: string;
}) {
  const t = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(t, {
      toValue: value ? 1 : 0,
      duration: TOGGLE_MS,
      easing: Easing.inOut(Easing.ease),
      // `left` and `backgroundColor` are not compositor-only, so this cannot run
      // on the UI thread. 180ms on a 46px track is cheap enough that the
      // alternative — a transform-driven knob plus a cross-faded second track —
      // would be more moving parts than the animation is worth.
      useNativeDriver: false,
    }).start();
  }, [value, t]);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      // The 26px track is under the 44px floor, so the HIT AREA is padded out
      // rather than the control drawn larger — the frame's proportions survive
      // and the target still clears AA.
      hitSlop={{ top: 9, bottom: 9, left: 6, right: 6 }}
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <Animated.View
        style={{
          width: TRACK_W,
          height: TRACK_H,
          borderRadius: TRACK_H / 2,
          backgroundColor: t.interpolate({
            inputRange: [0, 1],
            outputRange: [palette.mist, palette.ink],
          }),
        }}
      >
        <Animated.View
          style={{
            position: "absolute",
            top: KNOB_OFF,
            width: KNOB,
            height: KNOB,
            borderRadius: KNOB / 2,
            backgroundColor: derived.white,
            left: t.interpolate({ inputRange: [0, 1], outputRange: [KNOB_OFF, KNOB_ON] }),
          }}
        />
      </Animated.View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// SettingRow — frame B2 settings list: title, 13px stone sub, trailing Toggle.
// ---------------------------------------------------------------------------
export function SettingRow({
  title,
  detail,
  value,
  onValueChange,
  disabled,
  last,
}: {
  title: string;
  detail: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  last?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 15,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: palette.mist,
        minHeight: touch.min,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ ...type.body, fontSize: 15, fontWeight: "600" }}>{title}</Text>
        <Text style={type.bodySecondary}>{detail}</Text>
      </View>
      <Toggle
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        accessibilityLabel={title}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// CircleAction — frame B2 action row: 48px outlined circle beside the Share pill
// ---------------------------------------------------------------------------
const CIRCLE = 48;

export function CircleAction({
  children,
  onPress,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({
        width: CIRCLE,
        height: CIRCLE,
        borderRadius: CIRCLE / 2,
        borderWidth: 1,
        borderColor: palette.mist,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {children}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// ModerationCard — frames B2 + B4: coral-bordered, "n messages waiting on you"
// ---------------------------------------------------------------------------
export function ModerationCard({
  title,
  detail,
  actionLabel = "Review",
  onPress,
}: {
  title: string;
  detail: string;
  actionLabel?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}. ${actionLabel}`}
      style={({ pressed }) => ({
        borderWidth: 1,
        borderColor: palette.coral,
        borderRadius: radii.md,
        paddingVertical: space.x4,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        opacity: pressed ? 0.7 : 1,
        minHeight: touch.min,
      })}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ ...type.body, fontSize: 15, fontWeight: "600" }}>{title}</Text>
        <Text style={{ ...type.bodySecondary, marginTop: 2 }}>{detail}</Text>
      </View>
      {/* coralDeep, not coral: #D45847 measures 3.94:1 on paper and this label
          is 12px/600 — bold under 18.66px is NOT WCAG "large text". Same
          correction the primary CTA already carries. */}
      <Text style={{ ...type.buttonLabel, letterSpacing: 12 * 0.06, color: derived.coralDeep }}>
        {actionLabel}
      </Text>
    </Pressable>
  );
}
