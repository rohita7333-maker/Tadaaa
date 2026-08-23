/**
 * Reveal particles — the celebratory layer of the crown-jewel choreography.
 *
 * - <Ribbons/>  ambient, always-looping thin ribbons drifting down (the calm,
 *               "something is coming" layer behind the locked gift).
 * - <Confetti/> one-shot burst fired the moment the surprise unwraps.
 *
 * Both honour reduce-motion: when reduced, Ribbons render static and Confetti
 * renders a single gentle fade instead of a physics burst.
 */
import { useEffect, useMemo } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import type { Theme } from "@/lib/themes";
import { derived, palette } from "@/theme/tokens";

const PARTICLE_GLYPH: Record<Theme["particleType"], string | null> = {
  hearts: "♥",
  sparkles: "✦",
  petals: "❀",
  stars: "★",
  confetti: null, // rendered as colored rectangles
};

function pseudoRandom(seed: number): number {
  // Deterministic per-index randomness (Math.random is fine here, but seeding
  // keeps layout stable across re-renders of the same reveal).
  const x = Math.sin(seed * 99.13) * 43758.5453;
  return x - Math.floor(x);
}

function RibbonPiece({
  index,
  height,
  colors,
  reduced,
}: {
  index: number;
  height: number;
  colors: string[];
  reduced: boolean;
}) {
  const { width } = useWindowDimensions();
  const progress = useSharedValue(0);
  const left = pseudoRandom(index) * width;
  // Per-ribbon phase offset (0..1). Combined with a wrapping modulo in the
  // worklet this makes the field instantly full + staggered on mount, instead
  // of the old positive-delay approach that left the top empty for seconds.
  const phase = pseudoRandom(index + 3);
  const drift = (pseudoRandom(index + 5) - 0.5) * 44;
  const duration = 4200 + pseudoRandom(index + 7) * 2600;
  const color = colors[index % colors.length];
  const range = height + 40;

  useEffect(() => {
    if (reduced) {
      progress.value = 0; // static; the phase offset still spreads them down-screen
      return;
    }
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.linear }),
      -1,
      false
    );
  }, [progress, duration, reduced]);

  const style = useAnimatedStyle(() => {
    "worklet";
    const p = (progress.value + phase) % 1; // wrap → continuous fall
    return {
      transform: [
        { translateY: -20 + p * range },
        { translateX: drift * Math.sin(p * Math.PI * 2) },
        { rotate: `${(progress.value + phase) * 680}deg` },
      ],
      opacity: reduced ? 0.5 : 0.82,
    };
  });

  return (
    <Animated.View
      style={[
        { position: "absolute", left, top: 0, width: 8, height: 5, borderRadius: 1, backgroundColor: color },
        style,
      ]}
    />
  );
}

export function Ribbons({
  colors,
  count = 18,
  reduced = false,
}: {
  colors: string[];
  count?: number;
  reduced?: boolean;
}) {
  const { height } = useWindowDimensions();
  const items = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {items.map((i) => (
        <RibbonPiece key={i} index={i} height={height} colors={colors} reduced={reduced} />
      ))}
    </View>
  );
}

function ConfettiPiece({
  index,
  run,
  colors,
  glyph,
  reduced,
}: {
  index: number;
  run: boolean;
  colors: string[];
  glyph: string | null;
  reduced: boolean;
}) {
  const { width, height } = useWindowDimensions();
  const progress = useSharedValue(0);
  const startX = pseudoRandom(index) * width;
  const drift = (pseudoRandom(index + 11) - 0.5) * 160;
  const duration = 1600 + pseudoRandom(index + 5) * 1400;
  const delay = pseudoRandom(index + 2) * 400;
  const color = colors[index % colors.length];
  const size = 7 + Math.floor(pseudoRandom(index + 9) * 6);

  useEffect(() => {
    if (!run) return;
    if (reduced) {
      progress.value = withTiming(1, { duration: 400 });
      return;
    }
    progress.value = 0;
    progress.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.quad) }));
  }, [run, progress, duration, delay, reduced]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      transform: [
        { translateX: startX + drift * p },
        { translateY: -30 + p * (height * 0.9) },
        { rotate: `${p * 540}deg` },
      ],
      opacity: reduced ? p * 0.9 : 1 - Math.max(0, p - 0.75) * 4,
    };
  });

  if (glyph) {
    return (
      <Animated.View style={[{ position: "absolute", top: 0, left: 0 }, style]}>
        <Text style={{ fontSize: size + 6, color }}>{glyph}</Text>
      </Animated.View>
    );
  }
  return (
    <Animated.View
      style={[
        { position: "absolute", top: 0, left: 0, width: size, height: size * 0.6, borderRadius: 1, backgroundColor: color },
        style,
      ]}
    />
  );
}

/**
 * `burst()` in `tadaaaa/tadaaaa-editorial.html`:
 *
 *   function burst(){ if(matchMedia("(prefers-reduced-motion:reduce)").matches) return;
 *     confetti({particleCount:70,spread:60,origin:{y:.6},
 *               colors:["#D45847","#CCAC9F","#1A1A1A","#F5F0ED"]}); }
 *
 * Four palette primitives, no glyph — the editorial identity has no emoji
 * confetti — and a hard no-op under reduce-motion, exactly like the mockup.
 */
const BURST_COLORS = [palette.coral, palette.sand, palette.ink, palette.pebble];
const BURST_COUNT = 70;

export function EditorialBurst({ run, reduced = false }: { run: boolean; reduced?: boolean }) {
  const items = useMemo(() => Array.from({ length: BURST_COUNT }, (_, i) => i), []);
  if (!run || reduced) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {items.map((i) => (
        <ConfettiPiece key={i} index={i} run={run} colors={BURST_COLORS} glyph={null} reduced={false} />
      ))}
    </View>
  );
}

export function Confetti({
  run,
  theme,
  count = 44,
  reduced = false,
}: {
  run: boolean;
  theme: Theme;
  count?: number;
  reduced?: boolean;
}) {
  const items = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);
  // Was `#E8D5A8` / `#C9A96E` — retired warm-palette literals that survived the
  // token migration here. Now the editorial equivalents, so this matches web.
  const particleColors = [
    theme.colors.accent,
    theme.colors.accentLight,
    palette.sand,
    derived.sandDeep,
    derived.white,
  ];
  const glyph = PARTICLE_GLYPH[theme.particleType];
  if (!run) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {items.map((i) => (
        <ConfettiPiece key={i} index={i} run={run} colors={particleColors} glyph={glyph} reduced={reduced} />
      ))}
    </View>
  );
}
