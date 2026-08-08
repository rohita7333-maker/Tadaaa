/// <reference types="jest" />
import { eventsSchema, type StoryEventInput } from "../schemas";

const validEvent: StoryEventInput = {
  label: "When",
  title: "Saturday, October 24 · 5:30 PM",
  detail: "golden hour, sharp",
  mapsQuery: "Sunset Terrace, Jubilee Hills, Hyderabad",
};

describe("eventsSchema", () => {
  it("accepts an empty array (no plan → single countdown plaque)", () => {
    const result = eventsSchema.safeParse([]);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual([]);
  });

  it("accepts up to 4 valid plaques", () => {
    const four = [validEvent, validEvent, validEvent, validEvent];
    const result = eventsSchema.safeParse(four);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toHaveLength(4);
  });

  it("accepts a plaque with only the required label + title (optionals omitted)", () => {
    const result = eventsSchema.safeParse([{ label: "When", title: "Tonight" }]);
    expect(result.success).toBe(true);
  });

  it("rejects more than 4 plaques", () => {
    const five = [validEvent, validEvent, validEvent, validEvent, validEvent];
    const result = eventsSchema.safeParse(five);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("At most 4 events per scroll story");
    }
  });

  it("rejects an empty label", () => {
    const result = eventsSchema.safeParse([{ label: "", title: "Tonight" }]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("label");
    }
  });

  it("rejects an empty title", () => {
    const result = eventsSchema.safeParse([{ label: "When", title: "" }]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("title");
    }
  });

  it("rejects an oversize label (> 30 chars)", () => {
    const result = eventsSchema.safeParse([{ label: "x".repeat(31), title: "Tonight" }]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("label");
    }
  });

  it("rejects an oversize title (> 80 chars)", () => {
    const result = eventsSchema.safeParse([{ label: "When", title: "x".repeat(81) }]);
    expect(result.success).toBe(false);
  });

  it("rejects an oversize detail (> 120 chars)", () => {
    const result = eventsSchema.safeParse([
      { label: "When", title: "Tonight", detail: "x".repeat(121) },
    ]);
    expect(result.success).toBe(false);
  });

  it("rejects an oversize mapsQuery (> 120 chars)", () => {
    const result = eventsSchema.safeParse([
      { label: "When", title: "Tonight", mapsQuery: "x".repeat(121) },
    ]);
    expect(result.success).toBe(false);
  });

  it("preserves camelCase mapsQuery in parsed output (DB write shape)", () => {
    const result = eventsSchema.safeParse([validEvent]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0]).toHaveProperty("mapsQuery");
      expect(result.data[0].mapsQuery).toBe(validEvent.mapsQuery);
    }
  });
});
