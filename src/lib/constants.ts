export const APP_NAME = "TaDaaaa";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
export const MAX_PHOTOS = 8;
export const MAX_MESSAGE_LENGTH = 500;
export const MAX_TITLE_LENGTH = 100;
export const FREE_INVITE_DAILY_LIMIT = 5; // legacy — not used for new limit logic
export const FREE_INVITE_MONTHLY_LIMIT = 2;
export const PREMIUM_THEME_PRICE = 4.99;
export const PHOTO_MAX_SIZE_MB = 1;
export const PHOTO_MAX_DIMENSION = 1920;
export const SIGNED_URL_EXPIRY_FREE = 60 * 60 * 24 * 7; // 7 days
export const SIGNED_URL_EXPIRY_PAID = 60 * 60 * 24 * 30; // 30 days
// Short TTL used for per-render signed URLs (contribution photos, page-level).
// Each new page load gets a fresh 1-hour window; React.cache() prevents
// redundant re-signing within a single request lifecycle.
export const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour
export const STORAGE_BUCKET = "invite-photos";
