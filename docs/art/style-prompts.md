# TaDaaaa Template Art — Style-Prompt Kit

**Purpose.** Generate ORIGINAL illustrated art for premium scroll-story templates that reads as authentic and hand-crafted — the "expensive" feeling that sells a template — while looking like one coherent family across all 12. This is the recipe; run it through any text-to-image model (Midjourney, Firefly, Imagen, Flux, DALL·E, SDXL) or hand to an illustrator.

**Legal (non-negotiable).** Genre and composition are free to use; specific artworks are not. NEVER prompt "in the style of Missing Piece" or feed their images as reference. Do not reproduce any copyrighted illustration. Every negative prompt below includes `no watermark, no text, no logo` — keep them. Generated output is original and owned by TaDaaaa.

**Output budget (Lighthouse-safe).** Per premium template, produce 4 layered assets → `public/templates/<id>/`:
| Asset | File | Size (px) | Target weight | Used by |
|---|---|---|---|---|
| Cover | `cover.webp` | 900×1275 (3:4.25) | ≤ 80 KB | marketplace card + coverflow fan |
| Hero backdrop | `hero-bg.webp` | 1920×2400 | ≤ 180 KB | SkyHero scene |
| Frame (transparent) | `frame.png` | 1200×1200 | ≤ 120 KB | plaque + polaroid borders |
| Texture (tileable) | `texture.webp` | 1024×1024 | ≤ 60 KB | scene backgrounds |

Pipeline: generate → upscale/clean (image-enhancer) → `cwebp -q 82` (cover/texture), `cwebp -q 80` (hero), `pngquant` (frame). Set explicit width/height in the registry (`art: {cover,heroBg,frame,texture}` on the Template) so CLS stays 0. Free templates keep the CSS-gradient fallback — no assets needed.

---

## Shared style DNA (prepend to EVERY prompt)

> `painterly folk-illustration, flat gouache and gold-leaf, ornate botanical borders, soft grain paper texture, warm candlelit light, delicate linework, storybook depth, romantic and celebratory, elegant negative space` — `--no photo, 3d render, harsh shadows, text, letters, watermark, logo, signature, frame border UI`

Consistency levers that make 12 templates feel like one collection:
- Same paper-grain + gold-leaf accent in all.
- Same lighting direction (soft, top-left, candlelit).
- Palette drawn ONLY from the brand tokens below — the accent shifts per occasion, the neutrals stay constant.

Brand palette (source of truth): cream `#FFF8F0`, cream-dark `#F5EDE3`, rose `#C4686D` / deep `#9B3D42` / light `#E8A5A8`, gold `#C9A96E` / light `#E8D5A8`, charcoal `#2D2926`.

---

## Per-occasion prompt recipes

Each row = the occasion-specific clause you append after the shared DNA. Palette lists the dominant accents (still on brand).

### Birthday — warm gold-hour
`glowing paper lanterns rising into a dusk sky, a small celebration table with a single candlelit cake, marigold and rose garlands` · palette: gold `#C9A96E` + rose-light `#E8A5A8` on dusk-to-cream gradient · cover focal: the cake under lanterns.

### Proposal — blush & ring
`two silhouettes under an arch of blossoms at golden hour, a single ring motif in gold leaf, drifting rose petals` · palette: rose `#C4686D` + gold-light `#E8D5A8` · cover focal: the blossom arch.

### Anniversary — burgundy heirloom
`intertwined botanical vines forming a heart, vintage burgundy and gold damask, two candles` · palette: rose-deep `#9B3D42` + gold `#C9A96E` · cover focal: the vine-heart.

### Baby — soft dawn
`gentle pastel nursery motifs, a paper crib under a mobile of tiny stars, soft clouds` · palette: cream-dark `#F5EDE3` + gold-light `#E8D5A8` + faint rose · cover focal: the star mobile.

### Festival / celebration — lantern night
`rows of diyas and hanging lanterns, ornate rangoli border in gold, festive night sky` · palette: gold `#C9A96E` + rose-deep `#9B3D42` on charcoal night · cover focal: the diya rows.

### Just because — botanical letter
`an open illustrated envelope releasing wildflowers and gold sparks, pressed-flower border` · palette: rose-light `#E8A5A8` + gold `#C9A96E` on cream · cover focal: the envelope + flowers.

---

## Asset-specific modifiers

- **cover** — append `vertical portrait composition, single clear focal subject centered, room at bottom for a title scrim, rich but uncluttered`.
- **hero-bg** — append `tall vertical scene, gradient dusk-to-cream top-to-bottom, atmospheric depth, subject small and low so text sits in the upper sky, seamless top edge`.
- **frame** — append `ornate botanical corner-and-edge frame ONLY, hollow transparent center, symmetrical, gold-leaf and painted flowers, PNG transparent background` · `--no filled center, solid background`.
- **texture** — append `seamless tileable damask pattern, subtle tone-on-tone, low contrast so text stays legible on top` · `--no seams, high contrast, focal subject`.

---

## Workflow

1. Pick a premium template id from `src/lib/templates.ts` (the 4 scroll_story ones first: `golden-hour`, `diya-nights`, `still-us`, `the-big-ask` — verify ids).
2. For each of the 4 assets: `[shared DNA] + [occasion clause] + [asset modifier]`. Generate 3–4, pick best.
3. Enhance → compress to budget → drop in `public/templates/<id>/`.
4. Add the `art` object to that template's registry entry. Scene components already fall back to gradients when `art` is absent, so ship incrementally — one template at a time, no big-bang.
5. Re-run Lighthouse on `/templates` after adding real images (lazy-load below fold keeps LCP < 2.5s).

**Later:** swap AI packs for commissioned illustration ($300–1,500/pack) using these same recipes as the brief — the registry `art` field means zero code change to upgrade.
