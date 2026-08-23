/**
 * `w4` + `w5` in `tadaaaa/tadaaaa-editorial.html` — the `.rsel` / `.rcard`
 * reveal picker (each card carrying a 74x104 `.shot` of the style), and the
 * `.tglrow` switch rows, which are exactly the shape of the shipped `EdSetRow`.
 *
 * The mockup's `.shot` previews animate (`mscroll` / `mpulse`). They ship static
 * here: three looping animations behind a picker is motion without a job, and
 * the still frame already reads the difference between the three styles.
 */
import { Pressable, Text, View } from "react-native";
import {
  EdHairline,
  EdSetRow,
  EdSwitch,
  fieldStyles,
  fonts,
  palette,
  radii,
} from "@/components/editorial";
import { spacing } from "@/components/ui";

interface Props {
  revealType: "tap" | "countdown" | "scroll_story";
  countdownDate: string; // ISO or ""
  expiresAt: string; // ISO or ""
  hasExpiry: boolean;
  acceptContributions: boolean;
  enableDodgeNo: boolean;
  onRevealTypeChange: (v: "tap" | "countdown" | "scroll_story") => void;
  onCountdownDateChange: (v: string) => void;
  onExpiresAtChange: (v: string) => void;
  onHasExpiryChange: (v: boolean) => void;
  onAcceptContributionsChange: (v: boolean) => void;
  onEnableDodgeNoChange: (v: boolean) => void;
}

const DAY_OFFSETS = [
  { label: "In 1 hour", ms: 60 * 60 * 1000 },
  { label: "Tonight (8pm)", tonight: true },
  { label: "Tomorrow", ms: 24 * 60 * 60 * 1000 },
  { label: "In 3 days", ms: 3 * 24 * 60 * 60 * 1000 },
  { label: "In 1 week", ms: 7 * 24 * 60 * 60 * 1000 },
];

function computeDate(opt: (typeof DAY_OFFSETS)[number]): Date {
  const now = new Date();
  if (opt.tonight) {
    const d = new Date(now);
    d.setHours(20, 0, 0, 0);
    if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
    return d;
  }
  return new Date(now.getTime() + (opt.ms ?? 0));
}

function formatFriendly(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* --------------------------------------------------------------- date chips */

function DatePickerRow({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {DAY_OFFSETS.map((opt) => {
          const iso = computeDate(opt).toISOString();
          const selected = value === iso;
          return (
            <Pressable
              key={opt.label}
              onPress={() => onChange(iso)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={opt.label}
              hitSlop={8}
              style={{
                minHeight: 36,
                justifyContent: "center",
                paddingHorizontal: 12,
                borderRadius: radii.pill,
                borderWidth: 1,
                borderColor: selected ? palette.ink : palette.mist,
                backgroundColor: selected ? palette.ink : palette.paper,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 13,
                  color: selected ? palette.paper : palette.stone,
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {value ? (
        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.stone }}>
          Set for {formatFriendly(value)}
        </Text>
      ) : null}
    </View>
  );
}

/* --------------------------------------------------------------- shot stills */

/** `.rcard .shot{width:74px;height:104px;border:1px solid var(--mist)}` */
function Shot({ kind }: { kind: "tap" | "countdown" | "scroll_story" }) {
  return (
    <View
      style={{
        width: 74,
        height: 104,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: palette.mist,
        overflow: "hidden",
        backgroundColor: palette.ink,
      }}
    >
      {kind === "scroll_story" ? (
        <>
          <View style={{ flex: 1, backgroundColor: palette.ink }} />
          <View style={{ flex: 1, backgroundColor: palette.pebble }} />
        </>
      ) : kind === "tap" ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: 26, height: 32, borderRadius: 4, backgroundColor: palette.sand }} />
        </View>
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text
            style={{
              fontFamily: fonts.heading,
              fontWeight: "400",
              fontSize: 12,
              color: palette.sand,
            }}
          >
            03:12:44
          </Text>
        </View>
      )}
    </View>
  );
}

/* -------------------------------------------------------------------- main */

/**
 * Verbatim from web's `STYLES` in
 * `surprise-invite/src/components/create/RevealSettings.tsx`. The picker names
 * are web's picker names and the blurbs are web's blurbs; mobile previously
 * re-worded all six strings and, worse, disagreed with its own summary chips.
 */
const REVEAL_STYLES = [
  {
    key: "tap",
    label: "Tap to reveal",
    sub: "One tap. Everything at once.",
  },
  {
    key: "countdown",
    label: "Countdown",
    sub: "Anticipation, to the second.",
  },
  {
    key: "scroll_story",
    label: "Scroll story",
    sub: "A cinematic scroll, scene by scene.",
  },
] as const;

export default function RevealSettings({
  revealType,
  countdownDate,
  expiresAt,
  hasExpiry,
  acceptContributions,
  enableDodgeNo,
  onRevealTypeChange,
  onCountdownDateChange,
  onExpiresAtChange,
  onHasExpiryChange,
  onAcceptContributionsChange,
  onEnableDodgeNoChange,
}: Props) {
  return (
    <View style={{ gap: spacing.xl }}>
      <View style={{ gap: 12 }}>
        <Text style={fieldStyles.label}>Pick how it unfolds</Text>
        {REVEAL_STYLES.map(({ key, label, sub }) => {
          const selected = revealType === key;
          return (
            <Pressable
              key={key}
              onPress={() => onRevealTypeChange(key)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${label}. ${sub}`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 16,
                backgroundColor: palette.paper,
                borderRadius: radii.md,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? palette.coral : palette.mist,
                padding: selected ? 15 : 16,
              }}
            >
              <Shot kind={key} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text
                  style={{ fontFamily: fonts.heading, fontWeight: "400", fontSize: 17, color: palette.ink }}
                >
                  {label}
                </Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.stone }}>{sub}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {revealType === "countdown" ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={fieldStyles.label}>Reveal date &amp; time</Text>
          <DatePickerRow value={countdownDate} onChange={onCountdownDateChange} />
        </View>
      ) : null}

      <View>
        <EdHairline />
        <EdSetRow
          title="Set an expiry date"
          sub="The link stops working after this moment."
          right={
            <EdSwitch
              value={hasExpiry}
              onValueChange={onHasExpiryChange}
              accessibilityLabel="Toggle expiry date"
            />
          }
        />
        {hasExpiry ? (
          <View style={{ gap: spacing.sm, paddingBottom: spacing.lg }}>
            <Text style={fieldStyles.label}>Expiry date</Text>
            <DatePickerRow value={expiresAt} onChange={onExpiresAtChange} />
          </View>
        ) : null}

        <EdSetRow
          title="Group contributions"
          sub="Friends add words and photos before it goes live. You approve each one."
          right={
            <EdSwitch
              value={acceptContributions}
              onValueChange={onAcceptContributionsChange}
              accessibilityLabel="Toggle group contributions"
            />
          }
        />

        <EdSetRow
          title={'Dodging "No" button'}
          sub="The No runs away when they reach for it. A classic."
          last
          right={
            <EdSwitch
              value={enableDodgeNo}
              onValueChange={onEnableDodgeNoChange}
              accessibilityLabel="Toggle dodging No button"
            />
          }
        />
      </View>
    </View>
  );
}
