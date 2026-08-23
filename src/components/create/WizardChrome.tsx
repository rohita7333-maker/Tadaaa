/**
 * Wizard chrome — shared by C1–C6.
 *
 * Frame spec, every step: a header row of ✕ (step 1) or ‹ (2–6), a "STEP n OF 6"
 * micro-label, and a right slot ("Save" on 1, a "Peek" pill on 2–3) · a
 * 6-segment progress bar directly under it, 3px tall with 4px gaps, completed
 * coral and remaining mist · a footer bar with a 1px mist top border, paper
 * fill, and a 52px full-width ink "Continue" pill, PINNED ABOVE THE KEYBOARD on
 * every step — never at the end of a scroll · a 12px "Saved" beside Continue for
 * ~1.2s after each autosave.
 */
import { useEffect, useState, type ReactNode } from "react";
import { Keyboard, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { EdButton, palette } from "@/components/editorial";
import { keyboardInset, type KeyboardInsetPlatform } from "@/lib/keyboard-inset";
import { TOTAL_STEPS, progressSegments, rightSlot, stepLabel } from "@/lib/wizard";
import { radii, space, touch, type } from "@/theme/tokens";

const SEGMENT_HEIGHT = 3;
const SEGMENT_GAP = 4;

/**
 * Keyboard height, straight from the OS.
 *
 * `KeyboardAvoidingView` cannot be used here: it compares a parent-relative
 * layout frame with a screen-space keyboard position, and this screen is
 * presented as a modal, so the two disagree by the sheet's top inset and the
 * footer lifts short. See `lib/keyboard-inset.ts`.
 */
function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    // `WillChangeFrame` tracks the interactive dismiss gesture too, which
    // `DidShow`/`DidHide` miss entirely — drag the keyboard down slowly with
    // those and the footer stays lifted until the gesture ends.
    const showEvent = Platform.OS === "ios" ? "keyboardWillChangeFrame" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, (e) =>
      setHeight(e?.endCoordinates?.height ?? 0)
    );
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}

export function WizardChrome({
  step,
  onClose,
  onBack,
  onSaveDraft,
  onPeek,
  onContinue,
  continueLabel = "Continue",
  continueDisabled,
  busy,
  savedFlash,
  children,
}: {
  step: number;
  onClose: () => void;
  onBack: () => void;
  onSaveDraft: () => void;
  onPeek: () => void;
  onContinue: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  busy?: boolean;
  /** True for ~1.2s after an autosave lands. */
  savedFlash?: boolean;
  children: ReactNode;
}) {
  const slot = rightSlot(step);
  const segments = progressSegments(step);
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const lift = keyboardInset({
    keyboardHeight,
    safeAreaBottom: insets.bottom,
    platform: Platform.OS as KeyboardInsetPlatform,
  });

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: palette.paper }}>
      <View style={{ flex: 1, paddingBottom: lift }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
              minHeight: touch.min,
            }}
          >
            <Pressable
              onPress={step === 1 ? onClose : onBack}
              accessibilityRole="button"
              accessibilityLabel={step === 1 ? "Close" : "Back a step"}
              hitSlop={12}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, paddingHorizontal: 6 })}
            >
              <Text style={{ fontSize: 24, color: palette.ink }}>{step === 1 ? "✕" : "‹"}</Text>
            </Pressable>

            <Text style={type.sectionLabel}>{stepLabel(step)}</Text>

            {slot === "save" ? (
              <Pressable
                onPress={onSaveDraft}
                accessibilityRole="button"
                accessibilityLabel="Save this draft"
                hitSlop={12}
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
              >
                <Text style={{ ...type.body, fontSize: 13, fontWeight: "600", color: palette.stone }}>
                  Save
                </Text>
              </Pressable>
            ) : slot === "peek" ? (
              <Pressable
                onPress={onPeek}
                accessibilityRole="button"
                accessibilityLabel="Peek at the reveal"
                style={({ pressed }) => ({
                  minHeight: 32,
                  paddingHorizontal: 14,
                  borderRadius: radii.pill,
                  borderWidth: 1,
                  borderColor: palette.mist,
                  justifyContent: "center",
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text style={{ ...type.buttonLabel, fontSize: 11 }}>Peek</Text>
              </Pressable>
            ) : (
              // Fixed-width spacer so the step label stays centred whether or
              // not the slot is occupied.
              <View style={{ width: 44 }} />
            )}
          </View>

          <View style={{ flexDirection: "row", gap: SEGMENT_GAP, marginBottom: space.x6 }}>
            {segments.map((done, i) => (
              <View
                key={i}
                accessible={i === 0}
                accessibilityLabel={i === 0 ? stepLabel(step) : undefined}
                style={{
                  flex: 1,
                  height: SEGMENT_HEIGHT,
                  borderRadius: 2,
                  backgroundColor: done ? palette.coral : palette.mist,
                }}
              />
            ))}
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: space.x8 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>

        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: palette.mist,
            backgroundColor: palette.paper,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 10,
          }}
        >
          {/* Frame C2 puts "Saved" to the LEFT of the pill, not the right, and
              the pill flexes to fill what is left. The frame only ever draws
              the saved state, so it never showed what happens when the word
              leaves: the row reflows and the pill jumps. It is always mounted
              here and toggles visibility instead — same composition, no thrash. */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.x3 }}>
            <Text
              accessibilityLiveRegion="polite"
              // Invisible is not "absent" to a screen reader; hide it properly
              // rather than announcing a permanent "Saved".
              accessibilityElementsHidden={!savedFlash}
              importantForAccessibility={savedFlash ? "yes" : "no-hide-descendants"}
              // A plain toggle, not an Animated.Value. Under react-native-web
              // the animated opacity never left 0 — verified by sampling the
              // inline style every 100ms across a save that demonstrably wrote
              // to storage — so the word never appeared at all. A 12px status
              // label is not worth a renderer-dependent fade.
              style={{ ...type.bodySecondary, fontSize: 12, flexShrink: 0, opacity: savedFlash ? 1 : 0 }}
            >
              Saved
            </Text>
            <View style={{ flex: 1 }}>
              <EdButton
                title={continueLabel}
                variant="ink"
                disabled={continueDisabled}
                loading={busy}
                onPress={onContinue}
                style={{ minHeight: touch.control }}
              />
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

export { TOTAL_STEPS };
