/**
 * Frame F3 — the offline banner, the loading skeletons and the failed-upload
 * card. (F3's fourth state, the expired link, is already served by
 * `lib/reveal-unavailable.ts` on the reveal screen — see the note at the
 * bottom of this file.)
 */
import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, Text, View, useWindowDimensions } from "react-native";
import { useNetworkState } from "expo-network";
import { useSegments } from "expo-router";
import { useReducedMotion } from "react-native-reanimated";
import { derived, palette, radii, space, touch, type } from "@/theme/tokens";

/* --------------------------------------------------------- offline banner */

/** F3's wizard wording, exported so the copy lives in exactly one place. */
export const OFFLINE_DRAFT_MESSAGE = "No connection — your draft is saved on this phone";

/**
 * Frame F3: "a coral bar directly under the status bar … It PUSHES CONTENT
 * DOWN rather than covering it." So this renders as a normal flow sibling
 * above the navigator, never absolutely positioned.
 *
 * `coralDeep`, not `coral`: the bar carries 12px/600 paper text and paper on
 * plain coral measures 3.97:1, under the AA floor. Seventh time this design
 * source has specified a coral that cannot hold its own label.
 */
export function OfflineBanner() {
  const network = useNetworkState();
  const segments = useSegments();
  // `undefined` while the first probe is in flight. Treat unknown as online —
  // a banner that flashes on every cold start is worse than a late one.
  const offline = network.isInternetReachable === false;
  if (!offline) return null;

  /**
   * F3's sentence promises "your draft is saved on this phone", which is only
   * TRUE inside the wizard — that is the one place with a local draft. On the
   * reveal screen or the themes tab it would be a comforting lie, so those get
   * the shorter line that is true everywhere.
   */
  const message = segments[0] === "create" ? OFFLINE_DRAFT_MESSAGE : "No connection";

  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: derived.coralDeep,
        paddingVertical: 9,
        paddingHorizontal: 20,
      }}
    >
      <Text
        style={{
          ...type.body,
          fontSize: 12,
          fontWeight: "600",
          letterSpacing: 12 * 0.04,
          color: palette.paper,
          textAlign: "center",
        }}
      >
        {message}
      </Text>
    </View>
  );
}

/* ---------------------------------------------------------------- skeleton */

/** F3: `opacity .5 -> 1 -> .5` over 1.5s. */
const PULSE_MS = 1500;
/** F3: "staggered 100-300ms per row". */
const STAGGER_MS = 120;

function Pulse({
  delay,
  style,
}: {
  delay: number;
  style: { width?: number | `${number}%`; height: number; borderRadius: number };
}) {
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(reduced ? 0.75 : 0.5)).current;

  useEffect(() => {
    // The handoff's motion table: "Reduce Motion — disable bobs, confetti,
    // dodging No, floats, SHIMMER." A static block at the mid opacity still
    // reads as a placeholder.
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: PULSE_MS / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: PULSE_MS / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    const timer = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(timer);
      loop.stop();
    };
  }, [delay, opacity, reduced]);

  return (
    <Animated.View style={{ ...style, backgroundColor: palette.pebble, opacity }} />
  );
}

/**
 * One `SurpriseRow`-shaped placeholder: the same 64px thumb, the same 14px
 * vertical padding, the same hairline. F3 is explicit that skeletons sit at
 * "the real content's dimensions" — a generic grey bar shifts the layout the
 * moment the data lands.
 */
export function SkeletonRow({ index = 0, last }: { index?: number; last?: boolean }) {
  const delay = index * STAGGER_MS;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space.x4,
        paddingVertical: space.x4,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: palette.mist,
      }}
    >
      <Pulse delay={delay} style={{ width: 64, height: 64, borderRadius: radii.sm }} />
      <View style={{ flex: 1, gap: space.x2 }}>
        <Pulse delay={delay} style={{ width: "70%", height: 16, borderRadius: 4 }} />
        <Pulse delay={delay + 200} style={{ width: "45%", height: 12, borderRadius: 4 }} />
      </View>
    </View>
  );
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonRow key={i} index={i} last={i === rows - 1} />
      ))}
    </View>
  );
}

/** A bordered block at panel dimensions — B5's three panels while they load. */
export function SkeletonPanel({ height, index = 0 }: { height: number; index?: number }) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: palette.mist,
        borderRadius: radii.md,
        padding: 16,
        gap: 16,
      }}
    >
      <Pulse delay={index * STAGGER_MS} style={{ width: "55%", height: 18, borderRadius: 4 }} />
      <Pulse delay={index * STAGGER_MS + 200} style={{ width: "100%", height, borderRadius: 4 }} />
    </View>
  );
}

/* ------------------------------------------------------- failed uploads */

/**
 * Frame F3's coral-bordered card. The `!` mark is a 48px pebble square, the
 * two lines sit between it and a Retry label.
 *
 * `coralDeep` on the Retry label for the usual reason — it is 11px/600, which
 * is not WCAG "large text". The BORDER keeps plain coral: a 1px rule is a
 * graphic and answers to the 3:1 floor, which it clears.
 */
export function FailedUploadCard({
  title,
  detail,
  busy,
  onRetry,
}: {
  title: string;
  detail: string;
  busy?: boolean;
  onRetry: () => void;
}) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: palette.coral,
        borderRadius: radii.md,
        paddingVertical: 15,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: radii.sm,
          backgroundColor: palette.pebble,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ ...type.body, fontSize: 18, color: derived.coralDeep }}>!</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ ...type.body, fontSize: 14, fontWeight: "600" }}>{title}</Text>
        <Text style={{ ...type.bodySecondary, marginTop: 2 }}>{detail}</Text>
      </View>
      <Pressable
        onPress={onRetry}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Retry the failed uploads"
        hitSlop={10}
        style={({ pressed }) => ({
          minHeight: touch.min,
          justifyContent: "center",
          opacity: busy ? 0.4 : pressed ? 0.6 : 1,
        })}
      >
        <Text
          style={{
            ...type.buttonLabel,
            fontSize: 11,
            letterSpacing: 11 * 0.06,
            color: derived.coralDeep,
          }}
        >
          {busy ? "Retrying" : "Retry"}
        </Text>
      </Pressable>
    </View>
  );
}

/* --------------------------------------------------------------- empty */

/**
 * Frame F2 — first run.
 *
 * The 150x190 dashed card is the frame's own placeholder ("swap for a real
 * illustration when you have one"), so it ships as drawn rather than as a
 * stand-in for artwork nobody has licensed.
 */
export function FirstRunEmpty({
  onStart,
  onBrowseThemes,
}: {
  onStart: () => void;
  onBrowseThemes: () => void;
}) {
  const { height } = useWindowDimensions();
  return (
    <View
      style={{
        // The frame centres this in the space between the header and the tab
        // bar. A fixed flex:1 inside a ScrollView collapses, so the block gets
        // a minimum proportional to the viewport instead.
        minHeight: Math.max(420, height * 0.62),
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 4,
      }}
    >
      <View
        style={{
          width: 150,
          height: 190,
          borderWidth: 1.5,
          borderStyle: "dashed",
          borderColor: palette.mist,
          borderRadius: radii.md,
          backgroundColor: palette.pebble,
          alignItems: "center",
          justifyContent: "center",
          gap: space.x3,
          marginBottom: 30,
        }}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            borderWidth: 1.5,
            borderColor: palette.sand,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ ...type.body, fontSize: 20, fontWeight: "300", color: palette.stone }}>
            +
          </Text>
        </View>
        <Text
          style={{
            ...type.sectionLabel,
            fontSize: 9.5,
            letterSpacing: 9.5 * 0.12,
          }}
        >
          Your first one
        </Text>
      </View>

      <Text style={{ ...type.screenTitle, fontSize: 28, lineHeight: 28 * 1.2, textAlign: "center" }}>
        Who deserves a surprise?
      </Text>
      <Text
        style={{
          ...type.body,
          fontSize: 16,
          lineHeight: 16 * 1.65,
          color: palette.stone,
          textAlign: "center",
          maxWidth: 270,
          marginTop: space.x3,
          marginBottom: 26,
        }}
      >
        Pick an occasion, write one honest paragraph, send a link. About three minutes.
      </Text>

      <Pressable
        onPress={onStart}
        accessibilityRole="button"
        accessibilityLabel="Start one"
        style={({ pressed }) => ({
          minHeight: touch.control,
          paddingHorizontal: 30,
          borderRadius: radii.pill,
          backgroundColor: derived.coralDeep,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Text style={{ ...type.buttonLabel, fontSize: 13, color: palette.paper }}>Start one</Text>
      </Pressable>

      <Pressable
        onPress={onBrowseThemes}
        accessibilityRole="button"
        accessibilityLabel="Or browse themes first"
        style={({ pressed }) => ({
          marginTop: 18,
          minHeight: touch.min,
          justifyContent: "center",
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text style={{ ...type.body, fontSize: 13, fontWeight: "600", color: palette.stone }}>
          Or browse themes first
        </Text>
      </Pressable>
    </View>
  );
}
