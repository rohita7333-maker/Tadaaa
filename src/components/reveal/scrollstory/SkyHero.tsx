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
import { palette, derived } from "@/theme/tokens";
import {
  SERIF_FONT,
  SEAM_SKY_TO_MESSAGE,
  particleLayout,
} from "./shared";

const STAR_COUNT = 24;
const LANTERN_COUNT = 10;
const PARALLAX_FACTOR_A = -0.12;
const PARALLAX_FACTOR_B = -0.22;
const HERO_HEIGHT_FACTOR = 1.75; // matches web's min-h-[175vh]

// Editorial re-skin: ink → sand, stepped through documented ink→sand mixes
// (the same derivation convention `derived` in `@/theme/tokens` uses).
const SKY_GRADIENT = [
  palette.ink,
  "#413A37",
  "#6C5D57",
  "#8F7A72",
  "#AF958A",
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
        { position: "absolute", left: `${x}%`, top: `${y}%`, width: 2, height: 2, borderRadius: 1, backgroundColor: palette.paper },
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
        colors={[derived.sandLight, palette.sand, "rgba(26,26,26,0.55)"]}
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
        <Txt style={{ fontFamily: SERIF_FONT, fontStyle: "italic", fontSize: 18, color: palette.sand }}>
          {config.eyebrow}
        </Txt>
        <Txt
          style={{
            marginTop: 12,
            fontFamily: fonts.heading,
            fontSize: 40,
            lineHeight: 44,
            letterSpacing: -0.8,
            color: palette.paper,
            textAlign: "center",
          }}
        >
          {config.recipient}
        </Txt>
        <Txt
          style={{
            marginTop: 18,
            fontSize: 12,
            fontWeight: "600",
            letterSpacing: 2.6,
            textTransform: "uppercase",
            color: palette.sand,
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
        <Txt style={{ fontSize: 12, letterSpacing: 1.2, color: palette.sand }}>
          Scroll slowly ↓
        </Txt>
      </View>

    </View>
  );
}
