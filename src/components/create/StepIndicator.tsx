/**
 * `.hubsteps` / `.hstep` from `tadaaaa/tadaaaa-editorial.html`.
 *
 * The mockup's own mobile rule is the spec here — at `max-width:960px` it turns
 * the desktop sticky rail into a horizontally scrolling strip:
 *
 *   .hubsteps{display:flex;overflow-x:auto;gap:4px;position:static;
 *             background:var(--paper);border-bottom:1px solid var(--mist)}
 *
 * `.hstep` keeps its `border-left:2px solid var(--coral)` on the active step,
 * which in a horizontal strip reads as a coral tick before the current label.
 * Done steps carry the mockup's 16px check glyph; the rest carry their number.
 *
 * Tapping a completed step walks back to it — the mockup's `wjump(k)`, which
 * only moves backwards (`if(k<=S.wstep)`). Forward jumps stay gated by the
 * wizard's own validation.
 */
import { Pressable, ScrollView, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { TOUCH_MIN, derived, fonts, palette } from "@/components/editorial";

/** Verbatim from web `components/create/StepIndicator.tsx`. */
const STEPS = ["Occasion", "Photos & Message", "Question", "Preview & publish"] as const;

const LABEL_SIZE = 14;
const NUMBER_SIZE = 12;

export default function StepIndicator({
  currentStep,
  onJump,
}: {
  currentStep: number;
  onJump?: (step: number) => void;
}) {
  return (
    <View
      style={{
        backgroundColor: palette.paper,
        borderBottomWidth: 1,
        borderBottomColor: palette.mist,
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 4 }}
        accessibilityRole="tablist"
      >
        {STEPS.map((label, i) => {
          const step = i + 1;
          const done = step < currentStep;
          const active = step === currentStep;
          const canJump = done && !!onJump;
          // The mockup's `color:var(--mist)` for pending steps measures ~1.2:1 on
          // paper. Pending copy is still text, so it ships at `chipMutedText`
          // (4.9:1) — lighter than a done step, but readable. See the divergence
          // note in the P3-C report.
          const color = active ? palette.ink : done ? palette.stone : derived.chipMutedText;

          return (
            <Pressable
              key={label}
              onPress={canJump ? () => onJump(step) : undefined}
              disabled={!canJump}
              accessibilityRole="tab"
              accessibilityState={{ selected: active, disabled: !canJump }}
              accessibilityLabel={`Step ${step}, ${label}${done ? ", completed" : ""}`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                paddingHorizontal: 14,
                paddingVertical: 11,
                minHeight: TOUCH_MIN,
                borderLeftWidth: 2,
                borderLeftColor: active ? palette.coral : "transparent",
              }}
            >
              {done ? (
                <Check size={16} color={color} strokeWidth={1.8} />
              ) : (
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: NUMBER_SIZE,
                    width: 16,
                    color,
                  }}
                >
                  {step}
                </Text>
              )}
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: LABEL_SIZE,
                  fontWeight: active ? "600" : "400",
                  color,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
