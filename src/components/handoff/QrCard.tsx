/**
 * QrCard — frame C7's 196px white QR card, reused by B2's QR action.
 *
 * Generated LOCALLY (`react-native-qrcode-svg` over `react-native-svg`), never
 * fetched: the handoff's reason is that this gets printed and held up at a
 * party, where there may be no signal. It also means the link never leaves the
 * device to be turned into an image by somebody else's server.
 */
import { View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { derived, palette, radii } from "@/theme/tokens";

export const QR_CARD = 196;
/** Quiet zone: the card is 196, the code 156, leaving a 20px margin all round. */
const QR_SIZE = 156;

export interface QrRef {
  toDataURL: (cb: (data: string) => void) => void;
}

export function QrCard({
  url,
  size = QR_CARD,
  getRef,
}: {
  url: string;
  size?: number;
  /** C7's "Save QR" needs the rendered PNG; `toDataURL` returns bare base64. */
  getRef?: (ref: QrRef | null) => void;
}) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="QR code for this surprise link"
      style={{
        width: size,
        height: size,
        borderRadius: radii.md,
        backgroundColor: derived.white,
        borderWidth: 1,
        borderColor: palette.mist,
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "center",
      }}
    >
      <QRCode
        getRef={(r) => getRef?.(r as unknown as QrRef | null)}
        value={url}
        size={Math.round((QR_SIZE / QR_CARD) * size)}
        color={palette.ink}
        backgroundColor={derived.white}
        // M tolerates ~15% damage — enough for a phone camera reading a printed
        // card at an angle without inflating the module count.
        ecl="M"
      />
    </View>
  );
}
