/// <reference types="jest" />
import { getShareCopy } from "../share-copy";
import { generateSlug } from "../slug";
import { signInSchema, signUpSchema, createInviteSchema } from "../schemas";

describe("getShareCopy", () => {
  const opts = { title: "Happy Birthday", url: "https://tadaaaa.app/surprise/abc", creatorName: "Sam" };
  it("control variant is branded + anonymous", () => {
    expect(getShareCopy("control", opts)).toContain("Someone made something special");
  });
  it("personal names the creator", () => {
    expect(getShareCopy("personal", opts)).toContain("Sam");
  });
  it("intrigue omits the title", () => {
    expect(getShareCopy("intrigue", opts)).not.toContain("Happy Birthday");
  });
  it("unknown variant falls back to control", () => {
    expect(getShareCopy("???", opts)).toEqual(getShareCopy("control", opts));
  });
});

describe("generateSlug", () => {
  it("is url-safe, correct length, and collision-resistant across a sample", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const s = generateSlug();
      expect(s).toMatch(/^[0-9a-z]{10}$/);
      seen.add(s);
    }
    expect(seen.size).toBe(500);
  });
});

describe("schemas match the web validation contract", () => {
  it("signInSchema rejects bad email + empty password", () => {
    expect(signInSchema.safeParse({ email: "x", password: "" }).success).toBe(false);
    expect(signInSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
  });
  it("signUpSchema enforces 8-char password + 2-char name", () => {
    expect(signUpSchema.safeParse({ fullName: "A", email: "a@b.co", password: "short" }).success).toBe(false);
    expect(signUpSchema.safeParse({ fullName: "Alex", email: "a@b.co", password: "longenough" }).success).toBe(true);
  });
  it("createInviteSchema requires a 10-char message + valid reveal type", () => {
    expect(
      createInviteSchema.safeParse({
        title: "Hi",
        theme: "warm-embrace",
        message: "too short",
        revealType: "tap",
      }).success
    ).toBe(false);
    expect(
      createInviteSchema.safeParse({
        title: "Hi",
        theme: "warm-embrace",
        message: "this is long enough",
        revealType: "tap",
      }).success
    ).toBe(true);
  });
});
