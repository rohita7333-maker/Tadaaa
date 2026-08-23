/**
 * `keyboardInset` — how far the wizard footer must lift to clear the keyboard.
 *
 * WHY THIS IS NOT `KeyboardAvoidingView`.
 *
 * RN 0.81's KAV mixes two coordinate spaces:
 *
 *   _onLayout  -> this._frame = event.nativeEvent.layout      // PARENT-relative
 *   keyboardY  =  keyboardFrame.screenY - keyboardVerticalOffset  // SCREEN space
 *   padding    =  frame.y + frame.height - keyboardY
 *
 * On a full-screen route the two spaces coincide and it works — which is why
 * sign-in and sign-up, which use the identical KAV call, have never been
 * reported broken. The create wizard is registered `presentation: "modal"`
 * (app/_layout.tsx), so on iOS it renders in a pageSheet whose top is inset
 * from the screen. `frame.y + frame.height` then measures the SHEET while
 * `keyboardY` still measures the SCREEN, and the padding comes out short by
 * exactly the sheet's top inset:
 *
 *   padding = kbHeight - (screenHeight - sheetHeight) = kbHeight - sheetTopInset
 *
 * The footer lifts too little and the keyboard sits over the Continue pill.
 * Reported from a device as "I see continue button under the keyboard".
 *
 * The sheet's BOTTOM is flush with the screen, so the correct lift needs
 * neither the sheet's offset nor its height — only the keyboard height and the
 * bottom safe-area inset the SafeAreaView has already added below the footer.
 */
import { keyboardInset } from "../keyboard-inset";

describe("keyboardInset — ios", () => {
  it("is zero when the keyboard is down", () => {
    expect(keyboardInset({ keyboardHeight: 0, safeAreaBottom: 34, platform: "ios" })).toBe(0);
  });

  it("lifts by the keyboard height less the inset already below the footer", () => {
    // SafeAreaView edges include "bottom", so 34px of home-indicator padding is
    // already under the footer. Adding the full keyboard height would float it.
    expect(keyboardInset({ keyboardHeight: 336, safeAreaBottom: 34, platform: "ios" })).toBe(302);
  });

  it("lifts by the full height on a device with no bottom inset", () => {
    expect(keyboardInset({ keyboardHeight: 260, safeAreaBottom: 0, platform: "ios" })).toBe(260);
  });

  it("never returns a negative inset", () => {
    // A floating/split keyboard can report less height than the safe area.
    expect(keyboardInset({ keyboardHeight: 20, safeAreaBottom: 34, platform: "ios" })).toBe(0);
  });

  it("does not depend on where the sheet's top edge is", () => {
    // The whole point: no modal offset term. Same inputs, same answer, whether
    // the route is full-screen or a pageSheet.
    const a = keyboardInset({ keyboardHeight: 336, safeAreaBottom: 34, platform: "ios" });
    const b = keyboardInset({ keyboardHeight: 336, safeAreaBottom: 34, platform: "ios" });
    expect(a).toBe(b);
    expect(a).toBe(302);
  });
});

describe("keyboardInset — android", () => {
  it("is always zero, because windowSoftInputMode already resized the window", () => {
    // Doubling up here lifts the footer off the keyboard by its own height —
    // the reason the original KAV passed `behavior={undefined}` on Android.
    expect(keyboardInset({ keyboardHeight: 336, safeAreaBottom: 24, platform: "android" })).toBe(0);
    expect(keyboardInset({ keyboardHeight: 0, safeAreaBottom: 24, platform: "android" })).toBe(0);
  });
});

describe("keyboardInset — web", () => {
  it("is zero; the browser reflows on its own", () => {
    expect(keyboardInset({ keyboardHeight: 300, safeAreaBottom: 0, platform: "web" })).toBe(0);
  });
});

describe("keyboardInset — junk input", () => {
  it("treats a non-finite keyboard height as down rather than throwing", () => {
    expect(keyboardInset({ keyboardHeight: NaN, safeAreaBottom: 34, platform: "ios" })).toBe(0);
    expect(
      keyboardInset({ keyboardHeight: Infinity, safeAreaBottom: 34, platform: "ios" })
    ).toBe(0);
  });

  it("treats a non-finite safe area as zero", () => {
    expect(keyboardInset({ keyboardHeight: 300, safeAreaBottom: NaN, platform: "ios" })).toBe(300);
  });
});
