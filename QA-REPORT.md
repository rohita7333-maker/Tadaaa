# TaDaaaa Mobile — QA Report

**Date:** 2026-07-02 · **Build:** Expo SDK 54, RN 0.81, React 19.1 · **Method:** static web export driven with Playwright (only browser-testable surface without Xcode) + automated gate. Native-only behavior (haptics, real Reanimated motion, SecureStore, camera roll) can't be judged on web — noted where relevant.

## Health score: 88 / 100 (native target)
Core flows all render and function with zero functional bugs. One High web-only crash found **and fixed** during the pass. Remaining items are web-only or cosmetic and don't affect the native product.

## Automated gate (all green)
- `tsc --noEmit`: **0 errors**
- `jest`: **25 / 25 pass**
- `expo export` (ios + web): **bundles clean**

## Flows tested (web build, real Supabase)
| Flow | Result | Console errors |
|---|---|---|
| Boot + auth gate (→ /sign-in when logged out) | ✅ pass | 0 |
| Sign-in (test account) → app | ✅ pass | 0 |
| Home / dashboard (tier limit shows **0/2** free) | ✅ pass | 0 |
| Tab bar (Home/Invites/FAB/Activity/Profile) | ✅ renders | 0 |
| Create wizard step 1 (occasions, 14 themes, **$4.99 premium locks**) | ✅ pass | 0 |
| Reveal — locked (gift, "Tap to reveal", **ribbons spread across screen**) | ✅ pass | 2 (see FIND-02) |
| Reveal — open (title, message, **2 polaroids**, **2 Yes/No questions**, RSVP) | ✅ pass | 2 (see FIND-02) |

Ribbon fix **confirmed**: ribbons fill the whole screen instantly (phase-offset loop), not the old empty-top. New `ScreenHeader` correctly hidden on a direct reveal link (recipient view = no chrome).

## Findings

### FIND-01 — Web target crashed Metro (`window is not defined`) — HIGH — **FIXED**
`web.output: "static"` made Expo Router server-render routes in Node, where AsyncStorage (Supabase session) touches `window`. A browser request triggered that SSR path and **killed the Metro dev server** (also dropping the phone connection). Native unaffected.
- **Fix:** `app.json` → `web.output: "single"` (client-only SPA, no SSR). Verified: web now boots, all flows load.
- **Commit-worthy:** yes (1-line app.json change).

### FIND-02 — Reveal logs 2 console errors when backend is down — LOW (web-only)
The reveal's best-effort photo-signing call hits `EXPO_PUBLIC_API_BASE_URL` (`localhost:3000`); with no backend it logs a CORS / `ERR_FAILED` error. It is **caught** — the reveal falls back to gradient polaroids, no crash. Two angles:
1. Expected degradation when no backend is connected.
2. Real note: the mobile BFF routes (`/api/mobile/*`) set **no CORS headers**, so a *web* build can't call them cross-origin even with the backend up. The **native app is unaffected** (not a browser, no CORS). Product is native → low priority. Fix later = add `Access-Control-Allow-Origin` to the mobile routes if a web build ever ships.

### FIND-03 — Full-width stretch on desktop web — COSMETIC (web-only)
The mobile app on a wide browser stretches edge-to-edge (no max-width). On a phone it's correct. Only matters if a web build is a real target; then wrap in a max-width phone frame. Not a product bug.

## Not covered (needs device / backend)
- Real Reanimated motion feel (ribbons falling, confetti burst, dodging-No) — verified present + static-correct on web; judge on phone.
- Haptics, SecureStore, camera-roll picker, Google OAuth redirect — native/Expo Go only.
- Photo upload + real photo display, AI draft, Stripe checkout — need the web backend running + `EXPO_PUBLIC_API_BASE_URL` on LAN.

## Verdict
Ship-ready for on-device testing. No functional blockers. The one crash that could have wasted your time (Metro dying) is fixed. Test the reveal on your phone for motion feel; wire the backend to exercise photos/AI/Stripe.
