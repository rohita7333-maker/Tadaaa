# C4 "Change" — an in-wizard theme sheet

**Date:** 2026-08-17
**Status:** approved, uncommitted (repo-wide no-commit hold in force)

## Problem

Frame C4 shows a card reading `Theme: Warm Embrace` with a `CHANGE` control.
Pressing it calls `router.push("/(tabs)/themes")`, which leaves the create
modal for a tab. The only route back into the wizard is `theme/[id]`'s "Use
this theme", which does `router.push("/create", params)` — a **second** wizard
instance on the stack.

Two defects follow:

1. **A stale wizard underneath.** Draft rehydration (shipped earlier today)
   means the user's work now survives the round trip, but the first instance
   is still mounted below the second with its own `useState`. Dismissing the
   top one reveals a wizard showing older values.
2. **Silent scope creep on the data.** `browseThemes()` returns `Template[]`,
   and a template carries `themeId` **plus `occasionId` and `revealType`**.
   "Use this theme" therefore rewrites the occasion chosen at C1 and the reveal
   style chosen at C4 — neither of which the card claims to touch.

## Decision

Replace the navigation with a `<Sheet>` rendered inside the wizard, listing the
themes from `lib/themes`. Selecting one patches `themeId` and closes. The
wizard never navigates, so no second instance can exist.

Rejected alternatives:

- **Templates in the sheet** (parity with the tab) — keeps the occasion/reveal
  overwrite, so every future feature has to re-answer "does changing the theme
  change the occasion?". A bad invariant compounds.
- **Keep navigating, fix the stack** via a shared store and `router.back()` —
  correctness would depend on a stack invariant ("a wizard exists below me"),
  which is precisely the class of assumption that breaks when routes are
  reshuffled. It also does not address a modal leaving into the tab bar.

## Design

### Components

- **`ThemeCard`** (`components/create/ThemeCard.tsx`) — one presentational row:
  gradient swatch from `gradientStops`, name, description, a `PREMIUM $x.xx`
  badge when `isPremium`, and the same coral border + filled check the occasion
  rows use when selected. Shared so the sheet and any future theme surface
  cannot drift apart quietly.
- **`ThemeSheet`** (`components/create/ThemeSheet.tsx`) — a `<Sheet>` of
  `ThemeCard`s over `themes`, with the current selection marked.

### Wiring

`RevealStyleStep.onChangeTheme` opens the sheet instead of navigating.
Selection calls `selectTheme(draft, id)`.

### The invariant, in code

```ts
export function selectTheme(draft: WizardDraft, themeId: string): WizardDraft
```

Returns a new draft with **only** `themeId` changed. It exists as a named,
tested function rather than an inline `patch({ themeId })` so the rule survives
someone re-adding template semantics later.

### Premium

The sheet shows the badge and price; it does **not** gate selection. Entitlement
is settled at C6 by `canPublishTheme`, which is unchanged. Showing the badge at
the point of choice means a premium pick is not a surprise two steps later.

### Out of scope

The themes tab and `theme/[id]` are untouched. They remain the browse surface
and the way to start a *new* surprise from a template — a flow where rewriting
occasion and reveal is correct, because there is nothing yet to overwrite.

## Testing

- `selectTheme` leaves `occasion`, `revealStyle`, `title`, `message`,
  `customOccasion` and every other field untouched.
- Unknown theme id is refused rather than written.
- Selecting the current theme is a no-op.
- Browser: open C4, press CHANGE, confirm the sheet opens over the wizard,
  pick a theme, confirm the card updates, the step stays 4, and the URL never
  changes.

## Known gaps

- No filters or search in the sheet; 14 themes scroll comfortably. If the sheet
  later needs the tab's filtering, it upgrades to a full-screen modal picker
  without touching navigation.
- Not device-verified.
