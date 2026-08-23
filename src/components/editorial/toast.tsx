/**
 * `EdToast` — the transient confirmation web gets from `sonner`.
 *
 * Web calls `toast.success(...)` against a global provider. This is deliberately
 * NOT a provider: a context + portal + queue is a subsystem, and the product
 * needs exactly one thing today — a line that appears, is announced, and leaves.
 * So this is a self-dismissing overlay the owning screen renders, built from the
 * same tokens as every other atom (paper ground, mist hairline, `--r-md`,
 * `shadows.card`, 14px body). If a second concurrent toast is ever needed, THAT
 * is the moment to add a provider, not before.
 *
 * Honours OS reduce-motion: no fade, just present then gone.
 */
import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import { Body } from "./index";
import { palette, radii, shadows } from "@/theme/tokens";

const FADE_MS = 180;
/** Long enough to read a short sentence, short enough not to linger. */
const DEFAULT_DURATION_MS = 3200;

export function EdToast({
  message,
  onDismiss,
  duration = DEFAULT_DURATION_MS,
  reduced = false,
}: {
  message: string;
  onDismiss: () => void;
  duration?: number;
  /** Pass the screen's reduce-motion flag; the fade is skipped when true. */
  reduced?: boolean;
}) {
  const opacity = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (!reduced) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: FADE_MS,
        useNativeDriver: true,
      }).start();
    }
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [opacity, reduced, duration, onDismiss]);

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: 24,
        opacity,
        alignItems: "center",
      }}
    >
      <View
        style={[
          {
            backgroundColor: palette.paper,
            borderWidth: 1,
            borderColor: palette.mist,
            borderRadius: radii.md,
            paddingVertical: 12,
            paddingHorizontal: 16,
            maxWidth: 420,
          },
          shadows.card,
        ]}
      >
        <Body size={14} tone="ink" style={{ textAlign: "center" }}>
          {message}
        </Body>
      </View>
    </Animated.View>
  );
}
