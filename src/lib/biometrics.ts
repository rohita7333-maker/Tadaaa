/**
 * Face ID / biometric app lock — frame A2's second-launch sheet and frame B6's
 * "Face ID to open the app" toggle.
 *
 * The preference lives in `profiles.biometric_lock` so it survives a reinstall
 * and follows the account. The DEVICE decides whether it can be honoured:
 * hardware may be absent, or present but unenrolled, and a toggle that turns
 * itself back off with no explanation reads as a bug.
 */
import * as LocalAuthentication from "expo-local-authentication";
import { Platform } from "react-native";

export type BiometricAvailability =
  | { available: true; label: string }
  | { available: false; reason: "no_hardware" | "not_enrolled" | "unsupported" };

/** Product name for the strongest enrolled type, for use in copy. */
function labelFor(types: LocalAuthentication.AuthenticationType[]): string {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return Platform.OS === "ios" ? "Face ID" : "face unlock";
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return Platform.OS === "ios" ? "Touch ID" : "fingerprint";
  }
  return "biometrics";
}

export async function checkBiometrics(): Promise<BiometricAvailability> {
  // react-native-web has no LocalAuthentication module; the reveal routes are
  // the web target, and the app shell is not.
  if (Platform.OS === "web") return { available: false, reason: "unsupported" };

  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return { available: false, reason: "no_hardware" };

  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!enrolled) return { available: false, reason: "not_enrolled" };

  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  return { available: true, label: labelFor(types) };
}

export const UNAVAILABLE_COPY: Record<
  Extract<BiometricAvailability, { available: false }>["reason"],
  string
> = {
  no_hardware: "This phone has no biometric sensor.",
  not_enrolled: "Set up Face ID or a fingerprint in your phone's settings first.",
  unsupported: "Biometric lock is only available in the app.",
};

/**
 * Prompt once. `disableDeviceFallback: false` deliberately leaves the passcode
 * escape hatch in place — a lock with no fallback bricks the app the first time
 * a sensor misreads a wet thumb.
 */
export async function authenticate(reason: string): Promise<boolean> {
  if (Platform.OS === "web") return true;
  const res = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    disableDeviceFallback: false,
    cancelLabel: "Cancel",
  });
  return res.success;
}
