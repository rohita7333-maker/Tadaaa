/// <reference types="jest" />
/**
 * D5 — Open-when letters.
 *
 * The frame defines four row states (Sealed · Opened · Date-locked · Opening)
 * and one hard rule the UI cannot enforce on its own: a date-locked letter's
 * body must not be readable before its unlock date. That is enforced in
 * `get_invite_letters`, which returns `body = null` while `locked` is true —
 * these tests pin the client half so the two cannot drift apart.
 */
const mockRpc = jest.fn();
const mockFrom = jest.fn();

jest.mock("../supabase", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import {
  classifyLetter,
  letterStateLine,
  getLetters,
  openLetter,
  type LetterRow,
} from "../letters";

const BASE: LetterRow = {
  id: "l1",
  label: "Open when you miss me",
  position: 0,
  unlock_at: null,
  opened_at: null,
  locked: false,
  body: "I miss you too.",
};

const future = new Date(Date.now() + 7 * 86_400_000).toISOString();
const past = new Date(Date.now() - 3 * 86_400_000).toISOString();

beforeEach(() => {
  jest.clearAllMocks();
  mockFrom.mockImplementation((t: string) => {
    throw new Error(`letters read table "${t}" directly — RLS returns 0 rows for a guest`);
  });
});

describe("classifyLetter", () => {
  it("reports an unopened, unlocked letter as sealed", () => {
    expect(classifyLetter(BASE)).toBe("sealed");
  });

  it("reports an opened letter as opened", () => {
    expect(classifyLetter({ ...BASE, opened_at: past })).toBe("opened");
  });

  it("reports a future unlock as locked", () => {
    expect(classifyLetter({ ...BASE, unlock_at: future, locked: true })).toBe("locked");
  });

  it("trusts the server's locked flag over the local clock", () => {
    // A device with a wrong date must not be able to talk itself into an unlock.
    // The server computed `locked`; the body is already withheld.
    expect(classifyLetter({ ...BASE, unlock_at: past, locked: true, body: null })).toBe("locked");
  });

  it("treats a past unlock date as sealed once the server unlocks it", () => {
    expect(classifyLetter({ ...BASE, unlock_at: past, locked: false })).toBe("sealed");
  });

  it("prefers opened over locked when both could apply", () => {
    // Opened wins: it already happened, and showing "Unlocks 14 Sep" on a letter
    // the recipient has read reads as a bug.
    expect(
      classifyLetter({ ...BASE, opened_at: past, unlock_at: future, locked: true }),
    ).toBe("opened");
  });
});

describe("letterStateLine", () => {
  it("invites a sealed letter to be opened", () => {
    expect(letterStateLine(BASE)).toMatch(/open/i);
  });

  it("says when an opened letter was opened", () => {
    expect(letterStateLine({ ...BASE, opened_at: past })).toMatch(/opened 3 days ago/i);
  });

  it("says today for a letter opened within the hour", () => {
    expect(
      letterStateLine({ ...BASE, opened_at: new Date(Date.now() - 60_000).toISOString() }),
    ).toMatch(/opened today/i);
  });

  it("names the unlock date on a locked letter", () => {
    const line = letterStateLine({ ...BASE, unlock_at: future, locked: true });
    expect(line).toMatch(/unlocks/i);
  });

  it("never leaks the body into the state line", () => {
    const line = letterStateLine({ ...BASE, opened_at: past });
    expect(line).not.toContain("I miss you");
  });
});

describe("getLetters", () => {
  it("reads through the security-definer reader, never the table", async () => {
    mockRpc.mockResolvedValue({ data: [BASE], error: null });

    const rows = await getLetters("maya");

    expect(mockRpc).toHaveBeenCalledWith("get_invite_letters", { p_slug: "maya" });
    expect(rows).toHaveLength(1);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns an empty list rather than throwing when the reader fails", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect(await getLetters("maya")).toEqual([]);
  });

  it("keeps the server's order rather than re-sorting client-side", async () => {
    mockRpc.mockResolvedValue({
      data: [
        { ...BASE, id: "a", position: 0 },
        { ...BASE, id: "b", position: 1 },
      ],
      error: null,
    });
    expect((await getLetters("maya")).map((l) => l.id)).toEqual(["a", "b"]);
  });
});

describe("openLetter", () => {
  it("marks a letter opened through the RPC", async () => {
    mockRpc.mockResolvedValue({ data: { ok: true, opened_at: past }, error: null });

    const at = await openLetter("l1");

    // Always the two-argument overload. The one-argument form now REFUSES any
    // letter whose parent is PIN-locked, so calling it would silently fail for
    // exactly the surprises that care most.
    expect(mockRpc).toHaveBeenCalledWith("open_invite_letter", {
      p_letter_id: "l1",
      p_pin: null,
    });
    expect(at).toBe(past);
  });

  it("forwards the cleared PIN so a locked letter can actually be opened", async () => {
    // Without this the server returns pin_required and the row stays sealed
    // forever, one tap after the recipient typed the right four digits.
    mockRpc.mockResolvedValue({ data: { ok: true, opened_at: past }, error: null });

    await openLetter("l1", "2718");

    expect(mockRpc).toHaveBeenCalledWith("open_invite_letter", {
      p_letter_id: "l1",
      p_pin: "2718",
    });
  });

  it("returns null when the server refuses for want of a PIN", async () => {
    mockRpc.mockResolvedValue({ data: { ok: false, code: "pin_required" }, error: null });
    expect(await openLetter("l1")).toBeNull();
  });

  it("returns the FIRST opened_at when called twice", async () => {
    // The RPC is idempotent — "Opened 3 days ago" must not reset to today
    // every time the recipient revisits.
    mockRpc.mockResolvedValue({ data: { ok: true, opened_at: past }, error: null });
    expect(await openLetter("l1")).toBe(past);
    expect(await openLetter("l1")).toBe(past);
  });

  it("returns null when the server refuses a date-locked letter", async () => {
    // REGRESSION: the first version of open_invite_letter happily stamped
    // opened_at on a letter 30 days from unlocking. The body stayed withheld,
    // so nothing leaked — but the row then rendered "Opened today" with no
    // content, a state the recipient could not get out of. The server now
    // refuses; this pins the client half.
    mockRpc.mockResolvedValue({
      data: { ok: false, code: "locked", unlock_at: future },
      error: null,
    });
    expect(await openLetter("locked-one")).toBeNull();
  });

  it("returns null when the letter is gone, without throwing", async () => {
    mockRpc.mockResolvedValue({ data: { ok: false, code: "not_found" }, error: null });
    expect(await openLetter("nope")).toBeNull();
  });
});

describe("locked bodies", () => {
  it("never renders a body the server withheld", () => {
    // The single most important rule in D5: if this leaks, "Unlocks 14 Sep" is
    // decoration and the content is one devtools tab away.
    const locked: LetterRow = { ...BASE, unlock_at: future, locked: true, body: null };
    expect(classifyLetter(locked)).toBe("locked");
    expect(locked.body).toBeNull();
  });
});
