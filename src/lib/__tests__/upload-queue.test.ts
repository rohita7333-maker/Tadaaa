import {
  MAX_QUEUED_UPLOADS,
  entriesForInvite,
  mergeQueue,
  queueSummary,
  withoutInvite,
  type QueuedUpload,
} from "../upload-queue";

const item = (inviteId: string, index: number): QueuedUpload => ({
  inviteId,
  index,
  uri: `file:///tmp/p${index}.jpg`,
  ext: "jpg",
  mimeType: "image/jpeg",
  caption: "",
  rotationDeg: 0,
});

describe("queueSummary", () => {
  it("uses the frame's wording, pluralised", () => {
    expect(queueSummary([item("a", 0)])).toEqual({
      title: "1 photo didn't upload",
      detail: "They're queued. We'll retry on wifi.",
    });
    expect(queueSummary([item("a", 0), item("a", 1)])?.title).toBe("2 photos didn't upload");
  });

  it("returns null for an empty queue — the card is conditional", () => {
    expect(queueSummary([])).toBeNull();
  });
});

describe("mergeQueue", () => {
  it("adds new entries and keeps the existing ones", () => {
    const merged = mergeQueue([item("a", 0)], [item("b", 0)]);
    expect(merged.map((e) => `${e.inviteId}:${e.index}`)).toEqual(["a:0", "b:0"]);
  });

  it("replaces an entry for the same invite and index rather than duplicating it", () => {
    // A second failed publish attempt on the same photo must not stack two
    // cards' worth of the same file.
    const retried = { ...item("a", 0), uri: "file:///tmp/newer.jpg" };
    const merged = mergeQueue([item("a", 0)], [retried]);
    expect(merged).toHaveLength(1);
    expect(merged[0].uri).toBe("file:///tmp/newer.jpg");
  });

  it("keeps the newest entries when the queue would overflow", () => {
    const existing = Array.from({ length: MAX_QUEUED_UPLOADS }, (_, i) => item("old", i));
    const merged = mergeQueue(existing, [item("new", 0)]);
    expect(merged).toHaveLength(MAX_QUEUED_UPLOADS);
    expect(merged.at(-1)).toEqual(item("new", 0));
    // The oldest is the one dropped — an unbounded queue is a slow leak of
    // file URIs pointing at cache files the OS has already deleted.
    expect(merged[0]).toEqual(item("old", 1));
  });
});

describe("entriesForInvite / withoutInvite", () => {
  const queue = [item("a", 0), item("b", 0), item("a", 1)];

  it("selects only the surprise being looked at", () => {
    expect(entriesForInvite(queue, "a").map((e) => e.index)).toEqual([0, 1]);
    expect(entriesForInvite(queue, "zzz")).toEqual([]);
  });

  it("clears one surprise without touching the others", () => {
    expect(withoutInvite(queue, "a")).toEqual([item("b", 0)]);
  });
});
