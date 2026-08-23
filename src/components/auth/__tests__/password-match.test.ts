import {
  CONFIRM_PASSWORD_EMPTY_MESSAGE,
  CONFIRM_PASSWORD_MISMATCH_MESSAGE,
  confirmPasswordError,
  passwordsMatch,
} from "../password-match";

describe("confirmPasswordError", () => {
  it("asks for a confirmation when the confirm field is empty", () => {
    expect(confirmPasswordError("Sup3rSecret!", "")).toBe(CONFIRM_PASSWORD_EMPTY_MESSAGE);
  });

  it("still asks for a confirmation when both fields are empty", () => {
    expect(confirmPasswordError("", "")).toBe(CONFIRM_PASSWORD_EMPTY_MESSAGE);
  });

  it("reports a mismatch when the two differ", () => {
    expect(confirmPasswordError("Sup3rSecret!", "Sup3rSecret")).toBe(
      CONFIRM_PASSWORD_MISMATCH_MESSAGE
    );
  });

  it("is case-sensitive", () => {
    expect(confirmPasswordError("abcABC", "ABCabc")).toBe(CONFIRM_PASSWORD_MISMATCH_MESSAGE);
  });

  it("does not trim — leading or trailing whitespace is a real difference", () => {
    expect(confirmPasswordError("hunter2 ", "hunter2")).toBe(CONFIRM_PASSWORD_MISMATCH_MESSAGE);
    expect(confirmPasswordError(" hunter2", "hunter2")).toBe(CONFIRM_PASSWORD_MISMATCH_MESSAGE);
  });

  it("compares unicode input by exact code units", () => {
    expect(confirmPasswordError("pässwörd", "pässwörd")).toBeUndefined();
    expect(confirmPasswordError("pässwörd", "passwörd")).toBe(
      CONFIRM_PASSWORD_MISMATCH_MESSAGE
    );
  });

  it("returns undefined for an exact match", () => {
    expect(confirmPasswordError("Sup3rSecret!", "Sup3rSecret!")).toBeUndefined();
  });

  it("accepts a short password — length is signUpSchema's job, not ours", () => {
    expect(confirmPasswordError("abc", "abc")).toBeUndefined();
  });
});

describe("passwordsMatch", () => {
  it("is false while the confirm field is empty", () => {
    expect(passwordsMatch("Sup3rSecret!", "")).toBe(false);
  });

  it("is false on a mismatch", () => {
    expect(passwordsMatch("Sup3rSecret!", "nope")).toBe(false);
  });

  it("is true on an exact match", () => {
    expect(passwordsMatch("Sup3rSecret!", "Sup3rSecret!")).toBe(true);
  });
});
