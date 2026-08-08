/**
 * PlanScene — Scene 3: the plan, one gold-cream plaque per event (or a single
 * "When" plaque derived from `countdownTo` when the invite has no events).
 *
 * GRADIENT SEAM CONTRACT: first stop SEAM_MESSAGE_TO_PLAN === MessageScene's
 * final stop; final stop SEAM_PLAN_TO_POLAROID === PolaroidScene's first stop.
 */
import { Linking, Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { StoryConfig, StoryEvent } from "@/lib/scroll-story/config";
import { Txt, fonts } from "@/components/ui";
import { HAND_FONT, SEAM_MESSAGE_TO_PLAN, SEAM_PLAN_TO_POLAROID } from "./shared";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function Plaque({ event }: { event: StoryEvent }) {
  return (
    <LinearGradient
      colors={["#FDF6E8", "#E8D5A8"]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={{
        width: "100%",
        maxWidth: 380,
        borderRadius: 32,
        paddingHorizontal: 28,
        paddingVertical: 30,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(201,169,110,0.65)",
      }}
    >
      <Txt style={{ fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: "#9B3D42" }}>
        {event.label}
      </Txt>
      <Txt style={{ marginTop: 12, fontFamily: fonts.heading, fontSize: 22, lineHeight: 28, color: "#2D2926", textAlign: "center" }}>
        {event.title}
      </Txt>
      {event.detail ? (
        <Txt style={{ marginTop: 8, fontFamily: fonts.body, fontStyle: "italic", color: "#6B5E57", textAlign: "center" }}>
          {event.detail}
        </Txt>
      ) : null}
      {event.mapsQuery ? (
        <Pressable
          onPress={() => {
            const url = `https://maps.google.com/?q=${encodeURIComponent(event.mapsQuery ?? "")}`;
            Linking.openURL(url).catch(() => {});
          }}
          style={{ marginTop: 16 }}
        >
          <Txt style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: "#9B3D42", textDecorationLine: "underline" }}>
            See the route →
          </Txt>
        </Pressable>
      ) : null}
    </LinearGradient>
  );
}

interface PlanSceneProps {
  config: StoryConfig;
}

export default function PlanScene({ config }: PlanSceneProps) {
  const events: StoryEvent[] =
    config.events.length > 0
      ? config.events
      : config.countdownTo
        ? [{ label: "When", title: formatWhen(config.countdownTo) }]
        : [];

  if (events.length === 0) return null;

  return (
    <LinearGradient
      colors={[SEAM_MESSAGE_TO_PLAN, SEAM_PLAN_TO_POLAROID]}
      style={{ paddingHorizontal: 24, paddingVertical: 96 }}
    >
      <View style={{ alignItems: "center", gap: 4 }}>
        <Txt style={{ fontFamily: HAND_FONT, fontSize: 24, color: "#9B3D42" }}>here&apos;s the plan ✨</Txt>
        <Txt style={{ fontFamily: fonts.heading, fontWeight: "600" as const, fontSize: 32, color: "#2D2926" }}>
          The plan
        </Txt>
      </View>
      <View style={{ marginTop: 36, gap: 28, alignItems: "center" }}>
        {events.map((event, i) => (
          <Plaque key={i} event={event} />
        ))}
      </View>
    </LinearGradient>
  );
}
