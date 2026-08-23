/**
 * C4 — Reveal style.
 *
 * Frame anatomy: a 2-column grid of four tiles, each a 150px ANIMATED dark
 * preview over a 16px serif name and a 12px "best for" line; selected takes a
 * 2px coral border. Below the grid, a theme row with a coral "Change".
 *
 * The four previews animate in place, as the frame specifies: the scroll story's
 * ↓ bobs, the tap gift pulses, the countdown ticks live off a real timestamp,
 * and the letters sit still (they are envelopes, not motion). Every one of them
 * stops under Reduce Motion — the handoff's rule is bobs, pulses and floats go,
 * opacity cross-fades stay.
 */
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import { derived, palette, useReducedMotion } from "@/components/editorial";
import type { RevealStyle } from "@/lib/schema-adapter";
import { radii, space, touch, type } from "@/theme/tokens";

const TILE_PREVIEW_H = 150;

const STYLES: { id: RevealStyle; name: string; bestFor: string }[] = [
  { id: "scroll", name: "Scroll story", bestFor: "Best for photos and long messages" },
  { id: "tap", name: "Tap to reveal", bestFor: "Short and punchy" },
  { id: "countdown", name: "Countdown", bestFor: "All about the build-up" },
  { id: "letters", name: "Open-when letters", bestFor: "Intimate, layered, kept" },
];

/** ±5px, 1.8s ease-in-out — the handoff's reveal-hint bob. */
function useBob(active: boolean) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) {
      v.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, v]);
  return v;
}

function ScrollPreview({ animate }: { animate: boolean }) {
  const bob = useBob(animate);
  return (
    <View style={{ height: TILE_PREVIEW_H, backgroundColor: palette.ink }}>
      <View
        style={{
          position: "absolute",
          left: 14,
          right: 14,
          top: 20,
          height: 44,
          backgroundColor: palette.stone,
          borderRadius: 4,
        }}
      />
      <View
        style={{
          position: "absolute",
          left: 14,
          right: 14,
          top: 74,
          height: 56,
          backgroundColor: palette.pebble,
          borderRadius: 4,
        }}
      />
      <Animated.Text
        style={{
          position: "absolute",
          bottom: 8,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 16,
          color: palette.sand,
          transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }],
        }}
      >
        ↓
      </Animated.Text>
    </View>
  );
}

function TapPreview({ animate }: { animate: boolean }) {
  const pulse = useBob(animate);
  return (
    <View
      style={{
        height: TILE_PREVIEW_H,
        backgroundColor: palette.ink,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View
        style={{
          width: 44,
          height: 54,
          borderRadius: 5,
          backgroundColor: palette.sand,
          transform: [
            { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
          ],
        }}
      />
    </View>
  );
}

/**
 * Ticks off a real absolute target, re-derived every second — the same rule D4
 * has to follow. An interval that accumulates drifts the moment the JS thread
 * stalls, and a preview that drifts is a preview of a bug.
 */
function CountdownPreview() {
  const target = useRef(Date.now() + 9 * 3600_000 + 41 * 60_000).current;
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const left = Math.max(0, target - Date.now());
  const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");
  return (
    <View
      style={{
        height: TILE_PREVIEW_H,
        backgroundColor: palette.ink,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* `type.countdown` is `as const`, so its `fontVariant` is a READONLY
          tuple and RN's TextStyle wants a mutable array — neither a spread nor
          the array form satisfies it. The role's other values are taken by
          name; the tuple is rebuilt, exactly as CountdownClosed already does. */}
      <Text
        style={{
          fontFamily: type.countdown.fontFamily,
          fontWeight: type.countdown.fontWeight,
          color: type.countdown.color,
          fontSize: 22,
          lineHeight: 26,
          fontVariant: ["tabular-nums" as const],
        }}
      >
        {pad(left / 3600_000)}:{pad((left / 60_000) % 60)}:{pad((left / 1000) % 60)}
      </Text>
    </View>
  );
}

function LettersPreview() {
  return (
    <View
      style={{
        height: TILE_PREVIEW_H,
        backgroundColor: palette.ink,
        gap: 7,
        paddingVertical: 16,
        paddingHorizontal: 14,
        justifyContent: "center",
      }}
    >
      <View style={{ height: 20, borderRadius: 3, backgroundColor: palette.pebble }} />
      <View style={{ height: 20, borderRadius: 3, backgroundColor: palette.sand }} />
      <View style={{ height: 20, borderRadius: 3, backgroundColor: palette.pebble }} />
    </View>
  );
}

export function RevealStyleStep({
  value,
  themeName,
  onChange,
  onChangeTheme,
  onPreview,
}: {
  value: RevealStyle | null;
  themeName: string;
  onChange: (style: RevealStyle) => void;
  onChangeTheme: () => void;
  onPreview: (style: RevealStyle) => void;
}) {
  const reduced = useReducedMotion();
  const animate = !reduced;

  return (
    <View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {STYLES.map((s) => {
          const selected = value === s.id;
          return (
            <Pressable
              key={s.id}
              onPress={() => {
                onChange(s.id);
                onPreview(s.id);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${s.name}. ${s.bestFor}`}
              accessibilityHint="Opens a full-screen demo with your own words"
              style={{
                // Two columns with a 12px gutter inside a 20px-padded screen.
                width: "48%",
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? palette.coral : palette.mist,
                borderRadius: radii.md,
                overflow: "hidden",
                minHeight: touch.min,
              }}
            >
              {s.id === "scroll" ? (
                <ScrollPreview animate={animate} />
              ) : s.id === "tap" ? (
                <TapPreview animate={animate} />
              ) : s.id === "countdown" ? (
                <CountdownPreview />
              ) : (
                <LettersPreview />
              )}
              <View style={{ paddingVertical: 10, paddingHorizontal: 12 }}>
                <Text style={{ ...type.screenTitle, fontSize: 16, lineHeight: 16 * 1.2 }}>
                  {s.name}
                </Text>
                <Text style={{ ...type.bodySecondary, fontSize: 12, lineHeight: 12 * 1.45, marginTop: 2 }}>
                  {s.bestFor}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View
        style={{
          borderWidth: 1,
          borderColor: palette.mist,
          borderRadius: radii.md,
          padding: 15,
          marginTop: 16,
          flexDirection: "row",
          gap: 12,
          alignItems: "center",
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ ...type.body, fontSize: 15, fontWeight: "600" }}>Theme: {themeName}</Text>
          <Text style={{ ...type.bodySecondary, marginTop: 2 }}>
            Or use one of your own photos
          </Text>
        </View>
        <Pressable onPress={onChangeTheme} accessibilityRole="button" hitSlop={10}>
          <Text
            style={{
              ...type.buttonLabel,
              letterSpacing: 12 * 0.06,
              color: derived.coralDeep,
            }}
          >
            Change
          </Text>
        </Pressable>
      </View>

      <View style={{ height: space.x5 }} />
    </View>
  );
}
