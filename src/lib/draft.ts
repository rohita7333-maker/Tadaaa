/**
 * Wizard draft persistence — the store behind B1's resume card and the C1–C6
 * autosave the handoff specifies ("every change autosaves to the local draft,
 * debounced 500ms").
 *
 * The handoff names `react-native-mmkv`. That is not installed, and adding a
 * native module to reach the first screen is a poor trade — AsyncStorage is
 * already a dependency (Supabase's session store uses it), is async-safe, and
 * carries the same durability guarantee for a payload this size. If MMKV lands
 * later for the upload queue, this module is the only thing that changes.
 *
 * Photos are deliberately NOT stored: file URIs on iOS point into a container
 * that can be reaped between launches, so a persisted photo list resurrects as
 * broken references. The wizard re-asks for them, and says so.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "tadaaaa.createDraft";

export interface StoredDraft {
  /** Wizard title, when the user got that far. Drives the B1 card's heading. */
  title: string;
  /** Frame B1: "Step 3 of 6 · saved 2h ago". */
  detail: string;
  step: number;
  savedAt: number;
  /** Everything else the wizard needs, kept opaque so this module never has to
   *  change shape when a step gains a field. */
  payload: Record<string, unknown>;
}

interface PersistedShape {
  title?: string;
  step?: number;
  savedAt?: number;
  payload?: Record<string, unknown>;
}

/** Frame B1 wording. Coarse on purpose — a live-ticking draft age is noise. */
export function describeAge(savedAt: number, now: number = Date.now()): string {
  const mins = Math.max(0, Math.floor((now - savedAt) / 60_000));
  if (mins < 1) return "saved just now";
  if (mins < 60) return `saved ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `saved ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `saved ${days}d ago`;
}

export function formatDetail(step: number, savedAt: number, now?: number): string {
  const clamped = Math.min(6, Math.max(1, step));
  return `Step ${clamped} of 6 · ${describeAge(savedAt, now)}`;
}

export async function readDraft(): Promise<StoredDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedShape;
    // A draft with no step is a half-written record from an interrupted save;
    // treat it as absent rather than rendering a card that resumes nowhere.
    if (typeof parsed.step !== "number") return null;
    const savedAt = typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now();
    return {
      title: typeof parsed.title === "string" ? parsed.title : "",
      step: parsed.step,
      savedAt,
      detail: formatDetail(parsed.step, savedAt),
      payload: parsed.payload ?? {},
    };
  } catch {
    // Corrupt JSON must not wedge Home. A draft is a convenience, not data.
    return null;
  }
}

export async function writeDraft(input: {
  title?: string;
  step: number;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const record: PersistedShape = {
    title: input.title ?? "",
    step: input.step,
    savedAt: Date.now(),
    payload: input.payload ?? {},
  };
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(record));
  } catch {
    // Storage full or unavailable — the wizard keeps working in memory.
  }
}

export async function clearDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // Nothing to do; a stale draft is recoverable, a crash here is not.
  }
}
