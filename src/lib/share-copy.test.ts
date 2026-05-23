import { describe, it, expect } from "vitest";
import { getShareCopy } from "./share-copy";

const url = "https://tadaaaa.app/surprise/abc123";
const title = "Mum's 60th Birthday";
const creatorName = "Rohit";

describe("getShareCopy", () => {
  describe("control variant", () => {
    it("returns expected string with all fields", () => {
      expect(getShareCopy("control", { title, url, creatorName })).toBe(
        `💌 ${title} — Someone made something special for you! ${url}`
      );
    });

    it("ignores creatorName (control is always anonymous)", () => {
      expect(getShareCopy("control", { title, url })).toBe(
        `💌 ${title} — Someone made something special for you! ${url}`
      );
    });

    it("falls back to control when variant is undefined", () => {
      expect(getShareCopy(undefined, { title, url })).toBe(
        `💌 ${title} — Someone made something special for you! ${url}`
      );
    });
  });

  describe("personal variant", () => {
    it("uses creatorName when provided", () => {
      expect(getShareCopy("personal", { title, url, creatorName })).toBe(
        `${creatorName} made something special for you 💌 ${title} ${url}`
      );
    });

    it('falls back to "Someone" when creatorName is undefined', () => {
      expect(getShareCopy("personal", { title, url })).toBe(
        `Someone made something special for you 💌 ${title} ${url}`
      );
    });

    it('falls back to "Someone" when creatorName is empty string', () => {
      expect(getShareCopy("personal", { title, url, creatorName: "" })).toBe(
        `Someone made something special for you 💌 ${title} ${url}`
      );
    });
  });

  describe("intrigue variant", () => {
    it("uses creatorName when provided", () => {
      expect(getShareCopy("intrigue", { title, url, creatorName })).toBe(
        `You've got a surprise from ${creatorName} 🎁 ${url}`
      );
    });

    it('falls back to "someone" when creatorName is undefined', () => {
      expect(getShareCopy("intrigue", { title, url })).toBe(
        `You've got a surprise from someone 🎁 ${url}`
      );
    });
  });

  describe("special characters preserved", () => {
    it("preserves special chars in title — no double encoding", () => {
      const specialTitle = "Sarah & Tom's 25th! <Party>";
      const result = getShareCopy("control", { title: specialTitle, url });
      expect(result).toContain(specialTitle);
      expect(result).not.toContain("&amp;");
      expect(result).not.toContain("%26");
    });

    it("preserves unicode emoji in title", () => {
      const emojiTitle = "🎂 Happy Birthday 🎉";
      const result = getShareCopy("personal", { title: emojiTitle, url, creatorName });
      expect(result).toContain(emojiTitle);
    });
  });
});
