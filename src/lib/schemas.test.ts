import { describe, expect, it } from "vitest";
import {
  signInSchema,
  signUpSchema,
  magicLinkSchema,
  createInviteSchema,
  inviteQuestionsSchema,
} from "./schemas";

describe("signUpSchema", () => {
  it("accepts a valid signup", () => {
    expect(
      signUpSchema.safeParse({
        fullName: "Alice",
        email: "a@b.co",
        password: "longenoughpw",
      }).success
    ).toBe(true);
  });

  it("rejects short password", () => {
    expect(
      signUpSchema.safeParse({
        fullName: "Alice",
        email: "a@b.co",
        password: "short",
      }).success
    ).toBe(false);
  });

  it("rejects bad email", () => {
    expect(
      signUpSchema.safeParse({
        fullName: "Alice",
        email: "not-an-email",
        password: "longenoughpw",
      }).success
    ).toBe(false);
  });
});

describe("signInSchema", () => {
  it("requires email + password", () => {
    expect(signInSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
});

describe("magicLinkSchema", () => {
  it("rejects bad email", () => {
    expect(magicLinkSchema.safeParse({ email: "x" }).success).toBe(false);
  });
});

describe("createInviteSchema", () => {
  it("accepts a minimal valid invite", () => {
    expect(
      createInviteSchema.safeParse({
        title: "Hi",
        theme: "warm-embrace",
        message: "Hello there friend",
        revealType: "tap",
        countdownDate: null,
        expiresAt: null,
      }).success
    ).toBe(true);
  });

  it("rejects unknown revealType", () => {
    expect(
      createInviteSchema.safeParse({
        title: "Hi",
        theme: "warm-embrace",
        message: "Hello there friend",
        revealType: "telepathy",
        countdownDate: null,
        expiresAt: null,
      }).success
    ).toBe(false);
  });

  it("rejects non-ISO date strings", () => {
    expect(
      createInviteSchema.safeParse({
        title: "Hi",
        theme: "warm-embrace",
        message: "Hello there friend",
        revealType: "countdown",
        countdownDate: "tomorrow",
        expiresAt: null,
      }).success
    ).toBe(false);
  });

  it("rejects message under 10 chars", () => {
    expect(
      createInviteSchema.safeParse({
        title: "Hi",
        theme: "warm-embrace",
        message: "short",
        revealType: "tap",
        countdownDate: null,
        expiresAt: null,
      }).success
    ).toBe(false);
  });
});

describe("inviteQuestionsSchema", () => {
  it("accepts up to 10 questions", () => {
    const arr = Array.from({ length: 10 }, () => ({
      text: "ok?",
      requireAnswer: true,
      yesLabel: "y",
      noLabel: "n",
      enableDodge: false,
    }));
    expect(inviteQuestionsSchema.safeParse(arr).success).toBe(true);
  });

  it("rejects 11+ questions", () => {
    const arr = Array.from({ length: 11 }, () => ({
      text: "ok?",
      requireAnswer: true,
      yesLabel: "y",
      noLabel: "n",
      enableDodge: false,
    }));
    expect(inviteQuestionsSchema.safeParse(arr).success).toBe(false);
  });
});
