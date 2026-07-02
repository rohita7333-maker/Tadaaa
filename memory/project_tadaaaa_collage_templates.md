# TaDaaaa — Count-Bucketed Collage Templates (2026-07-01)

## What shipped
Photo-collage download (`GET /api/invite/[slug]/collage`) now picks a layout
that matches the number of uploaded photos — never leaves an empty hole — and
bakes the occasion as a **wish to the recipient** into a caption cell.

## Files
- `src/lib/collage-templates.ts` — count-bucketed registry.
  - `CollageSlot.caption?: boolean` (text-only cell, no photo).
  - `CollageTemplate.photoCount` = number of non-caption slots.
  - `board(id,label,rects)` helper: 1080×1350 cream board (`#EDE7DE`),
    frame:12/radius:8, appends shared bottom `CAPTION_SLOT` (6/83/88/13).
  - Templates cover counts 1..9 (photos-1a … photos-9a; 2/3/6 have 2 variants)
    + signature `polaroid-scrapbook` (1200×1500, 8 photos, hero captionStrip).
  - `getCollageTemplatesForCount(n)` / `pickCollageTemplateForCount(n, rng=Math.random)`
    — random pick among matching layouts; `rng` injectable for tests.
- `src/lib/designer-art.ts` — `occasionWish(occasion)`:
  birthday→"Happy Birthday!", mothers_day→"Happy Mother's Day!",
  festival→"Let's Celebrate!", apology→"I'm Sorry", else→"You're Invited!".
- `src/app/api/invite/[slug]/collage/route.tsx`:
  - `renderTemplateCollage` skips caption slots when assigning photos
    (hero slot first → photos[0]); renders caption cell = white card +
    `#C4686D` rotated-square diamond + Fraunces occasion-wish text.
  - selection: `collageTemplate ?? pickCollageTemplateForCount(signedPhotos.length)`;
    `caption = occasionWish(invite.occasion_type)`.
  - GET already selects `occasion_type`.

## Key decisions
- **Canva MCP can't export slot geometry** → geometry hand-coded in TS (Satori
  render), NOT stored in DB. The 21 Canva template IDs (bucketed by count)
  informed the warm-collage aesthetic + count buckets only.
- DB `collage_templates` migration **deferred** — in-code registry fully
  satisfies the visible requirement (count-match + random variety + caption).
- Flavor 1a (in-app geometry on cream board); Flavor 1b (Canva art as bg)
  infeasible — stock photos bake into exports.

## Verification (green)
- `npx vitest run` → 321 passed (31 files). Data-layer tests:
  collage-templates.test.ts (integrity: id↔key, %-range, no-overflow,
  photoCount===non-caption count, deterministic rng pick) + designer-art
  occasionWish (9 cases).
- `npx tsc --noEmit` clean.
- PNG render proof (throwaway script, deleted): counts 2/4/6/9 → correct
  count-matched layouts, caption cell + "Happy Birthday!" wish, fonts loaded.

## Canva free-plan capability matrix (EMPIRICALLY ESTABLISHED 2026-07-01)
Tested the live Canva MCP (`mcp__5bde1d36…__*`) end-to-end:
- `upload-asset-from-url` = **works free**, but needs **direct HTTP-200 URLs**
  (no redirects, no UA blocks). Supabase signed URLs qualify. picsum(302) /
  wikimedia(UA-block) / 404 all fail `fetch_failed`. Verify with
  `curl -s -o /dev/null -w "%{http_code}"` first.
- `generate-design` `design_type:'photo_collage'` + `asset_ids`(≤10) = **works
  free**; returns 4 AI candidates — **BUT fills unspecified frames with Canva
  STOCK photos + picks layout non-deterministically.**
- `create-design-from-candidate` (job_id+candidate_id) → real design id.
- `export-design` (png) = **works free** → S3 URL. Proof: /tmp/canva-proof.png
  (756×1134) — showed stock photos contaminating 2 of 3 frames.
- `search-brand-templates` / autofill / brand-template dataset = **Pro-only**
  (paywall error "requires a Canva paid plan").
- **CRITICAL:** Canva MCP tools run in the AGENT conversation, NOT the Next.js
  server runtime. In-product per-download live Canva would need the **Canva
  Connect REST API + OAuth developer-app creds** (client id/secret + per-creator
  tokens) — only the user can provision. Per-download = 6+ async calls + 10–40s
  AI latency + free-plan quota.

## Decision: SHIP IN-CODE (Option D), not live Canva
Free-plan live Canva is **inferior** for personal-photo collages: stock-photo
contamination + non-deterministic layout + latency/quota + needs OAuth creds.
The in-code Satori path is deterministic, instant, uses only the user's own
photos, count-matched, no empty holes. Chose to ship it. Live Canva is an
optional future enhancement gated on user provisioning a Connect app.

## Polaroid caption box-model fix (2026-07-01)
Hero polaroid caption strip sat low / near-clipping. Root cause: parent had
`paddingBottom: frame + strip` AND caption `<div>`(height `strip`) rendered in a
flex-column content box already shrunk to `imgH` (=`slotH-2*frame-strip`) → caption
overflowed into bottom padding. Fix (route.tsx `renderTemplateCollage`):
remove `paddingBottom` (bottom padding = `frame`), add `flexShrink:0` to `<img>`
and to caption `<div>`, add `lineHeight:1` to strip. Content box then = `imgH+strip`,
exactly holds image + caption band with clean `frame` bottom border. Verified via
throwaway next/og proof PNG — "Happy Birthday!" centered cleanly in strip.

## Left on user's end
- Optional: build Supabase `collage_templates` table if DB-driven mapping still
  wanted (current in-code registry works without it).
- Optional (live Canva enhancement): provision a Canva Connect OAuth developer
  app (client id/secret + per-creator token flow); would also want Canva **Pro**
  for deterministic autofill. Neither required to ship the in-code path.
