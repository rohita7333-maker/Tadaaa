/**
 * `bTap`'s closed half in `tadaaaa/tadaaaa-editorial.html`:
 *
 *   .tap{min-height:100vh;display:flex;flex-direction:column;align-items:center;
 *        justify-content:center;padding:40px 28px;text-align:center}
 *   .tap .giftimg{width:min(280px,72vw);aspect-ratio:4/5;border-radius:var(--r-md);
 *                 animation:brth 3s ease-in-out infinite;box-shadow:var(--sh-float)}
 *   .tap .tt{font-family:var(--head);font-size:24px;color:#fff;margin-top:26px}
 *   .tap .rn{font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:var(--sand)}
 *
 * The mockup fills `.giftimg` with the theme's photograph. Neither platform
 * ships theme artwork, so both draw the plate from the theme's own gradient:
 * web sets `background: theme.colors.background` (a CSS linear-gradient), and
 * this renders the identical stops through expo-linear-gradient.
 *
 * It previously stacked two flat Views of `accentLight` over `accent`, which
 * produced a hard band across the middle where web showed a smooth ramp — the
 * single most visible cross-platform mismatch in the app. That was recorded as
 * a platform limit; it was not one. `expo-linear-gradient` is a dependency and
 * `gradientStops()` exists in `@/lib/themes` for exactly this purpose.
 *
 * `brth` is a 3s breathing scale. It runs through Reanimated and is skipped
 * entirely when the OS asks for reduced motion.
 */
import { useEffect } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { fonts, palette, radii, shadows } from "@/components/editorial";
import { gradientStops, type Theme } from "@/lib/themes";

const PLATE_MAX_WIDTH = 280;
const PLATE_VIEWPORT_RATIO = 0.72;
const PLATE_ASPECT = 4 / 5;
const BREATH_MS = 1500;

export default function TapClosed({
  title,
  theme,
  reduced,
  onOpen,
}: {
  title: string;
  theme: Theme;
  reduced: boolean;
  onOpen: () => void;
}) {
  const { width } = useWindowDimensions();
  const plateWidth = Math.min(PLATE_MAX_WIDTH, width * PLATE_VIEWPORT_RATIO);

  const breath = useSharedValue(1);
  useEffect(() => {
    if (reduced) return;
    breath.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: BREATH_MS, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: BREATH_MS, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, [breath, reduced]);
  const plateStyle = useAnimatedStyle(() => ({ transform: [{ scale: breath.value }] }));

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, paddingVertical: 40 }}>
      <Animated.View style={plateStyle}>
        <Pressable
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel="Tap to reveal"
          style={({ pressed }) => [
            {
              width: plateWidth,
              height: plateWidth / PLATE_ASPECT,
              borderRadius: radii.md,
              overflow: "hidden",
              opacity: pressed ? 0.92 : 1,
            },
            shadows.float,
          ]}
        >
          {/* Same stops, same top-to-bottom direction as web's CSS gradient. */}
          <LinearGradient
            colors={gradientStops(theme) as [string, string, ...string[]]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{ flex: 1 }}
          />
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(500)} style={{ alignItems: "center", marginTop: 26, gap: 8 }}>
        <Text
          style={{
            fontFamily: fonts.heading,
            fontWeight: "400",
            fontSize: 24,
            lineHeight: 24 * 1.1,
            letterSpacing: 24 * -0.02,
            color: palette.paper,
            textAlign: "center",
          }}
        >
          Tap to reveal
        </Text>
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: 13,
            letterSpacing: 13 * 0.16,
            textTransform: "uppercase",
            color: palette.sand,
            textAlign: "center",
          }}
        >
          For {title}
        </Text>
      </Animated.View>
    </View>
  );
}
