/**
 * Selection + input atoms shared by the create wizard, mirroring the mockup's
 * `.ocard` / `.rcard` / `.radio` / `.drop` / `.cc` / `.progressbar` /
 * `.sumcard` classes in `tadaaaa/tadaaaa-editorial.html`.
 *
 * They live beside `./chrome` (rather than inside it) purely to keep both files
 * under the 800-line ceiling; `./index` re-exports everything, so callers only
 * ever import from `@/components/editorial`.
 *
 * The selected state follows the mockup's border/padding trade exactly —
 * `.ocard{border:1px;padding:16px 18px}` → `.ocard.on{border:2px;padding:15px 17px}`
 * — so turning a card on never shifts its content by a pixel.
 */
import type { ReactNode } from "react";
import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { TOUCH_MIN } from "./chrome";
import { derived, fonts, palette, radii, LINE_HEIGHT_BODY_RATIO } from "@/theme/tokens";

/* --------------------------------------------------------------- ocard/rcard */

const CARD_PAD_V = 16;
const CARD_PAD_H = 18;

/**
 * `.ocard` / `.rcard` — a whole-row option. `left` hosts the mockup's 26px
 * stroked glyph (or the `.rcard .shot` preview); `right` hosts a trailing badge.
 */
export function EdSelectCard({
  selected,
  onPress,
  left,
  title,
  sub,
  right,
  footer,
  accessibilityLabel,
  style,
}: {
  selected: boolean;
  onPress: () => void;
  left?: ReactNode;
  title: string;
  sub?: string;
  right?: ReactNode;
  footer?: ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? (sub ? `${title}. ${sub}` : title)}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
          minHeight: TOUCH_MIN,
          backgroundColor: palette.paper,
          borderRadius: radii.md,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? palette.coral : pressed ? palette.stone : palette.mist,
          paddingVertical: selected ? CARD_PAD_V - 1 : CARD_PAD_V,
          paddingHorizontal: selected ? CARD_PAD_H - 1 : CARD_PAD_H,
        },
        style,
      ]}
    >
      {left}
      <View style={{ flex: 1, gap: 3 }}>
        <Text
          style={{
            fontFamily: fonts.heading,
            fontWeight: "400",
            fontSize: 17,
            color: palette.ink,
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
        {footer}
      </View>
      {right}
    </Pressable>
  );
}

/* -------------------------------------------------------------------- radio */

const RADIO_PAD_V = 13;
const RADIO_PAD_H = 16;

/** `.radio` — hairline row with the mockup's 16px `.rd` dot. */
export function EdRadioRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={label}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minHeight: TOUCH_MIN,
        backgroundColor: palette.paper,
        borderRadius: radii.sm,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? palette.coral : palette.mist,
        paddingVertical: selected ? RADIO_PAD_V - 1 : RADIO_PAD_V,
        paddingHorizontal: selected ? RADIO_PAD_H - 1 : RADIO_PAD_H,
      }}
    >
      <View
        style={{
          width: 16,
          height: 16,
          borderRadius: 8,
          borderWidth: 1.5,
          borderColor: selected ? palette.coral : palette.stone,
          padding: 1.5,
        }}
      >
        {selected ? (
          <View style={{ flex: 1, borderRadius: 6, backgroundColor: palette.coral }} />
        ) : null}
      </View>
      <Text style={{ fontFamily: fonts.body, fontSize: 14, color: palette.ink }}>{label}</Text>
    </Pressable>
  );
}

/* --------------------------------------------------------------------- drop */

/**
 * `.drop` — `1.5px dashed var(--mist)`, coral on hover/drag. React Native has no
 * hover, so the coral edge is bound to the press state instead.
 */
export function EdDropZone({
  title,
  hint,
  onPress,
  accessibilityLabel,
  disabled,
}: {
  title: string;
  hint: string;
  onPress: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      style={({ pressed }) => ({
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: pressed ? palette.coral : palette.mist,
        borderRadius: radii.md,
        backgroundColor: palette.paper,
        paddingVertical: 30,
        paddingHorizontal: 20,
        alignItems: "center",
        gap: 6,
        opacity: disabled ? 0.55 : 1,
      })}
    >
      <Text style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: "600", color: palette.ink }}>
        {title}
      </Text>
      <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.stone, textAlign: "center" }}>
        {hint}
      </Text>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ counter */

/** `.cc{font-size:12px;color:var(--stone);text-align:right;margin-top:5px}` */
export function EdCounter({ used, max }: { used: number; max: number }) {
  const near = used > max * 0.9;
  return (
    <Text
      style={{
        fontFamily: fonts.body,
        fontSize: 12,
        color: near ? derived.coralDeep : palette.stone,
        textAlign: "right",
        marginTop: 5,
      }}
    >
      {used}/{max}
    </Text>
  );
}

/* -------------------------------------------------------------- progressbar */

/** `.progressbar{height:3px;background:var(--mist)}` with a coral fill. */
export function EdProgressBar({ progress }: { progress: number }) {
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={{ height: 3, borderRadius: 2, backgroundColor: palette.mist, overflow: "hidden" }}
    >
      <View style={{ height: "100%", width: `${pct * 100}%`, backgroundColor: palette.coral }} />
    </View>
  );
}

/* ------------------------------------------------------------------ sumcard */

/** `.sumcard` — hairline-boxed key/value rows, last row without a rule. */
export function EdSummaryCard({ rows }: { rows: { key: string; value: string }[] }) {
  return (
    <View style={{ borderWidth: 1, borderColor: palette.mist, borderRadius: radii.md }}>
      {rows.map((r, i) => (
        <View
          key={r.key}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 16,
            paddingVertical: 12,
            paddingHorizontal: 18,
            borderBottomWidth: i === rows.length - 1 ? 0 : 1,
            borderBottomColor: palette.mist,
          }}
        >
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: palette.stone }}>{r.key}</Text>
          <Text
            style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: "600", color: palette.ink, flexShrink: 1, textAlign: "right" }}
          >
            {r.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ paywall */

/** `.paywall{border:2px solid var(--coral);border-radius:var(--r-md);padding:26px}` */
export function EdPaywall({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <View
      style={{
        borderWidth: 2,
        borderColor: palette.coral,
        borderRadius: radii.md,
        padding: 26,
        gap: 6,
        alignItems: "center",
      }}
    >
      <Text style={{ fontFamily: fonts.heading, fontWeight: "400", fontSize: 20, color: palette.ink, textAlign: "center" }}>
        {title}
      </Text>
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: 14,
          lineHeight: 14 * LINE_HEIGHT_BODY_RATIO,
          color: palette.stone,
          textAlign: "center",
          marginBottom: 12,
        }}
      >
        {body}
      </Text>
      {children}
    </View>
  );
}
