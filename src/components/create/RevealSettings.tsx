import { Pressable, Switch, View } from "react-native";
import { Clock, Hand } from "lucide-react-native";
import { Txt, colors, fonts, radii, spacing } from "@/components/ui";

interface Props {
  revealType: "tap" | "countdown";
  countdownDate: string; // ISO or ""
  expiresAt: string; // ISO or ""
  hasExpiry: boolean;
  acceptContributions: boolean;
  enableDodgeNo: boolean;
  onRevealTypeChange: (v: "tap" | "countdown") => void;
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

function DatePickerRow({
  value,
  onChange,
}: {
  value: string;
  onChange: (iso: string) => void;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {DAY_OFFSETS.map((opt) => {
          const iso = computeDate(opt).toISOString();
          const selected = value === iso;
          return (
            <Pressable
              key={opt.label}
              onPress={() => onChange(iso)}
              style={({ pressed }) => ({
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: radii.pill,
                borderWidth: 1,
                borderColor: selected ? colors.rose : colors.lightGray,
                backgroundColor: selected ? colors.roseChipBg : colors.white,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              })}
            >
              <Txt
                style={{
                  fontFamily: fonts.bodyMedium,
                  fontSize: 12,
                  color: selected ? colors.roseDeep : colors.warmGray,
                }}
              >
                {opt.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      {value ? (
        <Txt variant="body" muted style={{ fontSize: 12 }}>
          Set for {formatFriendly(value)}
        </Txt>
      ) : null}
    </View>
  );
}

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
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.sm }}>
        <Txt variant="label">Reveal mechanic</Txt>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {(
            [
              { key: "tap", label: "Tap to Reveal", sub: "They tap to open", Icon: Hand },
              { key: "countdown", label: "Countdown", sub: "Build anticipation", Icon: Clock },
            ] as const
          ).map(({ key, label, sub, Icon }) => {
            const selected = revealType === key;
            return (
              <Pressable
                key={key}
                onPress={() => onRevealTypeChange(key)}
                style={({ pressed }) => ({
                  flex: 1,
                  alignItems: "center",
                  gap: 6,
                  padding: spacing.md,
                  borderRadius: radii.lg,
                  borderWidth: 2,
                  borderColor: selected ? colors.rose : colors.lightGray,
                  backgroundColor: selected ? colors.roseChipBg : colors.white,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <Icon size={22} color={selected ? colors.rose : colors.warmGray} />
                <Txt
                  style={{
                    fontFamily: fonts.bodyMedium,
                    fontSize: 13,
                    color: selected ? colors.roseDeep : colors.charcoal,
                  }}
                >
                  {label}
                </Txt>
                <Txt variant="body" muted style={{ fontSize: 10.5 }}>
                  {sub}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      </View>

      {revealType === "countdown" && (
        <View style={{ gap: spacing.sm }}>
          <Txt variant="label">Reveal date &amp; time</Txt>
          <DatePickerRow value={countdownDate} onChange={onCountdownDateChange} />
        </View>
      )}

      <ToggleRow
        title="Set expiry date"
        subtitle="Surprise auto-expires on this date"
        value={hasExpiry}
        onChange={onHasExpiryChange}
      />
      {hasExpiry && (
        <View style={{ gap: spacing.sm }}>
          <Txt variant="label">Expiry date</Txt>
          <DatePickerRow value={expiresAt} onChange={onExpiresAtChange} />
        </View>
      )}

      <ToggleRow
        title="Let family contribute photos/messages"
        subtitle="Get a second link to send to people who want to add memories"
        value={acceptContributions}
        onChange={onAcceptContributionsChange}
      />

      <ToggleRow
        title="Dodging No button"
        subtitle="No button runs away when tapped near"
        value={enableDodgeNo}
        onChange={onEnableDodgeNoChange}
      />
    </View>
  );
}

function ToggleRow({
  title,
  subtitle,
  value,
  onChange,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing.md,
        padding: spacing.md,
        borderRadius: radii.lg,
        backgroundColor: colors.cream,
        borderWidth: 1,
        borderColor: colors.hair,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Txt style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.charcoal }}>{title}</Txt>
        <Txt variant="body" muted style={{ fontSize: 11 }}>
          {subtitle}
        </Txt>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.rose, false: colors.lightGray }}
        thumbColor="#fff"
      />
    </View>
  );
}
