import {
  deriveInviteStatus,
  INVITE_STATUS_LABELS,
  type InviteStatusInput,
} from "../invite-status";

const NOW = Date.parse("2026-08-09T12:00:00.000Z");
const PAST = "2026-08-01T12:00:00.000Z";
const FUTURE = "2026-09-01T12:00:00.000Z";

/** A plain live invite; each test overrides only the field under scrutiny. */
function invite(over: Partial<InviteStatusInput> = {}): InviteStatusInput {
  return {
    deleted_at: null,
    expires_at: null,
    is_active: true,
    countdown_date: null,
    ...over,
  };
}

describe("deriveInviteStatus", () => {
  it("returns live for an active invite with no dates", () => {
    expect(deriveInviteStatus(invite(), NOW)).toBe("live");
  });

  it("returns live when the countdown date has already passed", () => {
    expect(deriveInviteStatus(invite({ countdown_date: PAST }), NOW)).toBe("live");
  });

  it("returns scheduled when the countdown date is still in the future", () => {
    expect(deriveInviteStatus(invite({ countdown_date: FUTURE }), NOW)).toBe("scheduled");
  });

  it("returns expired when expires_at is in the past", () => {
    expect(deriveInviteStatus(invite({ expires_at: PAST }), NOW)).toBe("expired");
  });

  it("returns live when expires_at is still in the future", () => {
    expect(deriveInviteStatus(invite({ expires_at: FUTURE }), NOW)).toBe("live");
  });

  it("returns archived when is_active is false", () => {
    expect(deriveInviteStatus(invite({ is_active: false }), NOW)).toBe("archived");
  });

  it("returns archived when is_active is null", () => {
    expect(deriveInviteStatus(invite({ is_active: null }), NOW)).toBe("archived");
  });

  it("returns archived when is_active is absent", () => {
    expect(deriveInviteStatus({ }, NOW)).toBe("archived");
  });

  it("returns archived when deleted_at is set", () => {
    expect(deriveInviteStatus(invite({ deleted_at: PAST }), NOW)).toBe("archived");
  });

  // ---- precedence: earlier rules must beat later ones -----------------------

  it("prefers archived over expired when the invite is soft-deleted", () => {
    expect(
      deriveInviteStatus(invite({ deleted_at: PAST, expires_at: PAST }), NOW)
    ).toBe("archived");
  });

  it("prefers archived over scheduled when the invite is soft-deleted", () => {
    expect(
      deriveInviteStatus(invite({ deleted_at: PAST, countdown_date: FUTURE }), NOW)
    ).toBe("archived");
  });

  it("prefers expired over archived when expired and inactive", () => {
    expect(
      deriveInviteStatus(invite({ expires_at: PAST, is_active: false }), NOW)
    ).toBe("expired");
  });

  it("prefers expired over scheduled when expired and counting down", () => {
    expect(
      deriveInviteStatus(invite({ expires_at: PAST, countdown_date: FUTURE }), NOW)
    ).toBe("expired");
  });

  it("prefers archived over scheduled when inactive and counting down", () => {
    expect(
      deriveInviteStatus(invite({ is_active: false, countdown_date: FUTURE }), NOW)
    ).toBe("archived");
  });

  // ---- boundaries and bad input --------------------------------------------

  it("treats an expiry exactly at now as not yet expired", () => {
    expect(
      deriveInviteStatus(invite({ expires_at: new Date(NOW).toISOString() }), NOW)
    ).toBe("live");
  });

  it("treats a countdown exactly at now as no longer scheduled", () => {
    expect(
      deriveInviteStatus(invite({ countdown_date: new Date(NOW).toISOString() }), NOW)
    ).toBe("live");
  });

  it("ignores unparseable timestamps rather than throwing", () => {
    expect(
      deriveInviteStatus(invite({ expires_at: "not-a-date", countdown_date: "nope" }), NOW)
    ).toBe("live");
  });

  it("defaults now to the current clock when omitted", () => {
    expect(deriveInviteStatus(invite({ expires_at: "1999-01-01T00:00:00.000Z" }))).toBe(
      "expired"
    );
  });
});

describe("INVITE_STATUS_LABELS", () => {
  it("labels every status the deriver can return", () => {
    expect(INVITE_STATUS_LABELS).toEqual({
      live: "Live",
      scheduled: "Scheduled",
      expired: "Expired",
      archived: "Archived",
    });
  });
});
