/**
 * Stable per-install anonymous identity, used as `visitor_hash` for RSVP /
 * answer / contribution dedup (the web app derives an equivalent hash from IP +
 * UA). Persisted in SecureStore so a person can't double-RSVP from one device,
 * mirroring the UNIQUE (invite_id, visitor_hash) DB constraint.
 */
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEY = "tadaaaa.visitorHash";
let cached: string | null = null;

function uuid(): string {
  const g = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  // Fallback: RFC4122-ish v4 from Math.random (adequate for a dedup token).
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function visitorHash(): Promise<string> {
  if (cached) return cached;
  try {
    const existing = await SecureStore.getItemAsync(KEY);
    if (existing) {
      cached = existing;
      return existing;
    }
  } catch {
    // SecureStore unavailable (e.g. web) — fall through to a fresh value.
  }
  const next = uuid();
  try {
    await SecureStore.setItemAsync(KEY, next);
  } catch {
    /* best effort */
  }
  cached = next;
  return next;
}

export function userAgent(): string {
  return `TaDaaaaMobile/${Platform.OS}`;
}
