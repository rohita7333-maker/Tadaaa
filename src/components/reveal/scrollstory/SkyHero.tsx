/**
 * SkyHero — Scene 1: evening sky, twinkling stars, floating lanterns, two
 * scroll-driven parallax bands.
 *
 * GRADIENT SEAM CONTRACT: final stop SEAM_SKY_TO_MESSAGE === MessageScene's
 * first stop.
 *
 * Reanimated 4.1 scroll-driven parallax: the parent `ScrollStoryReveal` owns
 * one `useAnimatedScrollHandler` writing a shared `scrollY` value (UI thread,
 * no bridge hop); this scene reads that value in `useAnimatedStyle` and
 * `interpolate`s it into two `translateY` bands (transform-only — no layout
 * properties touched, matching the web version's compositor-only parallax).
 */
import { useEffect, useMemo } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  useSharedValue,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import type { StoryConfig } from "@/lib/scroll-story/config";
import { Txt, fonts } from "@/components/ui";
import {
  BRAND_PARTY_COLORS,
  SEAM_SKY_TO_MESSAGE,
  particleLayout,
} from "./shared";

const STAR_COUNT = 24;
const LANTERN_COUNT = 10;
const PARALLAX_FACTOR_A = -0.12;
const PARALLAX_FACTOR_B = -0.22;
const HERO_HEIGHT_FACTOR = 1.75; // matches web's min-h-[175vh]

const SKY_GRADIENT = [
  "#3E3733",
  "#6B5E57",
  "#9B3D42",
  "#C4686D",
  "#E8A5A8",
  SEAM_SKY_TO_MESSAGE,
] as const;

interface SkyHeroProps {
  config: StoryConfig;
  /** UI-thread scroll offset shared by the parent ScrollStoryReveal. */
  scrollY: SharedValue<number>;
  reduced: boolean;
}

function Star({ x, y, duration, delay, reduced }: { x: number; y: number; duration: number; delay: number; reduced: boolean }) {
  const opacity = useSharedValue(reduced ? 0.6 : 0.25);

  useEffect(() => {
    if (reduced) return;
    opacity.value = withDelay(
      delay * 1000,
      withRepeat(
        withSequence(
          withTiming(1, { duration: (duration / 2) * 1000 }),
          withTiming(0.25, { duration: (duration / 2) * 1000 })
        ),
        -1,
        true
      )
    );
  }, [opacity, duration, delay, reduced]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { position: "absolute", left: `${x}%`, top: `${y}%`, width: 2, height: 2, borderRadius: 1, backgroundColor: "#FFF8F0" },
        style,
      ]}
    />
  );
}

function Lantern({ x, y, scale, duration, delay, reduced }: { x: number; y: number; scale: number; duration: number; delay: number; reduced: boolean }) {
  const float = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    float.value = withDelay(
      delay * 1000,
      withRepeat(withTiming(1, { duration: (duration + 2) * 1000 }), -1, true)
    );
  }, [float, duration, delay, reduced]);

  const style = useAnimatedStyle(() => {
    const translateY = interpolate(float.value, [0, 1], [0, -14], Extrapolation.CLAMP);
    return { transform: [{ translateY }, { scale }] };
  });

  return (
    <Animated.View
      style={[
        { position: "absolute", left: `${x}%`, top: `${y}%`, width: 18, height: 26, borderRadius: 7 },
        style,
      ]}
    >
      <LinearGradient
        colors={["#E8D5A8", "#C9A96E", "rgba(155,61,66,0.85)"]}
        style={{ flex: 1, borderRadius: 7 }}
      />
    </Animated.View>
  );
}

/**
 * Scene 1 — evening sky, twinkling stars, floating lanterns, parallax bands.
 */
export default function SkyHero({ config, scrollY, reduced }: SkyHeroProps) {
  const { height: windowHeight } = useWindowDimensions();
  const sceneHeight = windowHeight * HERO_HEIGHT_FACTOR;

  const stars = useMemo(
    () => particleLayout(`${config.slug}-sky-stars`, STAR_COUNT, { maxY: 72 }),
    [config.slug]
  );
  const lanterns = useMemo(
    () =>
      particleLayout(`${config.slug}-sky-lanterns`, LANTERN_COUNT, {
        minX: 4,
        maxX: 96,
        minY: 8,
        maxY: 86,
      }),
    [config.slug]
  );

  const bandAStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: reduced ? 0 : scrollY.value * PARALLAX_FACTOR_A }],
  }));
  const bandBStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: reduced ? 0 : scrollY.value * PARALLAX_FACTOR_B }],
  }));

  return (
    <View style={{ height: sceneHeight, overflow: "hidden" }}>
      <LinearGradient
        colors={SKY_GRADIENT}
        locations={[0, 0.22, 0.48, 0.66, 0.82, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Parallax band A — stars (slow drift) */}
      <Animated.View style={[StyleSheet.absoluteFill, bandAStyle]} pointerEvents="none">
        {stars.map((p, i) => (
          <Star key={i} x={p.x} y={p.y} duration={p.duration} delay={p.delay} reduced={reduced} />
        ))}
      </Animated.View>

      {/* Parallax band B — lanterns (faster drift) */}
      <Animated.View style={[StyleSheet.absoluteFill, bandBStyle]} pointerEvents="none">
        {lanterns.map((p, i) => (
          <Lantern key={i} x={p.x} y={p.y} scale={p.scale} duration={p.duration} delay={p.delay} reduced={reduced} />
        ))}
      </Animated.View>

      {/* Centered hero copy — first viewport */}
      <View style={{ height: windowHeight, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
        <Txt style={{ fontFamily: fonts.hand, fontSize: 24, color: "#E8D5A8" }}>{config.eyebrow}</Txt>
        <Txt
          style={{
            marginTop: 8,
            fontFamily: fonts.heading,
            fontSize: 56,
            lineHeight: 58,
            color: "#FFF8F0",
            textAlign: "center",
          }}
        >
          {config.recipient}
        </Txt>
        <Txt
          style={{
            marginTop: 16,
            fontSize: 13,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: "#E8A5A8",
          }}
        >
          {config.occasionLine}
        </Txt>
      </View>

      {/* Scroll hint at the bottom of the first viewport */}
      <View
        pointerEvents="none"
        style={{ position: "absolute", left: 0, right: 0, top: windowHeight - 84, alignItems: "center" }}
      >
        <Txt style={{ fontFamily: fonts.hand, fontSize: 20, color: "rgba(255,248,240,0.8)" }}>
          scroll slowly ↓
        </Txt>
      </View>

      {/* Bunting garland dots across the bottom seam — simplified for native */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 20,
          flexDirection: "row",
          justifyContent: "space-evenly",
          alignItems: "flex-end",
        }}
      >
        {Array.from({ length: 12 }, (_, i) => (
          <View
            key={i}
            style={{
              width: 12,
              height: 14,
              backgroundColor: BRAND_PARTY_COLORS[i % BRAND_PARTY_COLORS.length],
              borderRadius: 2,
            }}
          />
        ))}
      </View>
    </View>
  );
}
