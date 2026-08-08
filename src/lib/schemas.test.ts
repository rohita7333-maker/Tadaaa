import { describe, expect, it } from "vitest";
import {
  signInSchema,
  signUpSchema,
  magicLinkSchema,
  createInviteSchema,
  inviteQuestionsSchema,
  eventsSchema,
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

  it("rejects disposable email domains", () => {
    const result = signUpSchema.safeParse({
      fullName: "Alice",
      email: "alice@mailinator.com",
      password: "longenoughpw",
    });
    expect(result.success).toBe(false);
  });

  it("rejects disposable email domains case-insensitively", () => {
    const result = signUpSchema.safeParse({
      fullName: "Alice",
      email: "alice@MAILINATOR.COM",
      password: "longenoughpw",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a non-disposable domain that merely contains a disposable substring", () => {
    // guards against a naive .includes() check false-positiving on domains
    // like "notmailinator.com" or subdomains of legitimate providers
    expect(
      signUpSchema.safeParse({
        fullName: "Alice",
        email: "alice@notmailinator.com",
        password: "longenoughpw",
      }).success
    ).toBe(true);
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

describe("eventsSchema", () => {
  it("accepts a valid event array (label + title, optional detail + mapsQuery)", () => {
    expect(
      eventsSchema.safeParse([
        {
          label: "When",
          title: "Saturday, October 24",
          detail: "golden hour",
          mapsQuery: "Sunset Terrace, Hyderabad",
        },
        { label: "Where", title: "The rooftop" },
      ]).success
    ).toBe(true);
  });

  it("accepts an empty array", () => {
    expect(eventsSchema.safeParse([]).success).toBe(true);
  });

  it("rejects more than 4 events", () => {
    const arr = Array.from({ length: 5 }, (_, i) => ({
      label: "When",
      title: `Event ${i}`,
    }));
    expect(eventsSchema.safeParse(arr).success).toBe(false);
  });

  it("rejects an empty label", () => {
    expect(
      eventsSchema.safeParse([{ label: "", title: "The plan" }]).success
    ).toBe(false);
  });

  it("rejects an empty title", () => {
    expect(
      eventsSchema.safeParse([{ label: "When", title: "" }]).success
    ).toBe(false);
  });

  it("rejects an oversize label (>30 chars)", () => {
    expect(
      eventsSchema.safeParse([{ label: "x".repeat(31), title: "The plan" }])
        .success
    ).toBe(false);
  });

  it("rejects an oversize title (>80 chars)", () => {
    expect(
      eventsSchema.safeParse([{ label: "When", title: "x".repeat(81) }])
        .success
    ).toBe(false);
  });

  it("rejects an oversize detail (>120 chars)", () => {
    expect(
      eventsSchema.safeParse([
        { label: "When", title: "The plan", detail: "x".repeat(121) },
      ]).success
    ).toBe(false);
  });

  it("rejects an oversize mapsQuery (>120 chars)", () => {
    expect(
      eventsSchema.safeParse([
        { label: "When", title: "The plan", mapsQuery: "x".repeat(121) },
      ]).success
    ).toBe(false);
  });
});
