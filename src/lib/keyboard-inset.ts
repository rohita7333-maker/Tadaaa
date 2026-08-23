/**
 * How far a bottom-pinned footer must lift to clear the software keyboard.
 *
 * This replaces `KeyboardAvoidingView` for the create wizard. RN 0.81's KAV
 * compares a PARENT-relative layout frame against a SCREEN-space keyboard
 * position, which agrees only on a full-screen route. The wizard is registered
 * `presentation: "modal"`, so on iOS it lives in a pageSheet inset from the top
 * of the screen, and the padding KAV computes falls short by exactly that
 * inset — putting the keyboard over the Continue pill.
 *
 * A pageSheet's BOTTOM edge is flush with the screen, so the lift needs neither
 * the sheet's offset nor its height. Keyboard height, minus the bottom
 * safe-area inset the SafeAreaView has already placed under the footer, is the
 * whole calculation — and it is identical on a full-screen route, so this is
 * safe to use anywhere.
 */
export type KeyboardInsetPlatform = "ios" | "android" | "web" | "windows" | "macos";

export interface KeyboardInsetInput {
  /** `endCoordinates.height` from a keyboard event. 0 when the keyboard is down. */
  keyboardHeight: number;
  /** `useSafeAreaInsets().bottom` — already applied below the footer. */
  safeAreaBottom: number;
  platform: KeyboardInsetPlatform;
}

function finite(n: number): number {
  return Number.isFinite(n) ? n : 0;
}

export function keyboardInset({
  keyboardHeight,
  safeAreaBottom,
  platform,
}: KeyboardInsetInput): number {
  // Android's windowSoftInputMode already resizes the window, and web reflows
  // on its own. Adding padding on either double-counts and floats the footer
  // above the keyboard by its own height.
  if (platform !== "ios") return 0;
  return Math.max(0, finite(keyboardHeight) - finite(safeAreaBottom));
}
