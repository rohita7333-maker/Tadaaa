/**
 * A2's second-launch Face ID sheet.
 *
 * "Face ID is offered on the SECOND launch (a sheet: 'Use Face ID next time?'),
 * never on first sign-in."
 *
 * The reason is worth keeping: asking during sign-up asks someone to hand over
 * a biometric to an app they have not used yet. On the second sign-in they have
 * seen what is inside and the ask reads as convenience rather than a toll.
 *
 * The count lives on the device, not the profile — it is about this phone's
 * sensor, and a second phone deserves its own first launch.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const COUNT_KEY = "tadaaaa.signInCount";
const ASKED_KEY = "tadaaaa.faceIdAsked";

export interface FaceIdOfferInput {
  signInCount: number;
  alreadyAsked: boolean;
  alreadyEnabled: boolean;
  available: boolean;
}

export function shouldOfferFaceId(input: FaceIdOfferInput): boolean {
  if (!input.available) return false;
  if (input.alreadyAsked) return false;
  if (input.alreadyEnabled) return false;
  return input.signInCount >= 2;
}

export async function recordSignIn(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(COUNT_KEY);
    const next = (Number(raw) || 0) + 1;
    await AsyncStorage.setItem(COUNT_KEY, String(next));
    return next;
  } catch {
    // Storage failure means the offer never fires. That is the safe side: a
    // biometric prompt is not worth a retry loop.
    return 0;
  }
}

export async function hasAskedFaceId(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ASKED_KEY)) === "1";
  } catch {
    return true;
  }
}

export async function markFaceIdAsked(): Promise<void> {
  try {
    await AsyncStorage.setItem(ASKED_KEY, "1");
  } catch {
    // Worst case it asks once more. Not worth surfacing.
  }
}
