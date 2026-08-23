/// <reference types="jest" />
import {
  INITIAL_PIN_STATE,
  MAX_ATTEMPTS,
  COOLDOWN_MS,
  PIN_LENGTH,
  WEAK_PINS,
  isWeakPin,
  isCoolingDown,
  cooldownSecondsLeft,
  pressDigit,
  pressBackspace,
  isComplete,
  registerWrong,
  reset,
  pinMessage,
} from "../pin-gate";

const T0 = 1_800_000_000_000;

describe("digit entry", () => {
  it("appends digits up to the PIN length and no further", () => {
    let s = INITIAL_PIN_STATE;
    for (const d of ["1", "2", "3", "4", "5", "6"]) s = pressDigit(s, d, T0);
    expect(s.entry).toBe("1234");
    expect(s.entry).toHaveLength(PIN_LENGTH);
  });

  it("ignores anything that is not a single digit", () => {
    let s = INITIAL_PIN_STATE;
    for (const junk of ["a", "", "12", "-1", "٣"]) s = pressDigit(s, junk, T0);
    expect(s.entry).toBe("");
  });

  it("backspaces one digit at a time and stops at empty", () => {
    let s = pressDigit(pressDigit(INITIAL_PIN_STATE, "1", T0), "2", T0);
    s = pressBackspace(s, T0);
    expect(s.entry).toBe("1");
    s = pressBackspace(pressBackspace(s, T0), T0);
    expect(s.entry).toBe("");
  });

  it("reports completeness only at exactly four digits", () => {
    let s = INITIAL_PIN_STATE;
    expect(isComplete(s)).toBe(false);
    for (const d of ["1", "2", "3"]) s = pressDigit(s, d, T0);
    expect(isComplete(s)).toBe(false);
    s = pressDigit(s, "4", T0);
    expect(isComplete(s)).toBe(true);
  });
});

describe("lockout", () => {
  it("does not cool down before the third wrong attempt", () => {
    let s = registerWrong(INITIAL_PIN_STATE, T0);
    expect(isCoolingDown(s, T0)).toBe(false);
    s = registerWrong(s, T0);
    expect(isCoolingDown(s, T0)).toBe(false);
    expect(s.attempts).toBe(2);
  });

  it("starts a 30s cooldown on the third wrong attempt", () => {
    let s = INITIAL_PIN_STATE;
    for (let i = 0; i < MAX_ATTEMPTS; i++) s = registerWrong(s, T0);
    expect(isCoolingDown(s, T0)).toBe(true);
    expect(s.cooldownUntil).toBe(T0 + COOLDOWN_MS);
    expect(cooldownSecondsLeft(s, T0)).toBe(30);
  });

  it("clears the entry when the cooldown starts", () => {
    let s = pressDigit(INITIAL_PIN_STATE, "9", T0);
    for (let i = 0; i < MAX_ATTEMPTS; i++) s = registerWrong(s, T0);
    expect(s.entry).toBe("");
  });

  it("resets the counter with the cooldown, so the next lockout needs three fresh misses", () => {
    let s = INITIAL_PIN_STATE;
    for (let i = 0; i < MAX_ATTEMPTS; i++) s = registerWrong(s, T0);
    expect(s.attempts).toBe(0);

    // After the cooldown expires, two more misses must NOT re-lock.
    const later = T0 + COOLDOWN_MS + 1;
    s = registerWrong(s, later);
    s = registerWrong(s, later);
    expect(isCoolingDown(s, later)).toBe(false);
  });

  it("expires the cooldown once its moment passes", () => {
    let s = INITIAL_PIN_STATE;
    for (let i = 0; i < MAX_ATTEMPTS; i++) s = registerWrong(s, T0);
    expect(isCoolingDown(s, T0 + COOLDOWN_MS - 1)).toBe(true);
    expect(isCoolingDown(s, T0 + COOLDOWN_MS + 1)).toBe(false);
  });

  it("refuses input while cooling down", () => {
    let s = INITIAL_PIN_STATE;
    for (let i = 0; i < MAX_ATTEMPTS; i++) s = registerWrong(s, T0);

    const during = T0 + 1000;
    expect(pressDigit(s, "1", during).entry).toBe("");
    expect(pressBackspace(s, during)).toEqual(s);
  });

  it("accepts input again after the cooldown", () => {
    let s = INITIAL_PIN_STATE;
    for (let i = 0; i < MAX_ATTEMPTS; i++) s = registerWrong(s, T0);
    const after = T0 + COOLDOWN_MS + 1;
    expect(pressDigit(s, "7", after).entry).toBe("7");
  });

  it("never reports negative seconds remaining", () => {
    let s = INITIAL_PIN_STATE;
    for (let i = 0; i < MAX_ATTEMPTS; i++) s = registerWrong(s, T0);
    expect(cooldownSecondsLeft(s, T0 + COOLDOWN_MS + 60_000)).toBe(0);
  });

  it("reset clears entry, attempts and cooldown together", () => {
    expect(reset()).toEqual(INITIAL_PIN_STATE);
  });
});

describe("messages", () => {
  it("says nothing before the first wrong attempt, so the hint can show", () => {
    expect(pinMessage(INITIAL_PIN_STATE, T0)).toBeNull();
  });

  it("warns before the lockout rather than springing it", () => {
    const s = registerWrong(registerWrong(INITIAL_PIN_STATE, T0), T0);
    expect(pinMessage(s, T0)).toMatch(/one more try/i);
  });

  it("counts the cooldown down in the message", () => {
    let s = INITIAL_PIN_STATE;
    for (let i = 0; i < MAX_ATTEMPTS; i++) s = registerWrong(s, T0);
    expect(pinMessage(s, T0)).toMatch(/30s/);
    expect(pinMessage(s, T0 + 25_000)).toMatch(/5s/);
  });

  it("never reveals whether a digit was right", () => {
    // A message that narrows the guess space defeats the gate.
    let s = registerWrong(INITIAL_PIN_STATE, T0);
    expect(pinMessage(s, T0)).not.toMatch(/digit|first|last|correct/i);
  });
});

describe("weak PINs", () => {
  it("flags the four the handoff names", () => {
    for (const p of WEAK_PINS) expect(isWeakPin(p)).toBe(true);
  });

  it("does not flag an ordinary PIN", () => {
    for (const p of ["2718", "9042", "1357"]) expect(isWeakPin(p)).toBe(false);
  });
});
