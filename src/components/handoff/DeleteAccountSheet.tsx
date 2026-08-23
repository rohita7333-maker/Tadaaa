/**
 * Delete-account confirmation — frame B6: "Delete keeps the web app's
 * confirmation: type DELETE to proceed."
 *
 * Built as a Sheet rather than `Alert.prompt` because `Alert.prompt` is
 * iOS-only; on Android it silently does nothing, which would have shipped a
 * delete button that appears to work and never asks.
 */
import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { EdButton } from "@/components/editorial";
import { Sheet } from "./Sheet";
import { derived, palette, radii, space, touch, type } from "@/theme/tokens";

export const DELETE_KEYWORD = "DELETE";

export function DeleteAccountSheet({
  visible,
  onClose,
  onConfirm,
  busy,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  busy?: boolean;
}) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (visible) setTyped("");
  }, [visible]);

  // Case-sensitive on purpose: the point of the gesture is deliberate effort.
  const armed = typed === DELETE_KEYWORD;

  return (
    <Sheet visible={visible} onClose={onClose} title="Delete account">
      <Text style={{ ...type.body, marginBottom: space.x4 }}>
        Every surprise you made, every message people wrote on them, and this account itself. It
        cannot be undone and the links stop working immediately.
      </Text>
      <Text style={{ ...type.fieldLabel, marginBottom: space.x2 }}>
        Type {DELETE_KEYWORD} to confirm
      </Text>
      <TextInput
        value={typed}
        onChangeText={setTyped}
        autoCapitalize="characters"
        autoCorrect={false}
        accessibilityLabel={`Type ${DELETE_KEYWORD} to confirm account deletion`}
        style={{
          minHeight: touch.control,
          borderWidth: 1,
          borderColor: armed ? palette.coral : palette.mist,
          borderRadius: radii.sm,
          paddingHorizontal: 14,
          ...type.body,
        }}
      />
      <View style={{ marginTop: space.x5, gap: space.x3 }}>
        <EdButton
          title="Delete my account"
          variant="danger"
          disabled={!armed}
          loading={busy}
          onPress={onConfirm}
        />
        <Text style={{ ...type.bodySecondary, color: derived.coralDeep, textAlign: "center" }}>
          There is no undo.
        </Text>
      </View>
    </Sheet>
  );
}
