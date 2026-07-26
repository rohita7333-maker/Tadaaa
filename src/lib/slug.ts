/**
 * URL-safe slug generator for invites, mirroring the web app's nanoid-based
 * slugs (short, unguessable, lowercase). 10 chars from a 32-symbol alphabet.
 */
const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

export function generateSlug(length = 10): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}
