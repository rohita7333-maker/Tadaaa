/**
 * Password-strength scorer for the sign-up meter.
 *
 * Display-only. It mirrors the mockup's `VALID.password` checks
 * (`tadaaaa/tadaaaa-editorial.html` line 828) so the meter reads the same, but
 * it deliberately does NOT gate submission — the server contract stays exactly
 * `signUpSchema` (min 8 characters). Changing what can be submitted would be an
 * auth-logic change, which this phase does not make.
 */

export interface PasswordChecks {
  /** `len` — 8 or more characters. */
  len: boolean;
  /** `up` — at least one uppercase letter. */
  up: boolean;
  /** `lo` — at least one lowercase letter. */
  lo: boolean;
  /** `num` — at least one digit. */
  num: boolean;
  /** `sp` — at least one non-alphanumeric character. */
  sp: boolean;
}

export type PasswordStrengthLabel = "" | "Weak" | "Fair" | "Strong";

export interface PasswordStrength {
  checks: PasswordChecks;
  /** Number of satisfied checks, 0–5. */
  score: number;
  /** 0–1, for the meter fill width. */
  ratio: number;
  /** Empty string for an empty password, matching the mockup's `meterLbl`. */
  label: PasswordStrengthLabel;
}

export const PASSWORD_CHECK_COUNT = 5;

export function checkPassword(password: string): PasswordChecks {
  return {
    len: password.length >= 8,
    up: /[A-Z]/.test(password),
    lo: /[a-z]/.test(password),
    num: /[0-9]/.test(password),
    sp: /[^A-Za-z0-9]/.test(password),
  };
}

/** `n<3 ? "Weak" : n<5 ? "Fair" : "Strong"`, empty password → "". */
export function passwordStrength(password: string): PasswordStrength {
  const checks = checkPassword(password);
  const score = Object.values(checks).filter(Boolean).length;
  const label: PasswordStrengthLabel = !password
    ? ""
    : score < 3
      ? "Weak"
      : score < PASSWORD_CHECK_COUNT
        ? "Fair"
        : "Strong";
  return { checks, score, ratio: score / PASSWORD_CHECK_COUNT, label };
}
