import { PIN_GATE_COPY, parseRevealBundle } from "../reveal-bundle";

const invite = {
  id: "i1",
  slug: "maya-30",
  title: "Maya turns thirty",
  message: "Thirty looks good on you.",
  theme: "warm-embrace",
  occasion_type: "birthday",
  reveal_type: "letters",
  countdown_date: null,
  expires_at: null,
  events: [],
  enable_dodge_no: true,
  accept_contributions: true,
  is_paid: false,
  view_count: 3,
  response_count: 0,
  created_at: "2026-08-01T00:00:00.000Z",
};

describe("parseRevealBundle", () => {
  it("unwraps a successful bundle into the shape the reveal screen already uses", () => {
    const out = parseRevealBundle({
      ok: true,
      invite,
      questions: [{ id: "q1", question_text: "Save me a seat?" }],
      photos: [{ id: "p1", storage_path: "a.jpg" }],
      contributions: [{ id: "c1", contributor_name: "Aanya" }],
      letters: [{ id: "l1", label: "Open when sad", locked: false, body: "hi" }],
    });

    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.data.invite.title).toBe("Maya turns thirty");
    expect(out.data.questions).toHaveLength(1);
    expect(out.data.photos).toHaveLength(1);
    expect(out.data.contributions).toHaveLength(1);
    expect(out.letters).toHaveLength(1);
  });

  it("defaults every collection to an empty array — a null must not crash a map()", () => {
    const out = parseRevealBundle({ ok: true, invite });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.data.questions).toEqual([]);
    expect(out.data.photos).toEqual([]);
    expect(out.data.contributions).toEqual([]);
    expect(out.letters).toEqual([]);
  });

  it("reports a wrong or missing PIN as pin_required, not as a missing surprise", () => {
    // The two are different screens: one asks for four digits, the other says
    // the link is dead. Conflating them tells a recipient with a typo that
    // their surprise no longer exists.
    expect(parseRevealBundle({ ok: false, code: "pin_required" })).toEqual({
      ok: false,
      code: "pin_required",
    });
  });

  it("passes rate_limited and unavailable through distinctly", () => {
    expect(parseRevealBundle({ ok: false, code: "rate_limited" })).toEqual({
      ok: false,
      code: "rate_limited",
    });
    expect(parseRevealBundle({ ok: false, code: "unavailable" })).toEqual({
      ok: false,
      code: "unavailable",
    });
  });

  it("treats a null or malformed response as unavailable rather than throwing", () => {
    expect(parseRevealBundle(null)).toEqual({ ok: false, code: "unavailable" });
    expect(parseRevealBundle(undefined)).toEqual({ ok: false, code: "unavailable" });
    expect(parseRevealBundle({})).toEqual({ ok: false, code: "unavailable" });
    expect(parseRevealBundle("nonsense")).toEqual({ ok: false, code: "unavailable" });
  });

  it("treats ok:true with no invite as unavailable — a bundle with no surprise is not a success", () => {
    expect(parseRevealBundle({ ok: true })).toEqual({ ok: false, code: "unavailable" });
  });

  it("maps an unrecognised server code to unavailable rather than showing it raw", () => {
    expect(parseRevealBundle({ ok: false, code: "teapot" })).toEqual({
      ok: false,
      code: "unavailable",
    });
  });
});

describe("PIN_GATE_COPY", () => {
  it("has a line for every failure code the gate can receive", () => {
    for (const code of ["pin_required", "rate_limited", "unavailable"] as const) {
      expect(typeof PIN_GATE_COPY[code]).toBe("string");
      expect(PIN_GATE_COPY[code].length).toBeGreaterThan(0);
    }
  });

  it("never names the PIN's length or value in the failure copy", () => {
    const all = Object.values(PIN_GATE_COPY).join(" ");
    expect(/\d{4}/.test(all)).toBe(false);
  });
});
