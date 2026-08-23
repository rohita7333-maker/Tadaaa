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
import { palette } from "@/theme/tokens";
import { SERIF_FONT, SEAM_MESSAGE_TO_PLAN, SEAM_PLAN_TO_POLAROID } from "./shared";

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
    <View
      style={{
        width: "100%",
        maxWidth: 330,
        borderRadius: 12,
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: palette.paper,
        borderWidth: 1,
        borderColor: palette.mist,
      }}
    >
      <Txt style={{ fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: palette.stone }}>
        {event.label}
      </Txt>
      <Txt style={{ marginTop: 4, fontFamily: fonts.heading, fontSize: 18, lineHeight: 24, color: palette.ink }}>
        {event.title}
      </Txt>
      {event.detail ? (
        <Txt style={{ marginTop: 2, fontSize: 13, color: palette.stone }}>
          {event.detail}
        </Txt>
      ) : null}
      {event.mapsQuery ? (
        <Pressable
          onPress={() => {
            const url = `https://maps.google.com/?q=${encodeURIComponent(event.mapsQuery ?? "")}`;
            Linking.openURL(url).catch(() => {});
          }}
          style={{ marginTop: 12 }}
        >
          <Txt style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: palette.coral }}>
            See the route →
          </Txt>
        </Pressable>
      ) : null}
    </View>
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
      <View style={{ alignItems: "center" }}>
        <Txt style={{ fontFamily: SERIF_FONT, fontStyle: "italic", fontSize: 17, color: palette.stone }}>
          The plan
        </Txt>
      </View>
      <View style={{ marginTop: 22, gap: 12, alignItems: "center" }}>
        {events.map((event, i) => (
          <Plaque key={i} event={event} />
        ))}
      </View>
    </LinearGradient>
  );
}
