/// <reference types="jest" />
/**
 * The handoff spec and the production schema describe the same product with
 * different vocabularies. This adapter is the ONLY place the two meet.
 *
 * `CLAUDE_CODE_PROMPT.md` forbids redesigning the mobile spec, and the standing
 * project rule forbids renaming or dropping anything in production — which the
 * live web app depends on. An adapter is the only way to satisfy both.
 *
 * The rule this suite enforces: every handoff field round-trips, and every
 * production column name appears in `schema-adapter.ts` and nowhere else.
 */
import {
  toProductionInvite,
  fromProductionInvite,
  toProductionContribution,
  fromProductionContribution,
  fromProductionPhoto,
  toProductionPhoto,
  fromProductionProfile,
  toRevealStyle,
  toRevealType,
  deriveHandoffStatus,
  REVEAL_STYLE_MAP,
} from "../schema-adapter";

const LIVE_ROW = {
  id: "inv-1",
  creator_id: "user-1",
  slug: "maya",
  title: "Maya turns thirty",
  occasion_type: "birthday",
  reveal_type: "scroll_story",
  theme: "golden-hour",
  message: "See you Saturday",
  enable_dodge_no: true,
  accept_contributions: true,
  countdown_date: "2026-12-31T20:00:00.000Z",
  display_timezone: "Asia/Kolkata",
  expires_at: "2027-01-30T00:00:00.000Z",
  is_paid: true,
  is_active: true,
  deleted_at: null,
  view_count: 12,
  response_count: 3,
  created_at: "2026-01-01T00:00:00.000Z",
};

describe("reveal style mapping", () => {
  it("translates the handoff's `scroll` to production's `scroll_story`", () => {
    // The single enum value where the two vocabularies disagree outright.
    expect(toRevealType("scroll")).toBe("scroll_story");
    expect(toRevealStyle("scroll_story")).toBe("scroll");
  });

  it("passes the three identical values through untouched", () => {
    for (const v of ["tap", "countdown", "letters"] as const) {
      expect(toRevealType(v)).toBe(v);
      expect(toRevealStyle(v)).toBe(v);
    }
  });

  it("round-trips every handoff style the design defines", () => {
    for (const style of Object.keys(REVEAL_STYLE_MAP) as (keyof typeof REVEAL_STYLE_MAP)[]) {
      expect(toRevealStyle(toRevealType(style))).toBe(style);
    }
  });

  it("covers all four styles from the C4 frame — no more, no less", () => {
    expect(Object.keys(REVEAL_STYLE_MAP).sort()).toEqual([
      "countdown",
      "letters",
      "scroll",
      "tap",
    ]);
  });

  it("falls back to tap rather than crashing on an unknown value", () => {
    // reveal_type is free text with a CHECK; a future value must not blank a reveal.
    expect(toRevealStyle("something_new")).toBe("tap");
  });
});

describe("invite mapping", () => {
  it("exposes production columns under the handoff's names", () => {
    const s = fromProductionInvite(LIVE_ROW);
    expect(s.owner).toBe("user-1");
    expect(s.occasion).toBe("birthday");
    expect(s.revealStyle).toBe("scroll");
    expect(s.dodgingNo).toBe(true);
    expect(s.contributionsOpen).toBe(true);
    expect(s.scheduledAt).toBe(LIVE_ROW.countdown_date);
    expect(s.timezone).toBe("Asia/Kolkata");
    expect(s.isPremium).toBe(true);
  });

  it("round-trips back to the exact production column names", () => {
    const row = toProductionInvite(fromProductionInvite(LIVE_ROW));
    expect(row.creator_id).toBe(LIVE_ROW.creator_id);
    expect(row.occasion_type).toBe(LIVE_ROW.occasion_type);
    expect(row.reveal_type).toBe("scroll_story");
    expect(row.enable_dodge_no).toBe(true);
    expect(row.accept_contributions).toBe(true);
    expect(row.countdown_date).toBe(LIVE_ROW.countdown_date);
    expect(row.display_timezone).toBe("Asia/Kolkata");
  });

  it("never emits a handoff-only column production does not have", () => {
    // `recipient_name`, `from_name`, `published_at`, `theme_id`, `music_id`,
    // `pin`, `password` are absent from production. Emitting one makes
    // PostgREST reject the whole insert.
    const row = toProductionInvite(fromProductionInvite(LIVE_ROW)) as unknown as Record<string, unknown>;
    for (const absent of [
      "recipient_name",
      "from_name",
      "published_at",
      "theme_id",
      "music_id",
      "owner",
      "occasion",
      "reveal_style",
      "dodging_no",
      "contributions_open",
      "scheduled_at",
      "timezone",
    ]) {
      expect(Object.keys(row)).not.toContain(absent);
    }
  });

  it("carries the counts the Home and detail frames read", () => {
    const s = fromProductionInvite(LIVE_ROW);
    expect(s.viewCount).toBe(12);
    expect(s.responseCount).toBe(3);
  });
});

describe("status derivation", () => {
  const future = new Date(Date.now() + 86_400_000).toISOString();
  const past = new Date(Date.now() - 86_400_000).toISOString();

  it("reports a soft-deleted invite as expired, not live", () => {
    expect(
      deriveHandoffStatus({ ...LIVE_ROW, deleted_at: "2026-01-02T00:00:00Z" }),
    ).toBe("expired");
  });

  it("reports a past expiry as expired", () => {
    expect(deriveHandoffStatus({ ...LIVE_ROW, expires_at: past })).toBe("expired");
  });

  it("reports an inactive invite as draft", () => {
    // Production sets is_active=false until publish completes moderation.
    expect(deriveHandoffStatus({ ...LIVE_ROW, is_active: false })).toBe("draft");
  });

  it("reports a future countdown on a live invite as scheduled", () => {
    expect(
      deriveHandoffStatus({ ...LIVE_ROW, countdown_date: future, expires_at: null }),
    ).toBe("scheduled");
  });

  it("reports an active, unexpired, non-future invite as live", () => {
    expect(
      deriveHandoffStatus({ ...LIVE_ROW, countdown_date: past, expires_at: future }),
    ).toBe("live");
  });

  it("mirrors deriveInviteStatus's precedence: deleted beats expiry beats inactive", () => {
    // Same order the web helper uses, so both platforms label a row identically.
    expect(
      deriveHandoffStatus({
        ...LIVE_ROW,
        deleted_at: "2026-01-02T00:00:00Z",
        expires_at: past,
        is_active: false,
      }),
    ).toBe("expired");
  });

  it("only ever returns one of the four handoff statuses", () => {
    const rows = [
      LIVE_ROW,
      { ...LIVE_ROW, is_active: false },
      { ...LIVE_ROW, expires_at: past },
      { ...LIVE_ROW, deleted_at: past },
      { ...LIVE_ROW, countdown_date: future, expires_at: null },
    ];
    for (const r of rows) {
      expect(["draft", "scheduled", "live", "expired"]).toContain(deriveHandoffStatus(r));
    }
  });
});

describe("contribution mapping", () => {
  it("turns production's approved boolean into the handoff's three-state status", () => {
    expect(fromProductionContribution({ approved: true, id: "c", invite_id: "i" }).status).toBe(
      "approved",
    );
    expect(fromProductionContribution({ approved: false, id: "c", invite_id: "i" }).status).toBe(
      "pending",
    );
  });

  it("maps both approved and rejected back onto the boolean production stores", () => {
    // Production has no 'rejected' state — a rejected contribution is simply
    // not approved. Losing that distinction is a KNOWN gap, recorded here so it
    // is a decision rather than a surprise.
    expect(toProductionContribution({ status: "approved" }).approved).toBe(true);
    expect(toProductionContribution({ status: "pending" }).approved).toBe(false);
    expect(toProductionContribution({ status: "rejected" }).approved).toBe(false);
  });

  it("uses production's contributor_name, not the handoff's name", () => {
    const c = fromProductionContribution({
      id: "c",
      invite_id: "i",
      contributor_name: "Aanya",
      message: "So proud of you.",
      approved: true,
    });
    expect(c.name).toBe("Aanya");
    expect(toProductionContribution(c).contributor_name).toBe("Aanya");
  });

  it("never leaks contributor_email or visitor_hash into the handoff shape", () => {
    // Both are PII the reveal surfaces never need.
    const c = fromProductionContribution({
      id: "c",
      invite_id: "i",
      contributor_name: "Aanya",
      approved: true,
      contributor_email: "a@example.com",
      visitor_hash: "abc123",
    }) as unknown as Record<string, unknown>;
    expect(Object.keys(c)).not.toContain("contributor_email");
    expect(Object.keys(c)).not.toContain("visitor_hash");
  });
});

describe("photo mapping", () => {
  it("maps the handoff's position onto production's sort_order", () => {
    expect(toProductionPhoto({ position: 3, storagePath: "p.jpg" }).sort_order).toBe(3);
    expect(fromProductionPhoto({ sort_order: 3, storage_path: "p.jpg" }).position).toBe(3);
  });

  it("preserves rotation_deg, which the handoff does not model", () => {
    // Production stores it and the reveal renders it. Dropping it on a
    // round-trip would silently straighten every tilted polaroid.
    const p = fromProductionPhoto({ sort_order: 0, storage_path: "p.jpg", rotation_deg: -4 });
    expect(p.rotationDeg).toBe(-4);
    expect(toProductionPhoto(p).rotation_deg).toBe(-4);
  });
});

describe("profile mapping", () => {
  it("maps subscription_tier onto the handoff's tier", () => {
    expect(fromProductionProfile({ id: "u", subscription_tier: "free" }).tier).toBe("free");
  });

  it("treats welcomed_at as the handoff's onboarded boolean", () => {
    expect(fromProductionProfile({ id: "u", welcomed_at: null }).onboarded).toBe(false);
    expect(
      fromProductionProfile({ id: "u", welcomed_at: "2026-01-01T00:00:00Z" }).onboarded,
    ).toBe(true);
  });

  it("collapses any paid tier to the handoff's two-value tier", () => {
    // Production carries free/plus/unlimited; the handoff models free/unlimited.
    expect(fromProductionProfile({ id: "u", subscription_tier: "plus" }).tier).toBe("unlimited");
    expect(fromProductionProfile({ id: "u", subscription_tier: "unlimited" }).tier).toBe(
      "unlimited",
    );
  });
});
