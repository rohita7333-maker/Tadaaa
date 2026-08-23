/**
 * D1 — PIN gate.
 *
 * Ink ground with the theme photo at `opacity .18` behind it: enough to prove
 * something is there, never enough to spoil it. Sand micro-label, 30px serif
 * "Four digits first.", the creator's optional hint, four dots, then a custom
 * 3x4 keypad of 72px outlined circles.
 *
 * NEVER the system keyboard — the frame is explicit, and a numeric keyboard on
 * a dark reveal both breaks the composition and hands the OS a field it will
 * offer to autofill.
 *
 * Verification is server-side (`verify_invite_pin`). The hash never reaches the
 * device, and the RPC carries its own rate limit, so a scripted caller hits the
 * same wall as the keypad.
 */
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Delete } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import {
  INITIAL_PIN_STATE,
  PIN_LENGTH,
  cooldownSecondsLeft,
  isCoolingDown,
  isComplete,
  pinMessage,
  pressBackspace,
  pressDigit,
  registerWrong,
  reset,
  verifyPin,
  type PinState,
} from "@/lib/pin-gate";
import { palette, overlay, radii, space, screenPadding, touch, type } from "@/theme/tokens";
import { useReducedMotion } from "@/components/editorial";

/** Frame D1: 72px keypad keys. */
const KEY = touch.pinKey;
const DOT = 16;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

export interface PinGateProps {
  slug: string;
  /** Frame D1: "FOR MAYA, FROM DEV". */
  microLabel?: string;
  hint?: string | null;
  /**
   * Handed the PIN the SERVER accepted, not the one that was typed. Everything
   * the recipient reads afterwards is authorised by this string — the reveal
   * readers withhold a PIN-locked invite entirely — so it has to travel.
   */
  onUnlocked: (verifiedPin: string) => void;
  /**
   * Shown as a ✕ only when there is somewhere to go back TO.
   *
   * Frame D1 draws no back control, and for a recipient arriving on a bare
   * link that is right — there is no history behind it. But the creator
   * reaches this same screen from their own detail screen's Play button, and
   * this branch returns before `RevealTopBar` ever renders, so they were
   * trapped on a keypad for a surprise they made. Same `canGoBack` rule the
   * top bar already uses.
   */
  onBack?: () => void;
}

export default function PinGate({ slug, microLabel, hint, onUnlocked, onBack }: PinGateProps) {
  const [state, setState] = useState<PinState>(INITIAL_PIN_STATE);
  const [checking, setChecking] = useState(false);
  /** Survives the re-render that `setChecking` causes; `checking` does not. */
  const inFlight = useRef(false);
  const [, setTick] = useState(0);
  const reduced = useReducedMotion();

  // Re-render once a second ONLY while cooling down, so the countdown message
  // moves. No timer otherwise — an always-on interval on a reveal screen is
  // exactly the kind of thing that drains a recipient's battery at a party.
  useEffect(() => {
    if (!isCoolingDown(state)) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [state]);

  /**
   * Submit as soon as the fourth digit lands — the frame has no confirm button.
   *
   * The in-flight guard is a REF, and `checking` is NOT in the dependency
   * array. It used to be both: the effect called `setChecking(true)`, which
   * re-rendered, which changed a dependency, which ran the CLEANUP and set
   * `active = false` — so `verifyPin`'s result was discarded every single time
   * and the correct PIN was never accepted. The keypad filled its four dots and
   * sat there, forever. Seen doing exactly that in a browser; the server was
   * answering `{"ok": true}` the whole while.
   *
   * `checking` stays as state because the keypad dims on it; it just must not
   * be a trigger for the effect that sets it.
   */
  useEffect(() => {
    if (!isComplete(state) || inFlight.current) return;
    let active = true;
    inFlight.current = true;
    setChecking(true);
    (async () => {
      const ok = await verifyPin(slug, state.entry);
      inFlight.current = false;
      if (!active) return;
      setChecking(false);
      if (ok) {
        if (!reduced) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
        setState(reset());
        onUnlocked(state.entry);
      } else {
        if (!reduced) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        }
        setState((s) => registerWrong(s));
      }
    })();
    return () => {
      active = false;
    };
  }, [state, slug, onUnlocked, reduced]);

  const cooling = isCoolingDown(state);
  const message = pinMessage(state);

  function onKey(k: string) {
    if (k === "") return;
    if (!reduced) Haptics.selectionAsync().catch(() => {});
    setState((s) => (k === "⌫" ? pressBackspace(s) : pressDigit(s, k)));
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.ink }}>
      {onBack ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={12}
            style={({ pressed }) => ({
              width: touch.min,
              height: touch.min,
              justifyContent: "center",
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <Text style={{ fontSize: 24, color: palette.paper }}>✕</Text>
          </Pressable>
        </View>
      ) : null}

      <View
        style={{
          flex: 1,
          paddingHorizontal: screenPadding.centered,
          alignItems: "center",
          justifyContent: "center",
          // The ✕ is absent for recipients, so the keypad must not shift when
          // it is present — pull the block back up by the control's height.
          paddingBottom: onBack ? touch.min : 0,
          gap: space.x5,
        }}
      >
        {microLabel ? (
          <Text style={{ ...type.revealMicroLabel, textAlign: "center" }}>{microLabel}</Text>
        ) : null}

        <Text style={{ ...type.screenTitle, fontSize: 30, color: palette.paper, textAlign: "center" }}>
          Four digits first.
        </Text>

        {/* The hint yields to any live message — an error the recipient can act
            on beats a hint they have already read. */}
        <Text
          style={{
            ...type.bodySecondary,
            color: cooling ? palette.sand : overlay.textSoft,
            textAlign: "center",
            minHeight: 20,
          }}
          accessibilityLiveRegion="polite"
        >
          {message ?? hint ?? ""}
        </Text>

        {/* Four dots, filled sand as entered. */}
        <View
          style={{ flexDirection: "row", gap: space.x4, marginVertical: space.x3 }}
          accessibilityLabel={`${state.entry.length} of ${PIN_LENGTH} digits entered`}
        >
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={{
                width: DOT,
                height: DOT,
                borderRadius: DOT / 2,
                borderWidth: 1,
                borderColor: overlay.borderStrong,
                backgroundColor: i < state.entry.length ? palette.sand : "transparent",
              }}
            />
          ))}
        </View>

        {/* 3x4 keypad. Rendered even during a cooldown — the frame greys it
            rather than removing it, so the screen does not jump. */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            width: KEY * 3 + space.x5 * 2,
            gap: space.x5,
            justifyContent: "center",
            opacity: cooling ? 0.4 : 1,
          }}
        >
          {KEYS.map((k, i) =>
            k === "" ? (
              <View key={`gap-${i}`} style={{ width: KEY, height: KEY }} />
            ) : (
              <Pressable
                key={k}
                onPress={() => onKey(k)}
                disabled={cooling || checking}
                accessibilityRole="button"
                accessibilityLabel={k === "⌫" ? "Delete" : k}
                style={({ pressed }) => ({
                  width: KEY,
                  height: KEY,
                  borderRadius: KEY / 2,
                  borderWidth: 1,
                  borderColor: overlay.borderSoft,
                  alignItems: "center",
                  justifyContent: "center",
                  transform: [{ scale: pressed && !reduced ? 0.98 : 1 }],
                })}
              >
                {k === "⌫" ? (
                  <Delete size={22} color={palette.paper} strokeWidth={1.4} />
                ) : (
                  <Text style={{ ...type.screenTitle, fontSize: 26, color: palette.paper }}>{k}</Text>
                )}
              </Pressable>
            ),
          )}
        </View>

        {cooling ? (
          <Text style={{ ...type.bodySecondary, color: palette.sand }}>
            {cooldownSecondsLeft(state)}s
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
