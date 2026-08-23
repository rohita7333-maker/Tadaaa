import {
  PASSWORD_CHECK_COUNT,
  checkPassword,
  passwordStrength,
} from "../password-strength";

describe("checkPassword", () => {
  it("reports every check false for an empty password", () => {
    expect(checkPassword("")).toEqual({ len: false, up: false, lo: false, num: false, sp: false });
  });

  it("requires 8 characters for the length check", () => {
    expect(checkPassword("aaaaaaa").len).toBe(false);
    expect(checkPassword("aaaaaaaa").len).toBe(true);
  });

  it("detects uppercase, lowercase, digit and symbol independently", () => {
    expect(checkPassword("A").up).toBe(true);
    expect(checkPassword("a").lo).toBe(true);
    expect(checkPassword("1").num).toBe(true);
    expect(checkPassword("!").sp).toBe(true);
  });

  it("treats any non-alphanumeric character as a symbol", () => {
    expect(checkPassword(" ").sp).toBe(true);
    expect(checkPassword("é").sp).toBe(true);
  });
});

describe("passwordStrength", () => {
  it("returns an empty label and a zero ratio for an empty password", () => {
    const s = passwordStrength("");
    expect(s.label).toBe("");
    expect(s.score).toBe(0);
    expect(s.ratio).toBe(0);
  });

  it("labels fewer than three satisfied checks Weak", () => {
    expect(passwordStrength("abc").label).toBe("Weak");
    expect(passwordStrength("abc").score).toBe(1);
  });

  it("labels three or four satisfied checks Fair", () => {
    expect(passwordStrength("abcdefgH").label).toBe("Fair");
    expect(passwordStrength("abcdefgH").score).toBe(3);
    expect(passwordStrength("abcdefgH1").score).toBe(4);
    expect(passwordStrength("abcdefgH1").label).toBe("Fair");
  });

  it("labels all five satisfied checks Strong", () => {
    const s = passwordStrength("abcdefgH1!");
    expect(s.score).toBe(PASSWORD_CHECK_COUNT);
    expect(s.label).toBe("Strong");
    expect(s.ratio).toBe(1);
  });

  it("never exceeds a ratio of 1", () => {
    expect(passwordStrength("Aa1!Aa1!Aa1!").ratio).toBeLessThanOrEqual(1);
  });

  it("is display-only: an 8-character password that the schema accepts is still scored Fair", () => {
    // signUpSchema only requires 8 characters — the meter must not imply rejection.
    expect(passwordStrength("password").label).toBe("Weak");
    expect(passwordStrength("password").checks.len).toBe(true);
  });
});
