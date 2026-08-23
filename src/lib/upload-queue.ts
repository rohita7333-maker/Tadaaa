/**
 * Frame F3 — the failed-upload card, and the queue behind it.
 *
 * Before this, a photo that failed to upload during publish was reported in a
 * toast and then lost: `create/index.tsx` set `uploadFailed` and moved on, so
 * "Published — some photos didn't upload. Add them from the detail screen."
 * asked the creator to redo work the app had already done (pick, crop, resize)
 * and had thrown away. The queue keeps the resized file and offers Retry.
 *
 * F3 says "Uploads queue in MMKV". MMKV is not installed and AsyncStorage is
 * where this app already keeps its draft and its read state, so the queue lives
 * there. The store is an implementation detail of the two functions at the
 * bottom; everything above is pure and tested.
 *
 * The URIs are cache-directory files written by `expo-image-manipulator`. iOS
 * may evict them, so a retry that cannot read its file drops that entry rather
 * than retrying forever — see `retryQueuedUploads` in the screen that owns it.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "tadaaaa.upload-queue.v1";

/**
 * Hard ceiling. Each entry pins a cache file the OS would otherwise reclaim,
 * and an unbounded queue of URIs to files that no longer exist is worse than
 * dropping the oldest.
 */
export const MAX_QUEUED_UPLOADS = 24;

export interface QueuedUpload {
  readonly inviteId: string;
  /** Position in the surprise's photo strip — also the dedupe key. */
  readonly index: number;
  readonly uri: string;
  readonly ext: string;
  readonly mimeType: string;
  readonly caption: string;
  readonly rotationDeg: number;
}

export interface QueueSummary {
  readonly title: string;
  readonly detail: string;
}

/** The card's two lines, verbatim from frame F3. Null when nothing is queued. */
export function queueSummary(entries: readonly QueuedUpload[]): QueueSummary | null {
  if (entries.length === 0) return null;
  return {
    title: `${entries.length} photo${entries.length === 1 ? "" : "s"} didn't upload`,
    detail: "They're queued. We'll retry on wifi.",
  };
}

const keyOf = (e: QueuedUpload) => `${e.inviteId}:${e.index}`;

/** Later entries win on (inviteId, index); the oldest are dropped on overflow. */
export function mergeQueue(
  existing: readonly QueuedUpload[],
  incoming: readonly QueuedUpload[]
): QueuedUpload[] {
  const byKey = new Map<string, QueuedUpload>();
  for (const entry of existing) byKey.set(keyOf(entry), entry);
  for (const entry of incoming) {
    // Delete first so a replaced entry moves to the END of the insertion
    // order: it is the newest, and overflow drops from the front.
    byKey.delete(keyOf(entry));
    byKey.set(keyOf(entry), entry);
  }
  return [...byKey.values()].slice(-MAX_QUEUED_UPLOADS);
}

export function entriesForInvite(
  queue: readonly QueuedUpload[],
  inviteId: string
): QueuedUpload[] {
  return queue.filter((e) => e.inviteId === inviteId);
}

export function withoutInvite(
  queue: readonly QueuedUpload[],
  inviteId: string
): QueuedUpload[] {
  return queue.filter((e) => e.inviteId !== inviteId);
}

/* ------------------------------------------------------------- storage */

function parse(raw: string | null): QueuedUpload[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is QueuedUpload =>
        !!e &&
        typeof e === "object" &&
        typeof (e as QueuedUpload).inviteId === "string" &&
        typeof (e as QueuedUpload).uri === "string" &&
        typeof (e as QueuedUpload).index === "number"
    );
  } catch {
    // A corrupt queue must not brick the detail screen.
    return [];
  }
}

export async function readUploadQueue(): Promise<QueuedUpload[]> {
  return parse(await AsyncStorage.getItem(KEY));
}

export async function enqueueUploads(entries: readonly QueuedUpload[]): Promise<void> {
  if (entries.length === 0) return;
  const merged = mergeQueue(await readUploadQueue(), entries);
  await AsyncStorage.setItem(KEY, JSON.stringify(merged));
}

export async function clearUploadsForInvite(inviteId: string): Promise<void> {
  const remaining = withoutInvite(await readUploadQueue(), inviteId);
  if (remaining.length === 0) {
    await AsyncStorage.removeItem(KEY);
    return;
  }
  await AsyncStorage.setItem(KEY, JSON.stringify(remaining));
}
