import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { customAlphabet } from "nanoid";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const nanoid = customAlphabet(
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  10
);

/**
 * Generate a URL-safe invite slug with theme prefix.
 * e.g. "warm-embrace-ab3xk9mlpq"
 */
export function generateInviteSlug(themeId: string): string {
  return `${themeId}-${nanoid()}`.toLowerCase();
}

export function formatViewCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}

export function isExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

export function randomRotation(): number {
  return parseFloat((Math.random() * 12 - 6).toFixed(2));
}

export function isCountdownComplete(
  countdownDate: string | null | undefined
): boolean {
  if (!countdownDate) return true;
  return new Date(countdownDate) <= new Date();
}
