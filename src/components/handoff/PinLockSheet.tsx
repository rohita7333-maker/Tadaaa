/**
 * PinLockSheet — the PIN half of frame C5, presented as a sheet so B2's
 * "PIN lock" toggle can set one without leaving the detail screen.
 *
 * Frame C5: "four 62px digit boxes with auto-advance and the weak-PIN warning
 * ('That PIN is easy to guess — maybe another?' for 0000/1111/1234/4321)".
 *
 * The warning does NOT block submission. A creator who wants 1234 for their
 * grandmother should get it; the job is to make sure they chose it on purpose.
 */
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { EdButton, EdField } from "@/components/editorial";
import { Sheet } from "./Sheet";
import { PIN_LENGTH, isWeakPin } from "@/lib/pin-gate";
import { derived, palette, radii, space, type } from "@/theme/tokens";

const BOX = 62;

export const WEAK_PIN_WARNING = "That PIN is easy to guess — maybe another?";

export function PinLockSheet({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (pin: string, hint: string | null) => void;
}) {
  const [pin, setPin] = useState("");
  const [hint, setHint] = useState("");
  const input = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setPin("");
      setHint("");
      // Autofocus after the 320ms slide, not during it: focusing mid-transition
      // races the keyboard against the sheet and lands the tray under it.
      const t = setTimeout(() => input.current?.focus(), 360);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const complete = pin.length === PIN_LENGTH;
  const weak = complete && isWeakPin(pin);

  return (
    <Sheet visible={visible} onClose={onClose} title="Lock with a PIN">
      <Text style={{ ...type.bodySecondary, marginBottom: space.x5 }}>
        Four digits before anything shows. Tell them separately — never in the same message as
        the link.
      </Text>

      {/* One real input drives four boxes: a per-box input array fights the
          keyboard on backspace and breaks paste. The input is transparent and
          sits over the row so a tap anywhere focuses it. */}
      <Pressable
        onPress={() => input.current?.focus()}
        style={{ flexDirection: "row", justifyContent: "space-between" }}
      >
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View
            key={i}
            style={{
              width: BOX,
              height: BOX,
              borderRadius: radii.sm,
              // Selected state is 2px coral with padding reduced by 1 so
              // nothing shifts — the handoff's rule for every selection.
              borderWidth: i === pin.length ? 2 : 1,
              borderColor: i === pin.length ? palette.coral : palette.mist,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ ...type.statValue, fontSize: 28 }}>{pin[i] ? "•" : ""}</Text>
          </View>
        ))}
        <TextInput
          ref={input}
          value={pin}
          onChangeText={(t) => setPin(t.replace(/[^0-9]/g, "").slice(0, PIN_LENGTH))}
          keyboardType="number-pad"
          maxLength={PIN_LENGTH}
          accessibilityLabel="PIN, four digits"
          style={{ position: "absolute", opacity: 0, width: "100%", height: BOX }}
        />
      </Pressable>

      {weak ? (
        <Text style={{ ...type.bodySecondary, color: derived.coralDeep, marginTop: space.x3 }}>
          {WEAK_PIN_WARNING}
        </Text>
      ) : null}

      <View style={{ marginTop: space.x5 }}>
        <EdField
          label="Hint (optional)"
          value={hint}
          onChangeText={setHint}
          placeholder="Our anniversary"
          maxLength={60}
        />
      </View>

      <View style={{ marginTop: space.x5 }}>
        <EdButton
          title="Lock it"
          disabled={!complete}
          onPress={() => {
            onSubmit(pin, hint.trim() === "" ? null : hint.trim());
            onClose();
          }}
        />
      </View>
    </Sheet>
  );
}
