/**
 * C6 — Preview & publish.
 *
 * Frame anatomy: a 112×200 mini reveal beside a "Play full preview" pill and the
 * content line · a four-row summary table with stone keys and 600-weight ink
 * values · the paywall card, ONLY when the theme is premium and the tier is free
 * · a determinate publish progress bar with "Crafting your surprise…".
 *
 * DEVIATION — the paywall's payment rail. The frame says "Charged to your App
 * Store account" because the handoff mandates StoreKit 2. Production sells
 * through Stripe Checkout in an in-app browser (`api.ts → createStripeCheckout`,
 * "no Apple cut"), and that decision predates this build. The card therefore
 * says what actually happens rather than promising a rail that is not wired.
 * The conflict is real and is flagged, not papered over.
 */
import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { EdButton, derived, palette } from "@/components/editorial";
import { contentLine, summaryRows } from "@/lib/publish-summary";
import { PREMIUM_THEME_PRICE } from "@/lib/constants";
import { getThemeById, gradientStops } from "@/lib/themes";
import { occasionLabel } from "@/lib/occasions";
import type { RevealStyle } from "@/lib/schema-adapter";
import type { ScheduleMode } from "@/lib/wizard";
import type { Tier } from "@/lib/tier";
import { radii, space, touch, type } from "@/theme/tokens";

const MINI_W = 112;
const MINI_H = 200;

export function PreviewPublishStep({
  occasion,
  title,
  themeId,
  revealStyle,
  scheduleMode,
  scheduledAt,
  timezone,
  photos,
  approvedContributions,
  contributionsOpen,
  musicEnabled,
  pin,
  tier,
  showPaywall,
  publishProgress,
  onPlayPreview,
  onUnlockTheme,
  onGoUnlimited,
}: {
  occasion: string;
  title: string;
  themeId: string;
  revealStyle: RevealStyle;
  scheduleMode: ScheduleMode;
  scheduledAt: string | null;
  timezone: string | null;
  photos: number;
  approvedContributions: number;
  contributionsOpen: boolean;
  musicEnabled: boolean;
  pin: string | null;
  tier: Tier;
  showPaywall: boolean;
  /** 0-1 while publishing, null when idle. */
  publishProgress: number | null;
  onPlayPreview: () => void;
  onUnlockTheme: () => void;
  onGoUnlimited: () => void;
}) {
  const theme = getThemeById(themeId);
  const stops = theme ? gradientStops(theme) : [palette.pebble, palette.mist];
  const rows = summaryRows({
    revealStyle,
    scheduleMode,
    scheduledAt,
    timezone,
    approvedContributions,
    contributionsOpen,
    tier,
  });

  return (
    <View>
      <View style={{ flexDirection: "row", gap: space.x4, marginBottom: space.x5 }}>
        <View
          style={{
            width: MINI_W,
            height: MINI_H,
            borderRadius: radii.md,
            overflow: "hidden",
            backgroundColor: palette.ink,
          }}
        >
          <LinearGradient
            colors={stops as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: "absolute", inset: 0, opacity: 0.3 }}
          />
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              padding: 14,
            }}
          >
            <Text
              style={{ ...type.revealMicroLabel, fontSize: 8, letterSpacing: 8 * 0.14 }}
              numberOfLines={1}
            >
              {occasionLabel(occasion)}
            </Text>
            <Text
              style={{
                ...type.revealHeadline,
                fontSize: 15,
                lineHeight: 15 * 1.2,
                textAlign: "center",
                marginTop: 6,
              }}
              numberOfLines={3}
            >
              {title || "Untitled"}
            </Text>
          </View>
        </View>

        <View style={{ flex: 1, justifyContent: "center", gap: 9 }}>
          <EdButton title="Play full preview" variant="ink" onPress={onPlayPreview} />
          <Text style={{ ...type.bodySecondary, lineHeight: 13 * 1.5 }}>
            {contentLine({ photos, approvedContributions, musicEnabled, pin })}
          </Text>
        </View>
      </View>

      <View
        style={{
          borderWidth: 1,
          borderColor: palette.mist,
          borderRadius: radii.md,
          marginBottom: 16,
        }}
      >
        {rows.map((r, i) => (
          <View
            key={r.key}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderBottomWidth: i === rows.length - 1 ? 0 : 1,
              borderBottomColor: palette.mist,
              gap: 12,
            }}
          >
            <Text style={{ ...type.body, fontSize: 14, color: palette.stone }}>{r.key}</Text>
            <Text
              style={{ ...type.body, fontSize: 14, fontWeight: "600", flexShrink: 1, textAlign: "right" }}
            >
              {r.value}
            </Text>
          </View>
        ))}
      </View>

      {showPaywall ? (
        <View
          style={{
            borderWidth: 2,
            borderColor: palette.coral,
            borderRadius: radii.md,
            padding: 18,
            alignItems: "center",
          }}
        >
          <Text style={{ ...type.screenTitle, fontSize: 20, marginBottom: 6 }}>
            This theme is premium.
          </Text>
          <Text
            style={{
              ...type.body,
              fontSize: 14,
              lineHeight: 14 * 1.55,
              color: palette.stone,
              textAlign: "center",
              marginBottom: 14,
            }}
          >
            Unlock it once, or go Unlimited and stop thinking about it.
          </Text>
          <View style={{ flexDirection: "row", gap: 9, alignSelf: "stretch" }}>
            <View style={{ flex: 1 }}>
              <EdButton
                title={`Unlock $${PREMIUM_THEME_PRICE.toFixed(2)}`}
                onPress={onUnlockTheme}
              />
            </View>
            <View style={{ flex: 1 }}>
              <EdButton title="Unlimited" variant="line" onPress={onGoUnlimited} />
            </View>
          </View>
          <Text style={{ ...type.bodySecondary, fontSize: 11, marginTop: 10, textAlign: "center" }}>
            Opens a secure Stripe checkout
          </Text>
        </View>
      ) : null}

      {publishProgress !== null ? (
        <View style={{ marginTop: space.x5 }}>
          <Text style={{ ...type.bodySecondary, marginBottom: space.x2 }}>
            Crafting your surprise…
          </Text>
          <View
            style={{
              height: 4,
              borderRadius: 2,
              backgroundColor: palette.mist,
              overflow: "hidden",
            }}
            accessible
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: Math.round(publishProgress * 100) }}
          >
            <View
              style={{
                width: `${Math.max(4, Math.round(publishProgress * 100))}%`,
                height: "100%",
                backgroundColor: derived.coralDeep,
              }}
            />
          </View>
        </View>
      ) : null}

      <View style={{ height: touch.min }} />
    </View>
  );
}
