/**
 * MessageScene — Scene 2: the personal message under gently falling confetti.
 *
 * GRADIENT SEAM CONTRACT: first stop SEAM_SKY_TO_MESSAGE === SkyHero's final
 * stop; final stop SEAM_MESSAGE_TO_PLAN === PlanScene's first stop.
 */
import { useEffect, useMemo } from "react";
import { View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import type { StoryConfig } from "@/lib/scroll-story/config";
import { Txt, fonts } from "@/components/ui";
import { BRAND_PARTY_COLORS, SEAM_MESSAGE_TO_PLAN, SEAM_SKY_TO_MESSAGE, particleLayout } from "./shared";

const CONFETTI_COUNT = 16;
const SCENE_HEIGHT_FACTOR = 1.2;

function ConfettiFlake({ x, scale, duration, delay, color, reduced }: { x: number; scale: number; duration: number; delay: number; color: string; reduced: boolean }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    progress.value = withDelay(
      delay * 1000,
      withRepeat(withTiming(1, { duration: duration * 1000, easing: Easing.linear }), -1, false)
    );
  }, [progress, duration, delay, reduced]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      transform: [
        { translateY: -40 + p * 900 },
        { rotate: `${p * 540}deg` },
        { scale },
      ],
      opacity: reduced ? 0 : 0.9,
    };
  });

  return (
    <Animated.View
      style={[
        { position: "absolute", left: `${x}%`, top: 0, width: 8, height: 14, borderRadius: 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

interface MessageSceneProps {
  config: StoryConfig;
  reduced: boolean;
}

export default function MessageScene({ config, reduced }: MessageSceneProps) {
  const { height: windowHeight } = useWindowDimensions();
  const sceneHeight = windowHeight * SCENE_HEIGHT_FACTOR;

  const confetti = useMemo(
    () => particleLayout(`${config.slug}-message-confetti`, CONFETTI_COUNT, { minX: 2, maxX: 98 }),
    [config.slug]
  );

  const fromLine = config.sender ? `from ${config.sender}, with love —` : "with love —";

  return (
    <View style={{ minHeight: sceneHeight, overflow: "hidden" }}>
      <LinearGradient
        colors={[SEAM_SKY_TO_MESSAGE, "#F5EDE3", SEAM_MESSAGE_TO_PLAN]}
        locations={[0, 0.45, 1]}
        style={{ minHeight: sceneHeight, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 96 }}
      >
        {!reduced && (
          <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
            {confetti.map((p, i) => (
              <ConfettiFlake
                key={i}
                x={p.x}
                scale={p.scale}
                duration={7 + p.duration * 1.5}
                delay={p.delay}
                color={BRAND_PARTY_COLORS[i % BRAND_PARTY_COLORS.length]}
                reduced={reduced}
              />
            ))}
          </View>
        )}

        <View style={{ maxWidth: 480, alignItems: "center" }}>
          <Txt style={{ fontFamily: fonts.hand, fontSize: 26, color: "#9B3D42" }}>{fromLine}</Txt>
          <Txt
            style={{
              marginTop: 20,
              fontFamily: fonts.heading,
              fontStyle: "italic",
              fontSize: 21,
              lineHeight: 32,
              color: "#2D2926",
              textAlign: "center",
            }}
          >
            {config.message}
          </Txt>
        </View>
      </LinearGradient>
    </View>
  );
}
