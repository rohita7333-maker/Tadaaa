import { describe, it, expect } from "vitest";
import { parseDraftOutput } from "./draft";

describe("parseDraftOutput", () => {
  it("rejects invalid JSON", () => {
    expect(() => parseDraftOutput("not json")).toThrow();
  });

  it("validates schema", () => {
    const v = parseDraftOutput(
      JSON.stringify({
        title: "Surprise!",
        message: "Hi there",
        themeId: "warm-embrace",
        questions: [{ text: "Coming?", yesLabel: "Yes", noLabel: "No" }],
      })
    );
    expect(v.title).toBe("Surprise!");
  });

  it("rejects unsafe", () => {
    expect(() =>
      parseDraftOutput(JSON.stringify({ error: "unsafe" }))
    ).toThrow(/refused/);
  });

  it("rejects missing required fields", () => {
    expect(() =>
      parseDraftOutput(JSON.stringify({ title: "Hi" }))
    ).toThrow();
  });

  it("rejects title over 60 chars", () => {
    expect(() =>
      parseDraftOutput(
        JSON.stringify({
          title: "A".repeat(61),
          message: "Hello",
          themeId: "warm-embrace",
          questions: [{ text: "Coming?", yesLabel: "Yes", noLabel: "No" }],
        })
      )
    ).toThrow();
  });
});
