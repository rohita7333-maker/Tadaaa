/**
 * Sheet + ActionSheet — the handoff kit's bottom-sheet primitive.
 *
 * Motion table: "Modal / sheet — slide up 320ms cubic-bezier(.2,.9,.2,1),
 * backdrop rgba(26,26,26,.4)". Reduce Motion keeps the opacity cross-fade and
 * drops the slide, per the accessibility rules.
 *
 * Used by B2's `···` menu, C1's AI vibe sheet, C2's music list, C5's wheel
 * picker tray, C6's Peek preview, and the wizard's ✕ action sheet — one
 * implementation so they behave identically.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, Modal, Pressable, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useReducedMotion } from "@/components/editorial";
import { derived, palette, radii, space, touch, type } from "@/theme/tokens";

const SHEET_MS = 320;
/** cubic-bezier(.2,.9,.2,1) — the handoff's sheet curve. */
const SHEET_EASING = Easing.bezier(0.2, 0.9, 0.2, 1);
const BACKDROP = "rgba(26,26,26,0.4)";

export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const { height } = useWindowDimensions();
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(t, {
      toValue: visible ? 1 : 0,
      duration: reduced ? 120 : SHEET_MS,
      easing: SHEET_EASING,
      useNativeDriver: true,
    }).start();
  }, [visible, reduced, t]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={{ flex: 1, backgroundColor: BACKDROP, opacity: t }}>
        {/* Tapping the backdrop dismisses; the sheet body stops the press so a
            tap inside never closes it. */}
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Dismiss" />
      </Animated.View>

      <Animated.View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: palette.paper,
          borderTopLeftRadius: radii.md,
          borderTopRightRadius: radii.md,
          borderTopWidth: 1,
          borderColor: palette.mist,
          opacity: t,
          transform: reduced
            ? []
            : [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [height * 0.4, 0] }) }],
        }}
      >
        <SafeAreaView edges={["bottom"]}>
          <View style={{ alignItems: "center", paddingTop: space.x3 }}>
            <View
              style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: palette.mist }}
            />
          </View>
          {title ? (
            <Text style={{ ...type.sectionLabel, paddingHorizontal: 20, paddingTop: space.x4 }}>
              {title}
            </Text>
          ) : null}
          <View style={{ padding: 20, paddingTop: space.x3 }}>{children}</View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

export interface SheetAction {
  label: string;
  onPress: () => void;
  /** Coral label — deletes and other one-way doors. */
  destructive?: boolean;
  disabled?: boolean;
}

/** A list of choices in a Sheet. B2's `···`, the wizard's ✕. */
export function ActionSheet({
  visible,
  onClose,
  title,
  actions,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  actions: SheetAction[];
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {actions.map((a, i) => (
        <Pressable
          key={a.label}
          disabled={a.disabled}
          accessibilityRole="button"
          accessibilityLabel={a.label}
          onPress={() => {
            onClose();
            a.onPress();
          }}
          style={({ pressed }) => ({
            minHeight: touch.control,
            justifyContent: "center",
            borderTopWidth: i === 0 ? 0 : 1,
            borderTopColor: palette.mist,
            opacity: a.disabled ? 0.4 : pressed ? 0.6 : 1,
          })}
        >
          <Text
            style={{
              ...type.body,
              fontSize: 16,
              // `coralDeep`: plain coral is 3.94:1 on paper, under the AA floor
              // for 16px text.
              color: a.destructive ? derived.coralDeep : palette.ink,
            }}
          >
            {a.label}
          </Text>
        </Pressable>
      ))}
    </Sheet>
  );
}
