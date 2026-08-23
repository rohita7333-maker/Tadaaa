/**
 * Frame B5 panels — the bar chart, the funnel and the device split, plus the
 * free-tier lock that sits over all three.
 *
 * Split out of `app/analytics/[id].tsx` so the screen stays a data-loading
 * container and the drawing stays testable by eye against the frame. Every
 * dimension below is the frame's own: 110px chart, 9px column gap, radius
 * `3 3 0 0`, 22px funnel bar with an 8px inset label, 96px funnel label
 * column, 1px pebble row dividers.
 */
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { Lock } from "lucide-react-native";
import { derived, palette, radii, space, touch, type } from "@/theme/tokens";
import type { AnalyticsBar, AnalyticsDevice, FunnelRow, FunnelTone } from "@/lib/analytics";

/* ------------------------------------------------------------------ panel */

/** 1px mist / radius 12 / 16px pad, with an 18px serif heading. */
export function AnalyticsPanel({
  title,
  headingGap,
  children,
}: {
  title: string;
  /** The frame uses 16 under the chart, 14 under the funnel, 12 under rows. */
  headingGap: number;
  children: ReactNode;
}) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: palette.mist,
        borderRadius: radii.md,
        padding: 16,
        backgroundColor: palette.paper,
      }}
    >
      <Text
        style={{ ...type.screenTitle, fontSize: 18, lineHeight: 18 * 1.15, marginBottom: headingGap }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

/* -------------------------------------------------------------- bar chart */

const CHART_HEIGHT = 110;
/** A zero day still draws a hairline, so the axis reads as seven days. */
const MIN_BAR = 2;

const BAR_FILL = {
  peak: palette.coral,
  second: palette.sand,
  base: palette.pebble,
} as const;

export function ViewsBarChart({ bars }: { bars: readonly AnalyticsBar[] }) {
  return (
    <View
      style={{ flexDirection: "row", alignItems: "flex-end", gap: 9, height: CHART_HEIGHT }}
      accessibilityRole="summary"
      accessibilityLabel={
        bars.length === 0
          ? "No view data"
          : `Views by day: ${bars.map((b) => `${b.label} ${b.count}`).join(", ")}`
      }
    >
      {bars.map((bar) => (
        <View
          key={bar.day}
          style={{ flex: 1, alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}
        >
          <View
            style={{
              width: "100%",
              // The 6px gap and the 11px label eat into the 110px track; the
              // percentage is of the BAR area, not the whole column, or a
              // 100% bar would push its own label off the panel.
              height: Math.max(MIN_BAR, ((CHART_HEIGHT - 24) * bar.heightPct) / 100),
              backgroundColor: BAR_FILL[bar.tone],
              borderTopLeftRadius: 3,
              borderTopRightRadius: 3,
            }}
          />
          <Text style={{ ...type.bodySecondary, fontSize: 11, lineHeight: 13 }}>{bar.label}</Text>
        </View>
      ))}
    </View>
  );
}

/* ----------------------------------------------------------------- funnel */

/**
 * Fill + label colour per funnel step.
 *
 * The frame sets an 11px/600 PAPER label inside every bar, including the sand
 * one. Paper on sand measures 2.09:1 — it is the least legible pairing in the
 * whole system. Sand keeps its fill (the frame's ramp is the point) and takes
 * an INK label instead, 8.26:1. Coral moves to `coralDeep`: paper on plain
 * coral is 3.97:1, under the AA floor for an 11px bold label.
 *
 * Exported so `theme/__tests__/contrast.test.ts` recomputes these three
 * pairings from the real tokens on every run rather than trusting this note.
 */
export const FUNNEL_TONES: Record<FunnelTone, { fill: string; label: string }> = {
  ink: { fill: palette.ink, label: palette.paper },
  sand: { fill: palette.sand, label: palette.ink },
  coral: { fill: derived.coralDeep, label: palette.paper },
};

const FUNNEL_LABEL_COL = 96;
const FUNNEL_BAR_H = 22;

/** The frame's in-bar percentage: 11px / 600, sentence case, no tracking. */
const PERCENT_TYPE = {
  ...type.buttonLabel,
  fontSize: 11,
  letterSpacing: 0,
  textTransform: "none",
} as const;

export function FunnelBars({ rows }: { rows: readonly FunnelRow[] }) {
  return (
    <View style={{ gap: 9 }}>
      {rows.map((row) => {
        const tone = FUNNEL_TONES[row.tone];
        return (
          <View
            key={row.key}
            style={{ flexDirection: "row", alignItems: "center", gap: space.x3 }}
            accessibilityLabel={`${row.label}: ${row.count}, ${row.percent} percent`}
          >
            <Text style={{ ...type.bodySecondary, fontSize: 13, width: FUNNEL_LABEL_COL }}>
              {row.label}
            </Text>
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: space.x2 }}>
              <View
                style={{
                  // A 0% step still shows a stub so the row is not a blank gap
                  // that reads as "failed to load".
                  width: `${Math.max(row.percent, 8)}%`,
                  height: FUNNEL_BAR_H,
                  backgroundColor: tone.fill,
                  borderRadius: 4,
                  justifyContent: "center",
                  paddingLeft: row.labelInside ? space.x2 : 0,
                }}
              >
                {row.labelInside ? (
                  <Text numberOfLines={1} style={{ ...PERCENT_TYPE, color: tone.label }}>
                    {row.percent}%
                  </Text>
                ) : null}
              </View>
              {row.labelInside ? null : (
                <Text numberOfLines={1} style={{ ...PERCENT_TYPE, color: palette.ink }}>
                  {row.percent}%
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* ----------------------------------------------------------------- device */

export function DeviceRows({ devices }: { devices: readonly AnalyticsDevice[] }) {
  return (
    <View>
      {devices.map((d, i) => (
        <View
          key={d.label}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingVertical: 7,
            borderBottomWidth: i === devices.length - 1 ? 0 : 1,
            borderBottomColor: palette.pebble,
          }}
        >
          <Text style={{ ...type.bodySecondary, fontSize: 14 }}>{d.label}</Text>
          <Text style={{ ...type.body, fontSize: 14, fontWeight: "700" }}>{d.count}</Text>
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------- lock */

/**
 * The free-tier cover.
 *
 * What is underneath is NOT the real numbers dimmed — `get_invite_analytics`
 * withholds `days` and `devices` from a free caller entirely, so the shapes
 * below are empty placeholders. The whole stack is hidden from assistive tech
 * (`accessibilityElementsHidden` + `importantForAccessibility`), because a
 * screen reader would otherwise walk straight past the blur and read out
 * meaningless placeholder geometry.
 */
export function LockedPanels({ onUnlock }: { onUnlock: () => void }) {
  return (
    <View>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={{ gap: space.x4 }}
      >
        <AnalyticsPanel title="Views, last 7 days" headingGap={16}>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 9, height: CHART_HEIGHT }}>
            {[34, 58, 41, 76, 62, 88, 104].map((h, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: h,
                  backgroundColor: palette.pebble,
                  borderTopLeftRadius: 3,
                  borderTopRightRadius: 3,
                }}
              />
            ))}
          </View>
        </AnalyticsPanel>
        <AnalyticsPanel title="How far they got" headingGap={14}>
          <View style={{ gap: 9 }}>
            {[100, 68, 44].map((w) => (
              <View
                key={w}
                style={{
                  width: `${w}%`,
                  height: FUNNEL_BAR_H,
                  backgroundColor: palette.pebble,
                  borderRadius: 4,
                }}
              />
            ))}
          </View>
        </AnalyticsPanel>
        <AnalyticsPanel title="What they opened it on" headingGap={12}>
          <View style={{ gap: 14, paddingVertical: 7 }}>
            {[1, 2, 3].map((k) => (
              <View key={k} style={{ height: 12, borderRadius: 4, backgroundColor: palette.pebble }} />
            ))}
          </View>
        </AnalyticsPanel>
      </View>

      <BlurView
        intensity={18}
        tint="light"
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: radii.md }}
      />

      <Pressable
        onPress={onUnlock}
        accessibilityRole="button"
        accessibilityLabel="Unlock full analytics"
        accessibilityHint="Opens the plans screen"
        style={({ pressed }) => ({
          position: "absolute",
          left: space.x5,
          right: space.x5,
          top: "42%",
          minHeight: touch.control,
          borderRadius: radii.pill,
          backgroundColor: derived.coralDeep,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: space.x2,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Lock size={14} color={palette.paper} strokeWidth={1.8} />
        <Text style={{ ...type.buttonLabel, color: palette.paper }}>Unlock full analytics</Text>
      </Pressable>
    </View>
  );
}
