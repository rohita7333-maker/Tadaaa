/**
 * Pricing FAQ — a mirror of the web component
 * (`surprise-invite/src/components/pricing/PricingFAQ.tsx`), copy included.
 *
 * The copy is deliberately NOT rewritten here. Both platforms restate the plan
 * table in words and carry no numbers of their own, so `src/lib/constants.ts`
 * (mobile) and `src/lib/pricing.ts` (web) stay the single source of truth and
 * the two platforms cannot drift apart. If an answer needs to change, change it
 * on web first and copy it across.
 *
 * Behaviour mirrors web too: single-open accordion, `+` that rotates to `×` at
 * 45°, one panel visible at a time.
 *
 * The disclosure matches web's motion rather than approximating it. Web
 * transitions `grid-template-rows` from 0fr to 1fr over 300ms with Tailwind's
 * `ease-out` (cubic-bezier(0, 0, .2, 1)), clipping the panel with
 * `overflow:hidden`. React Native has no intrinsic-size keyframe, so the panel
 * stays mounted, reports its natural height through onLayout, and the wrapper
 * animates between 0 and that height on the same curve for the same duration.
 * Both animations are skipped entirely under OS reduce-motion.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Pressable, View } from "react-native";
import { Body, Heading, useReducedMotion } from "@/components/editorial";
import { fonts, palette } from "@/theme/tokens";

/** Verbatim from the web component. Do not re-word on this side. */
const FAQ_ITEMS: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: "Do contributors need an account?",
    a: "No. Anyone with the link can add a message or a photo without signing up. That is the whole point.",
  },
  {
    q: "Is anything a subscription?",
    a: "Only Unlimited. Plus is a one-off charge for a single surprise, and Free never asks for a card.",
  },
  {
    q: "Can I buy one as a gift?",
    a: "Yes. Buy a gift invite without an account, we email it to whoever you choose, and they redeem it whenever they are ready.",
  },
];

const GLYPH_DURATION_MS = 180;
/** Web renders the glyph inside the 17px question button, so it inherits 17px. */
const GLYPH_FONT_SIZE = 17;
/** Web: `duration-300 ease-out` on the grid-template-rows transition. */
const PANEL_DURATION_MS = 300;
/** Tailwind `ease-out` is cubic-bezier(0, 0, .2, 1). Same curve, not a lookalike. */
const EASE_OUT = Easing.bezier(0, 0, 0.2, 1);

function Plus({ open }: { open: boolean }) {
  const reduced = useReducedMotion();
  const spin = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    const to = open ? 1 : 0;
    if (reduced) {
      spin.setValue(to);
      return;
    }
    const anim = Animated.timing(spin, {
      toValue: to,
      duration: GLYPH_DURATION_MS,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [open, reduced, spin]);

  return (
    <Animated.Text
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{
        fontFamily: fonts.body,
        fontSize: GLYPH_FONT_SIZE,
        color: palette.stone,
        transform: [
          {
            rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "45deg"] }),
          },
        ],
      }}
    >
      +
    </Animated.Text>
  );
}

/**
 * The 0 to intrinsic-height disclosure. The answer is always mounted so its
 * natural height can be measured; the wrapper clips it and animates the reveal.
 * Collapsed content is pulled out of the accessibility tree and made
 * untappable, so an unopened answer is not read out or hit-tested.
 */
function Panel({ open, children }: { open: boolean; children: ReactNode }) {
  const reduced = useReducedMotion();
  const [contentHeight, setContentHeight] = useState(0);
  const progress = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    const to = open ? 1 : 0;
    if (reduced) {
      progress.setValue(to);
      return;
    }
    const anim = Animated.timing(progress, {
      toValue: to,
      duration: PANEL_DURATION_MS,
      easing: EASE_OUT,
      // Height is a layout property, so this cannot run on the native driver.
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [open, reduced, progress]);

  return (
    <Animated.View
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? "auto" : "no-hide-descendants"}
      pointerEvents={open ? "auto" : "none"}
      style={{
        overflow: "hidden",
        height: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, contentHeight],
        }),
      }}
    >
      <View onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}>{children}</View>
    </Animated.View>
  );
}

export function PricingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <View style={{ maxWidth: 620, width: "100%", alignSelf: "center", marginTop: 48 }}>
      <Heading size={22} accessibilityRole="header" style={{ marginBottom: 10 }}>
        Questions
      </Heading>

      {FAQ_ITEMS.map((item, i) => {
        const open = openIndex === i;
        return (
          <View key={item.q} style={{ borderBottomWidth: 1, borderBottomColor: palette.mist }}>
            <Pressable
              onPress={() => setOpenIndex(open ? null : i)}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
                minHeight: 44,
                paddingHorizontal: 4,
                paddingVertical: 18,
              }}
            >
              <Heading size={17} style={{ flex: 1 }}>
                {item.q}
              </Heading>
              <Plus open={open} />
            </Pressable>

            <Panel open={open}>
              <Body size={14} style={{ paddingHorizontal: 4, paddingBottom: 18 }}>
                {item.a}
              </Body>
            </Panel>
          </View>
        );
      })}
    </View>
  );
}
