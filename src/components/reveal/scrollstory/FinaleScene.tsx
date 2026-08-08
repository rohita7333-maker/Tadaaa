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
import { FINALE_NIGHT, HAND_FONT, SEAM_RSVP_TO_FINALE, particleLayout } from "./shared";

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
    { label: "days", value: remaining ? pad(remaining.days) : "00" },
    { label: "hours", value: remaining ? pad(remaining.hours) : "00" },
    { label: "mins", value: remaining ? pad(remaining.minutes) : "00" },
    { label: "secs", value: remaining ? pad(remaining.seconds) : "00" },
  ];

  return (
    <LinearGradient
      colors={[SEAM_RSVP_TO_FINALE, "#3E3330", "#231F1D", FINALE_NIGHT]}
      locations={[0, 0.26, 0.55, 1]}
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
                backgroundColor: "#FFF8F0",
                opacity: 0.3,
              }}
            />
          ))}
        </View>
      )}

      <View style={{ alignItems: "center" }}>
        <Txt style={{ fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: "#C9A96E" }}>
          the countdown begins
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
                  borderRadius: 18,
                  paddingVertical: 14,
                  alignItems: "center",
                  backgroundColor: "rgba(255,248,240,0.07)",
                  borderWidth: 1,
                  borderColor: "rgba(201,169,110,0.4)",
                }}
              >
                <Txt
                  style={{
                    fontFamily: fonts.heading,
                    fontSize: 26,
                    color: "#E8D5A8",
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {unit.value}
                </Txt>
                <Txt style={{ marginTop: 4, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,248,240,0.6)" }}>
                  {unit.label}
                </Txt>
              </View>
            ))}
          </View>
        )}

        <Txt style={{ marginTop: 56, fontFamily: fonts.heading, fontSize: 36, lineHeight: 40, color: "#FFF8F0" }}>
          Yaaay! 🎉
        </Txt>
        <Txt style={{ marginTop: 8, fontFamily: HAND_FONT, fontSize: 22, color: "#E8D5A8" }}>see you there</Txt>

        {config.tier === "free" && (
          <Pressable
            onPress={() => router.push("/templates")}
            style={{
              marginTop: 48,
              backgroundColor: "rgba(0,0,0,0.35)",
              paddingHorizontal: 18,
              paddingVertical: 10,
              borderRadius: radii.pill,
            }}
          >
            <Txt style={{ fontSize: 12, color: "#fff" }}>Made with 🎁 TaDaaaa</Txt>
          </Pressable>
        )}
      </View>
    </LinearGradient>
  );
}
