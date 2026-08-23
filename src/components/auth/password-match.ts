/**
 * Confirm-password matcher for the sign-up form.
 *
 * Client-side only, exactly like `password-strength.ts`. It gates the submit
 * button in the UI; it does NOT change `signUpSchema` and it does NOT change
 * what the Supabase call receives — the server contract is still
 * `{ fullName, email, password }`.
 */

export const CONFIRM_PASSWORD_EMPTY_MESSAGE = "Re-enter your password to confirm.";
export const CONFIRM_PASSWORD_MISMATCH_MESSAGE = "Passwords do not match.";

/**
 * Submit-time gate. Returns the message to show under the confirm field, or
 * `undefined` when the pair is good.
 *
 * An empty confirmation is an error at submit time, but callers should only
 * surface it once the user has typed something (or pressed submit) so the
 * field does not scold an untouched input.
 */
export function confirmPasswordError(
  password: string,
  confirmPassword: string
): string | undefined {
  if (confirmPassword.length === 0) return CONFIRM_PASSWORD_EMPTY_MESSAGE;
  if (password !== confirmPassword) return CONFIRM_PASSWORD_MISMATCH_MESSAGE;
  return undefined;
}

/** True only when both fields are non-empty and identical. */
export function passwordsMatch(password: string, confirmPassword: string): boolean {
  return confirmPasswordError(password, confirmPassword) === undefined;
}
