/**
 * Reveal chrome — `chrome()` in `tadaaaa/tadaaaa-editorial.html`.
 *
 *   .rtop{position:fixed;top:24px;display:flex;justify-content:space-between;
 *         padding:14px 20px;z-index:60;pointer-events:none}
 *   .rtop button{pointer-events:auto;width:44px;height:44px;border-radius:50%;
 *                background:rgba(255,255,254,.14);color:#fff;backdrop-filter:blur(6px)}
 *   .wm{position:fixed;bottom:64px;font-size:11px;color:var(--stone)}
 *
 * React Native has no `backdrop-filter`, so the 14% paper fill carries the
 * control on its own with a hairline edge for definition on light photography.
 * The watermark follows the mockup's tier rule — free tier only.
 */
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Music, Pause, Share2, X } from "lucide-react-native";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { TOUCH_MIN, fonts, palette } from "@/components/editorial";

const CONTROL_BG = "rgba(255,254,253,0.14)";
const CONTROL_EDGE = "rgba(255,254,253,0.24)";

function RoundControl({
  onPress,
  accessibilityLabel,
  selected,
  children,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  /** Mirrors web's `aria-pressed` on the music toggle. */
  selected?: boolean;
  children: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={selected === undefined ? undefined : { selected }}
      hitSlop={6}
      style={({ pressed }) => ({
        width: TOUCH_MIN,
        height: TOUCH_MIN,
        borderRadius: TOUCH_MIN / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: CONTROL_BG,
        borderWidth: 1,
        borderColor: CONTROL_EDGE,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {children}
    </Pressable>
  );
}

/**
 * The ambient arpeggio. Web synthesizes C5 E5 G5 B5 live through WebAudio
 * oscillators (`surprise-invite/src/components/surprise/RevealChrome.tsx`
 * NOTE_FREQS). expo-audio is a file player with no oscillator, so the same
 * voicing ships pre-rendered by `scripts/gen-chime.js` and loops instead —
 * identical notes, no new dependency. This is the same asset and the same
 * hook the scroll-story reveal already uses.
 */
const CHIME_SOURCE = require("../../../assets/audio/chime.wav");

/** `.rtop` — close on the left, share and music on the right, over the ink ground. */
export function RevealTopBar({ onClose, onShare }: { onClose?: () => void; onShare?: () => void }) {
  const insets = useSafeAreaInsets();
  const [musicOn, setMusicOn] = useState(false);

  // Loaded but silent until the visitor asks for it — same as web, where the
  // AudioContext is only constructed on the first toggle.
  const player = useAudioPlayer(CHIME_SOURCE);

  useEffect(() => {
    player.loop = true;
    // Ambient music must not silence other audio or ignore the ringer switch.
    setAudioModeAsync({ playsInSilentMode: false, shouldPlayInBackground: false }).catch(() => {});
  }, [player]);

  const toggleMusic = useCallback(() => {
    setMusicOn((on) => {
      try {
        if (on) {
          player.pause();
        } else {
          player.seekTo(0);
          player.play();
        }
      } catch {
        /* a released player after unmount must not crash the reveal */
      }
      return !on;
    });
  }, [player]);
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: insets.top + 10,
        left: 0,
        right: 0,
        zIndex: 60,
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 20,
      }}
    >
      {onClose ? (
        <RoundControl onPress={onClose} accessibilityLabel="Close">
          <X size={18} color={palette.paper} strokeWidth={1.8} />
        </RoundControl>
      ) : (
        <View style={{ width: TOUCH_MIN }} />
      )}
      {/* Web order: share, then music. */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        {onShare ? (
          <RoundControl onPress={onShare} accessibilityLabel="Share this surprise">
            <Share2 size={17} color={palette.paper} strokeWidth={1.8} />
          </RoundControl>
        ) : null}
        <RoundControl
          onPress={toggleMusic}
          accessibilityLabel={musicOn ? "Pause music" : "Play music"}
          selected={musicOn}
        >
          {musicOn ? (
            <Pause size={17} color={palette.paper} strokeWidth={1.8} />
          ) : (
            <Music size={17} color={palette.paper} strokeWidth={1.8} />
          )}
        </RoundControl>
      </View>
    </View>
  );
}

/**
 * `.wm` — the free-tier watermark. Rendered inline at the end of the reveal
 * rather than pinned to the viewport: a fixed footer over a scrolling reveal
 * covers content on short phones, and the mockup's own `bottom:64px` exists
 * only to clear its `.reactbar`, which this build does not ship.
 */
export function RevealWatermark({ onPress }: { onPress?: () => void }) {
  const body = (
    <Text
      style={{
        fontFamily: fonts.body,
        fontSize: 11,
        color: palette.sand,
        textAlign: "center",
      }}
    >
      Made with TaDaaaa{onPress ? " · Create your own →" : ""}
    </Text>
  );
  if (!onPress) return <View style={{ paddingVertical: 24 }}>{body}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel="Made with TaDaaaa. Create your own."
      hitSlop={10}
      style={{ minHeight: TOUCH_MIN, justifyContent: "center", paddingVertical: 12 }}
    >
      {body}
    </Pressable>
  );
}

/** Shared ink ground for every non-scroll-story reveal (`.rr`). */
export const REVEAL_GROUND = {
  flex: 1,
  backgroundColor: palette.ink,
} as const;
