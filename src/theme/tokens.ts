/**
 * Design tokens — editorial identity (P0 of the 2026-08-09 re-theme).
 *
 * `palette` (the 8 primitives) plus `derived` (documented mixes of them) are the
 * ONLY sources of colour truth. Both mirror the web contract in
 * `surprise-invite/src/lib/design-tokens.ts` verbatim; both platforms hard-code
 * the same literals in their token tests so drift breaks a suite. The
 * `@deprecated` alias blocks below hold references only — never a literal.
 *
 * Restraint rules that come with this palette: no cursive, no rainbow
 * gradients, no heavy shadows, ~90% ink/paper/stone with coral reserved for
 * primary CTAs and active states.
 */
import { Platform } from "react-native";

/** Editorial primitives. The contract — do not derive, do not round. */
export const palette = {
  ink: "#1A1A1A",
  paper: "#FFFEFD",
  stone: "#484848",
  pebble: "#F5F0ED",
  mist: "#E8E4E0",
  coral: "#D45847",
  sand: "#CCAC9F",
  kohlrabi: "#994EA8",
} as const;

/**
 * Derived extension — primitives-tier, NOT aliases. Every value is a documented
 * mix/shade of `palette`, so no alias below has to hold its own literal. Shared
 * verbatim with web (`surprise-invite/src/lib/design-tokens.ts` → `derived`, and
 * the `--coral-deep …` custom properties in `src/app/globals.css`).
 *
 * `coralDeep` is the AA-safe coral for small text. The mockup sanctions a dark
 * coral (`.btn-coral:hover{background:#c04a3a}`), but we ship #B8412F because
 * (a) mobile already shipped that exact value and (b) it measures better: on
 * cream #FFF8F0 it is 5.20:1 vs #c04a3a at 4.66:1. #B8412F clears WCAG AA
 * (4.5:1) on every ground: #FFF8F0 5.20:1 · #F5EDE3 4.72:1 · #F5F0ED 4.84:1 ·
 * #FFFEFD 5.43:1.
 */
export const derived = {
  /** coral shaded toward ink */
  coralDeep: "#B8412F",
  /** coral ~30% toward paper */
  coralLight: "#E18A7D",
  /** sand ~40% toward paper */
  sandLight: "#E0CDC5",
  /** sand shaded toward ink */
  sandDeep: "#B08D7E",
  /** absolute white, for text on coral fills */
  white: "#FFFFFF",
  /** coral ~10% over paper */
  chipCoralBg: "#FBEDEB",
  /** coral ~25% over paper */
  chipCoralBorder: "#F4D4D0",
  /** sand shaded ~50% toward ink; 5.06:1 on pebble */
  chipMutedText: "#73635D",
  /**
   * Success green — the mockup's "Strong" password state
   * (`tadaaaa-editorial.html` `.meter.s3{background:#2e7d4f}`), shaded ~4% per
   * channel from that `#2e7d4f` so it clears WCAG AA on both editorial grounds.
   * The mockup value measured 4.46:1 on pebble, under the 4.5:1 floor for
   * normal text; this one measures 5.35:1 on paper #FFFEFD and 4.76:1 on
   * pebble #F5F0ED, so it is AA-safe for small text on either.
   */
  success: "#2C784C",
  /**
   * Sand rendered on a LIGHT ground.
   *
   * `sand` is an ink-ground colour only: 8.26:1 on ink, 2.09:1 on paper. Any
   * warm accent text on a light surface needs its own value. The mobile
   * handoff specifies #8A6F5C. That clears AA on paper (4.62:1) but NOT on
   * pebble (4.12:1), and pebble is a primary ground — section fills, cards,
   * search fields, muted rows.
   *
   * Shipped darkened by 7 per channel, the same correction already applied to
   * `success`: 5.11:1 on paper #FFFEFD, 4.56:1 on pebble #F5F0ED.
   */
  sandInk: "#836855",
} as const;

/**
 * @deprecated — removed in P5. Alias block only: every key below resolves onto
 * `palette` or `derived` and carries no independent value. New code must read
 * `palette` / `derived`.
 */
export const colors = {
  cream: palette.paper,
  creamDark: palette.pebble,
  appBg: palette.pebble,
  rose: palette.coral,
  roseLight: derived.coralLight,
  roseDeep: derived.coralDeep,
  gold: palette.sand,
  goldLight: derived.sandLight,
  goldDeep: derived.sandDeep,
  charcoal: palette.ink,
  warmGray: palette.stone,
  lightGray: palette.mist,
  hair: palette.mist,
  white: derived.white,

  // chip surfaces — neutral grounds, accent text (editorial bans decorative fills)
  roseChipBg: derived.chipCoralBg,
  roseChipBorder: derived.chipCoralBorder,
  goldChipBg: palette.pebble,
  goldChipText: derived.chipMutedText,
  goldChipBorder: palette.mist,
  greenChipBg: palette.pebble,
  greenChipText: palette.kohlrabi,
  greenChipBorder: palette.mist,
} as const;

/**
 * @deprecated — removed in P5. Two-stop, single-family ramps only; the
 * editorial identity bans rainbow and heavy gradients.
 */
export const gradients = {
  rose: [palette.coral, derived.coralDeep] as [string, string],
  gold: [palette.sand, derived.sandDeep] as [string, string],
} as const;

/** Georgia ships on iOS but not reliably on Android — fall back to the
 * platform serif there. `undefined` means "platform default sans", which is
 * the React Native convention for the system body face. */
const HEAD_FAMILY = Platform.select({ ios: "Georgia", android: "serif", default: "serif" });

export const fonts = {
  /** Editorial headline face. Set `fontWeight: "400"` at the call site. */
  heading: HEAD_FAMILY,
  /** @deprecated — removed in P5. Alias of `heading`; there is one headline face. */
  headingSemi: HEAD_FAMILY,
  /** System body face (platform default). */
  body: undefined,
  /** @deprecated — removed in P5. Weight is a style prop, not a family. */
  bodyMedium: undefined,
  /** @deprecated — removed in P5. Weight is a style prop, not a family. */
  bodyBold: undefined,
  /** @deprecated — removed in P5. Cursive is banned by the identity; body face. */
  hand: undefined,
} as const;

/**
 * Typography presets — the RN equivalent of the mockup's base rules
 * (`tadaaaa/tadaaaa-editorial.html`):
 *
 *   body      → `line-height:1.6` + `color:var(--ink)`
 *   paragraph → `p{color:var(--stone)}`
 *   heading   → `h1..h4{font-family:var(--head);font-weight:400;
 *                letter-spacing:-.02em;line-height:1.1;color:var(--ink)}`
 *   label     → `.label{font-size:12px;font-weight:600;letter-spacing:.12em;
 *                text-transform:uppercase;color:var(--stone)}`
 *   serifItalic → `.serif-i{font-family:var(--head);font-style:italic}`
 *
 * React Native has no cascade and no `p` element, so these ship as explicit
 * style presets rather than global rules. `lineHeight` is absolute in RN, so
 * the CSS ratios are resolved against `fontSize`; `letterSpacing` is absolute
 * points, so `-.02em`/`.12em` become `fontSize * ratio`.
 *
 * P0 only defines them — applying them across screens is P1–P3 work.
 */
export const LINE_HEIGHT_BODY_RATIO = 1.6;
export const LINE_HEIGHT_HEADING_RATIO = 1.1;
export const LETTER_SPACING_HEADING_RATIO = -0.02;
export const LETTER_SPACING_LABEL_RATIO = 0.12;

const BODY_FONT_SIZE = 16;
const HEADING_FONT_SIZE = 28;
const LABEL_FONT_SIZE = 12;

export const typography = {
  /** Document default: system body face, 1.6 leading, ink. */
  body: {
    fontFamily: fonts.body,
    fontSize: BODY_FONT_SIZE,
    lineHeight: BODY_FONT_SIZE * LINE_HEIGHT_BODY_RATIO, // 25.6
    color: palette.ink,
  },
  /** Paragraph copy — the `p{color:var(--stone)}` rule. */
  paragraph: {
    fontFamily: fonts.body,
    fontSize: BODY_FONT_SIZE,
    lineHeight: BODY_FONT_SIZE * LINE_HEIGHT_BODY_RATIO, // 25.6
    color: palette.stone,
  },
  /** Headline face — weight 400, tight leading and tracking, ink. */
  heading: {
    fontFamily: fonts.heading,
    fontWeight: "400",
    fontSize: HEADING_FONT_SIZE,
    lineHeight: HEADING_FONT_SIZE * LINE_HEIGHT_HEADING_RATIO, // 30.8
    letterSpacing: HEADING_FONT_SIZE * LETTER_SPACING_HEADING_RATIO, // -0.56
    color: palette.ink,
  },
  /** Eyebrow/label — 12 / 600 / .12em tracking / uppercase / stone. */
  label: {
    fontFamily: fonts.body,
    fontSize: LABEL_FONT_SIZE,
    fontWeight: "600",
    letterSpacing: LABEL_FONT_SIZE * LETTER_SPACING_LABEL_RATIO, // 1.44
    textTransform: "uppercase",
    color: palette.stone,
  },
  /** Serif italic accent — headline face, italic. */
  serifItalic: {
    fontFamily: fonts.heading,
    fontStyle: "italic",
  },
} as const;

export const radii = {
  sm: 6,
  md: 12,
  /** @deprecated — removed in P5. Alias of `md`; the contract has three radii. */
  lg: 12,
  /** @deprecated — removed in P5. Alias of `md`; the contract has three radii. */
  xl: 12,
  pill: 100,
  /** Lock Screen widgets / Live Activity cards (handoff "radius: card 18"). */
  card: 18,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

/**
 * HANDOFF SPACING SCALE — `design-handoff/TaDaaaa-Mobile.dc.html`.
 *
 * The handoff specifies 4 / 8 / 10 / 14 / 18 / 22 / 26 / 34 / 44. That is NOT
 * the legacy `spacing` scale above (4/8/12/16/20/28), so this ships as its own
 * export rather than repointing `spacing` — repointing would silently shift
 * every screen already built against it, which is a re-layout, not a token
 * change. New mobile surfaces use `space`; `spacing` is frozen for existing
 * ones and retires with them.
 */
export const space = {
  x1: 4,
  x2: 8,
  x3: 10,
  x4: 14,
  x5: 18,
  x6: 22,
  x7: 26,
  x8: 34,
  x9: 44,
} as const;

/** Screen gutters. 24 on centred/empty states, 20 everywhere else. */
export const screenPadding = { default: 20, centered: 24 } as const;

/**
 * Minimum hit areas. The handoff floor is 44×44 for anything tappable, with
 * three named exceptions that are LARGER, never smaller.
 */
export const touch = {
  /** Nothing tappable may be smaller than this, in either axis. */
  min: 44,
  /** Primary buttons and text inputs. */
  control: 52,
  /** Chips sit between the floor and a control. */
  chipMin: 38,
  chipMax: 44,
  /** PIN keypad keys (D1) — deliberately oversized for eyes-off entry. */
  pinKey: 72,
} as const;

/**
 * Translucent layers for INK grounds (every reveal screen).
 *
 * React Native has no `color-mix`, so these are literal rgba of `paper`
 * #FFFEFD — the only place in the token layer where a channel triplet is
 * written out, and it is the same paper the rest of the system uses.
 */
export const overlay = {
  /** Contributor cards, translucent pills. */
  fill: "rgba(255,254,253,0.07)",
  borderSoft: "rgba(255,254,253,0.18)",
  borderStrong: "rgba(255,254,253,0.28)",
  /** Secondary copy on ink. */
  textSoft: "rgba(255,254,253,0.6)",
  textStrong: "rgba(255,254,253,0.78)",
} as const;

/**
 * Reveal scrim — top-to-bottom over the theme photo so bottom-aligned text
 * stays legible regardless of the image. Stops are the handoff's verbatim.
 * Consumed by `expo-linear-gradient`, which takes colors + locations.
 */
export const revealScrim = {
  colors: ["rgba(26,26,26,0.35)", "rgba(26,26,26,0.1)", "rgba(26,26,26,0.9)"],
  locations: [0, 0.45, 1],
} as const;

/**
 * TYPE ROLES — the handoff's role table, resolved to absolute RN values.
 *
 * CSS ratios do not survive the port: RN `lineHeight` and `letterSpacing` are
 * absolute, so every `em` is multiplied out against its own size here rather
 * than at ~40 call sites. Serif roles carry `fontWeight: "400"` explicitly —
 * the display face is weight 400 ALWAYS, and a bold serif is the single
 * fastest way to make this identity look like a different product.
 */
const SERIF = fonts.heading;

export const type = {
  /** Screen title — 26-32 / 400 / -.02em. Shipped at the low end. */
  screenTitle: {
    fontFamily: SERIF,
    fontWeight: "400",
    fontSize: 26,
    lineHeight: 26 * 1.15,
    letterSpacing: 26 * -0.02,
    color: palette.ink,
  },
  /** Reveal headline — 34-42 / 400 / -.02em / lh 1.08-1.15. On ink. */
  revealHeadline: {
    fontFamily: SERIF,
    fontWeight: "400",
    fontSize: 34,
    lineHeight: 34 * 1.1,
    letterSpacing: 34 * -0.02,
    color: palette.paper,
  },
  /** Countdown digits — 62 / 400 / tabular. Sand on ink. */
  countdown: {
    fontFamily: SERIF,
    fontWeight: "400",
    fontSize: 62,
    lineHeight: 62 * 1.05,
    color: palette.sand,
    fontVariant: ["tabular-nums"],
  },
  /** Stat value — 24-30 / 400. */
  statValue: {
    fontFamily: SERIF,
    fontWeight: "400",
    fontSize: 24,
    lineHeight: 24 * 1.15,
    color: palette.ink,
  },
  /** Body — 16-17 / lh 1.55-1.65. */
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 16 * 1.6,
    color: palette.ink,
  },
  /** Secondary body — 13-15 / stone. */
  bodySecondary: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 13 * 1.55,
    color: palette.stone,
  },
  /** Field label — 11 / 600 / +.08em / uppercase / stone. */
  fieldLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 11 * 0.08,
    textTransform: "uppercase",
    color: palette.stone,
  },
  /** Section label — 11 / 600 / +.12em / uppercase / stone. */
  sectionLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 11 * 0.12,
    textTransform: "uppercase",
    color: palette.stone,
  },
  /** Button label — 12-13 / 600 / +.08em / uppercase. */
  buttonLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 12 * 0.08,
    textTransform: "uppercase",
  },
  /** Tab label — 10 / 600 / +.06em / uppercase. */
  tabLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 10 * 0.06,
    textTransform: "uppercase",
  },
  /** Reveal micro-label — 10 / 600 / +.18em / uppercase / sand. Ink grounds. */
  revealMicroLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 10 * 0.18,
    textTransform: "uppercase",
    color: palette.sand,
  },
} as const;

const SHADOW_BASE = Platform.select({
  ios: {
    shadowColor: palette.ink,
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  android: { elevation: 1 },
  default: {},
});

const SHADOW_CARD = Platform.select({
  ios: {
    shadowColor: palette.ink,
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 4 },
  default: {},
});

const SHADOW_FLOAT = Platform.select({
  ios: {
    shadowColor: palette.ink,
    shadowOpacity: 0.1,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 8 },
  },
  android: { elevation: 10 },
  default: {},
});

/** Cross-platform elevation presets. `base`/`card`/`float` are the contract
 * names; `sm`/`md`/`lg` are deprecated aliases of the same three objects. */
/**
 * The ONE shadow the handoff sanctions: the create FAB.
 * "One shadow only, on the FAB: 0 4px 14px rgba(212,88,71,.35). Everything
 * else uses borders." It is coral-tinted, not ink — the FAB floats off a paper
 * tab bar and an ink shadow reads as grime under a coral disc.
 */
const SHADOW_FAB = Platform.select({
  ios: {
    shadowColor: palette.coral,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 8 },
  default: {},
});

export const shadows = {
  /** Create FAB only — see SHADOW_FAB. */
  fab: SHADOW_FAB,
  base: SHADOW_BASE,
  card: SHADOW_CARD,
  float: SHADOW_FLOAT,
  /** @deprecated — removed in P5. Alias of `base`. */
  sm: SHADOW_BASE,
  /** @deprecated — removed in P5. Alias of `card`. */
  md: SHADOW_CARD,
  /** @deprecated — removed in P5. Alias of `float`. */
  lg: SHADOW_FLOAT,
} as const;

export const theme = { palette, derived, colors, gradients, fonts, typography, radii, spacing, shadows } as const;
export type AppTheme = typeof theme;
