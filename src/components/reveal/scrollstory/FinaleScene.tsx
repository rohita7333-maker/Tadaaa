/**
 * FinaleScene — Scene 6: night sky finale with a live countdown + free-tier
 * attribution pill.
 *
 * GRADIENT SEAM CONTRACT: first stop SEAM_RSVP_TO_FINALE === RsvpScene's
 * final stop.
 */
import { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import type { StoryConfig } from "@/lib/scroll-story/config";
import { Txt, fonts, radii } from "@/components/ui";
import { palette } from "@/theme/tokens";
import { FINALE_NIGHT, SERIF_FONT, SEAM_RSVP_TO_FINALE, particleLayout } from "./shared";

const STAR_COUNT = 30;
const TICK_MS = 1000;

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function remainingUntil(target: number, now: number): Remaining {
  // Floor to 00 when the moment has passed.
  const diff = Math.max(0, target - now);
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

interface FinaleSceneProps {
  config: StoryConfig;
  reduced: boolean;
}

export default function FinaleScene({ config, reduced }: FinaleSceneProps) {
  const router = useRouter();
  // null until first tick so there's never a flash of a wrong value.
  const [remaining, setRemaining] = useState<Remaining | null>(null);

  const stars = useMemo(() => particleLayout(`${config.slug}-finale-stars`, STAR_COUNT), [config.slug]);

  useEffect(() => {
    if (!config.countdownTo) return;
    const target = new Date(config.countdownTo).getTime();
    if (Number.isNaN(target)) return;
    const tick = () => setRemaining(remainingUntil(target, Date.now()));
    tick();
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [config.countdownTo]);

  const units: Array<{ label: string; value: string }> = [
    { label: "Days", value: remaining ? pad(remaining.days) : "00" },
    { label: "Hrs", value: remaining ? pad(remaining.hours) : "00" },
    { label: "Min", value: remaining ? pad(remaining.minutes) : "00" },
    { label: "Sec", value: remaining ? pad(remaining.seconds) : "00" },
  ];

  return (
    <LinearGradient
      colors={[SEAM_RSVP_TO_FINALE, "#8A3F35", "#522C28", "#2B2020", FINALE_NIGHT]}
      locations={[0, 0.2, 0.44, 0.7, 1]}
      style={{ paddingHorizontal: 24, paddingVertical: 112, overflow: "hidden" }}
    >
      {!reduced && (
        <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
          {stars.map((p, i) => (
            <View
              key={i}
              style={{
                position: "absolute",
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: 2,
                height: 2,
                borderRadius: 1,
                backgroundColor: palette.sand,
                opacity: 0.3,
              }}
            />
          ))}
        </View>
      )}

      <View style={{ alignItems: "center" }}>
        <Txt style={{ fontFamily: SERIF_FONT, fontStyle: "italic", fontSize: 17, color: palette.sand }}>
          The countdown
        </Txt>

        {config.countdownTo && (
          <View
            accessibilityRole="timer"
            accessibilityLabel={`Countdown to ${config.recipient}'s surprise`}
            style={{ marginTop: 28, flexDirection: "row", gap: 10, maxWidth: 380 }}
          >
            {units.map((unit) => (
              <View
                key={unit.label}
                style={{
                  flex: 1,
                  paddingVertical: 6,
                  alignItems: "center",
                }}
              >
                <Txt
                  style={{
                    fontFamily: fonts.heading,
                    fontSize: 36,
                    lineHeight: 38,
                    color: palette.sand,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {unit.value}
                </Txt>
                <Txt style={{ marginTop: 6, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(204,172,159,0.75)" }}>
                  {unit.label}
                </Txt>
              </View>
            ))}
          </View>
        )}

        <Txt style={{ marginTop: 32, fontFamily: fonts.heading, fontSize: 28, lineHeight: 32, letterSpacing: -0.5, color: palette.paper }}>
          See you there.
        </Txt>

        {config.tier === "free" && (
          <Pressable
            onPress={() => router.push("/templates")}
            style={{
              marginTop: 48,
              backgroundColor: "rgba(26,26,26,0.65)",
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: radii.pill,
            }}
          >
            <Txt style={{ fontSize: 11, color: "rgba(255,254,253,0.75)" }}>
              Made with TaDaaaa · <Txt style={{ color: palette.sand }}>Create your own →</Txt>
            </Txt>
          </Pressable>
        )}
      </View>
    </LinearGradient>
  );
}
