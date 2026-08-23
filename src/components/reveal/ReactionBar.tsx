/**
 * D2's reaction bar.
 *
 * Frame: a translucent pill holding the emoji and their counts. Handoff motion
 * table: "Emoji `scale 1.35` on press, then float 170px up over 1.7s while
 * fading." Reduce Motion keeps the count bump and drops the float — the rule is
 * bobs, floats and confetti go, cross-fades stay.
 *
 * Counts move optimistically. The send is fire-and-forget: the float has
 * already played and the number has already changed, so a failed round trip
 * costs a count, not the moment.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import {
  EMPTY_COUNTS,
  REACTIONS,
  applyOptimistic,
  formatReactionCount,
  getReactionCounts,
  sendReaction,
  type ReactionCounts,
  type ReactionKey,
} from "@/lib/reactions";
import { visitorHash } from "@/lib/device";
import { overlay, palette, radii, touch, type } from "@/theme/tokens";

const FLOAT_DISTANCE = 170;
const FLOAT_MS = 1700;
const PRESS_SCALE = 1.35;

interface Floater {
  id: number;
  glyph: string;
  value: Animated.Value;
}

export default function ReactionBar({
  slug,
  pin = null,
  reduced = false,
}: {
  slug: string;
  /** Forwarded so a PIN-locked surprise still accepts a reaction. */
  pin?: string | null;
  reduced?: boolean;
}) {
  const [counts, setCounts] = useState<ReactionCounts>(EMPTY_COUNTS);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const nextId = useRef(0);
  const scales = useRef<Record<string, Animated.Value>>({});

  for (const r of REACTIONS) {
    if (!scales.current[r.key]) scales.current[r.key] = new Animated.Value(1);
  }

  useEffect(() => {
    let alive = true;
    getReactionCounts(slug).then((c) => {
      if (alive) setCounts(c);
    });
    return () => {
      alive = false;
    };
  }, [slug]);

  const react = useCallback(
    async (key: ReactionKey, glyph: string) => {
      setCounts((c) => applyOptimistic(c, key));

      if (!reduced) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        const scale = scales.current[key];
        Animated.sequence([
          Animated.timing(scale, { toValue: PRESS_SCALE, duration: 120, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 160, useNativeDriver: true }),
        ]).start();

        const id = nextId.current++;
        const value = new Animated.Value(0);
        setFloaters((f) => [...f, { id, glyph, value }]);
        Animated.timing(value, {
          toValue: 1,
          duration: FLOAT_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start(() => setFloaters((f) => f.filter((x) => x.id !== id)));
      }

      sendReaction({ slug, key, visitorHash: await visitorHash(), pin }).catch(() => {});
    },
    [slug, pin, reduced]
  );

  return (
    <View>
      {/* Floaters sit ABOVE the pill and ignore touches, so a burst of them
          never eats the next tap. */}
      <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
        {floaters.map((f) => (
          <Animated.Text
            key={f.id}
            style={{
              position: "absolute",
              left: 14,
              fontSize: 22,
              opacity: f.value.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0.8, 0] }),
              transform: [
                {
                  translateY: f.value.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -FLOAT_DISTANCE],
                  }),
                },
              ],
            }}
          >
            {f.glyph}
          </Animated.Text>
        ))}
      </View>

      <View
        accessibilityRole="toolbar"
        accessibilityLabel="React to this surprise"
        style={{
          flexDirection: "row",
          gap: 6,
          backgroundColor: overlay.fill,
          borderRadius: radii.pill,
          paddingVertical: 7,
          paddingHorizontal: 12,
          alignSelf: "flex-start",
        }}
      >
        {REACTIONS.map((r) => (
          <Pressable
            key={r.key}
            onPress={() => react(r.key, r.glyph)}
            accessibilityRole="button"
            accessibilityLabel={`${r.label}. ${counts[r.key]} so far.`}
            // The pill is 34px tall by the frame; the hit area is padded out to
            // the 44px floor rather than the control being drawn larger.
            hitSlop={{ top: 6, bottom: 6, left: 3, right: 3 }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              minHeight: 34,
              paddingHorizontal: 6,
            }}
          >
            <Animated.Text style={{ fontSize: 17, transform: [{ scale: scales.current[r.key] }] }}>
              {r.glyph}
            </Animated.Text>
            {counts[r.key] > 0 ? (
              <Text style={{ ...type.body, fontSize: 12, fontWeight: "600", color: palette.paper }}>
                {formatReactionCount(counts[r.key])}
              </Text>
            ) : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export { touch };
