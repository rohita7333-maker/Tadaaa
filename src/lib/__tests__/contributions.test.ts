import {
  contributionErrorMessage,
  partitionByModeration,
  pendingLine,
  validateContribution,
} from "../contributions";
import type { OwnerContribution } from "../contributions";

const row = (
  id: string,
  name: string,
  status: "pending" | "approved" | "rejected"
): OwnerContribution => ({
  id,
  name,
  message: "m",
  photoUrl: null,
  status,
  createdAt: "2026-08-16T00:00:00.000Z",
});

describe("validateContribution", () => {
  it("requires a name — the only required field on E1", () => {
    expect(validateContribution({ name: "", message: "hi" })).toEqual({
      ok: false,
      field: "name",
      message: "Add your name first",
    });
    expect(validateContribution({ name: "   ", message: "hi" }).ok).toBe(false);
  });

  it("accepts a name with no message at all", () => {
    expect(validateContribution({ name: "Aanya", message: "" })).toEqual({ ok: true });
  });

  it("caps the message at 300 — the handoff's contribution limit", () => {
    expect(validateContribution({ name: "Aanya", message: "x".repeat(300) })).toEqual({ ok: true });
    expect(validateContribution({ name: "Aanya", message: "x".repeat(301) })).toEqual({
      ok: false,
      field: "message",
      message: "Keep it to 300 characters",
    });
  });

  it("counts the trimmed message, so trailing spaces cannot fail a valid note", () => {
    expect(validateContribution({ name: "Aanya", message: "x".repeat(300) + "   " }).ok).toBe(true);
  });
});

describe("contributionErrorMessage", () => {
  it("translates every code submit_contribution can return", () => {
    expect(contributionErrorMessage("name_required")).toBe("Add your name first");
    expect(contributionErrorMessage("message_too_long")).toBe("Keep it to 300 characters");
    expect(contributionErrorMessage("rate_limited")).toBe(
      "That's a lot of messages — try again in a bit."
    );
    expect(contributionErrorMessage("closed")).toBe(
      "This surprise isn't taking messages any more."
    );
    expect(contributionErrorMessage("already_submitted")).toBe(
      "You've already added a message to this one."
    );
  });

  it("has a fallback so an unmapped server code never renders raw", () => {
    // The RPC returns codes; a new one added server-side must not surface as
    // `already_submitted` or as the literal string.
    expect(contributionErrorMessage("teapot")).toBe("That didn't send. Try again.");
    expect(contributionErrorMessage(null)).toBe("That didn't send. Try again.");
  });
});

describe("partitionByModeration", () => {
  const rows = [
    row("1", "Aanya", "pending"),
    row("2", "Rahul", "approved"),
    row("3", "Dev", "rejected"),
    row("4", "Mira", "pending"),
  ];

  it("splits the three states", () => {
    const out = partitionByModeration(rows);
    expect(out.pending.map((r) => r.name)).toEqual(["Aanya", "Mira"]);
    expect(out.approved.map((r) => r.name)).toEqual(["Rahul"]);
    expect(out.rejected.map((r) => r.name)).toEqual(["Dev"]);
  });

  it("keeps rejected OUT of pending — the bug the moderation_status column exists to fix", () => {
    expect(partitionByModeration(rows).pending.map((r) => r.id)).not.toContain("3");
  });
});

describe("pendingLine", () => {
  it("reads as the C3 counter", () => {
    expect(pendingLine(2, 4)).toBe("2 pending · 4 approved");
  });

  it("singularises both halves", () => {
    expect(pendingLine(1, 1)).toBe("1 pending · 1 approved");
  });

  it("says nobody has written yet rather than 0 pending · 0 approved", () => {
    expect(pendingLine(0, 0)).toBe("No messages yet");
  });
});
