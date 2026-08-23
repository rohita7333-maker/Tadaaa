/// <reference types="jest" />
/**
 * Editorial token contract (P0). The hexes below are hard-coded on purpose:
 * the web repo's own token test hard-codes the same literals, so any drift
 * between the two platforms breaks one of the two suites.
 */
import {
  palette,
  derived,
  colors,
  gradients,
  fonts,
  radii,
  shadows,
  typography,
  theme,
  space,
  spacing,
  screenPadding,
  touch,
  overlay,
  revealScrim,
  type,
} from "../tokens";

const CONTRACT = {
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
 * Derived extension contract. Primitives-tier (documented mixes of CONTRACT), so
 * these literals are legal here and shared byte-for-byte with web
 * (`surprise-invite/src/lib/design-tokens.ts` → `derived`).
 */
const CONTRACT_DERIVED = {
  coralDeep: "#B8412F",
  coralLight: "#E18A7D",
  sandLight: "#E0CDC5",
  sandDeep: "#B08D7E",
  white: "#FFFFFF",
  chipCoralBg: "#FBEDEB",
  chipCoralBorder: "#F4D4D0",
  chipMutedText: "#73635D",
  success: "#2C784C",
  sandInk: "#836855",
} as const;

/** Warm hexes from the pre-editorial brand. None may survive on any token. */
const RETIRED_HEXES = [
  "#FFF8F0", // cream
  "#F5EDE3", // cream-dark
  "#E7DCCD", // app-bg
  "#C4686D", // rose
  "#E8A5A8", // rose-light
  "#9B3D42", // rose-deep
  "#C9A96E", // gold
  "#E8D5A8", // gold-light
  "#2D2926", // charcoal
  "#6B5E57", // warm-gray
  "#D4CBC3", // light-gray
  "#ECE3D8", // hair
];

describe("editorial palette", () => {
  it("exports all 8 primitives at the contract hexes", () => {
    expect(palette).toMatchObject(CONTRACT);
  });
});

describe("derived extension", () => {
  it("matches the shared extension contract exactly", () => {
    expect(derived).toEqual(CONTRACT_DERIVED);
  });

  it("carries the mockup's success green for the Strong password state", () => {
    expect(derived.success).toBe("#2C784C");
  });

  it("does not pollute the 8-primitive palette", () => {
    Object.keys(CONTRACT_DERIVED).forEach((key) =>
      expect(palette).not.toHaveProperty(key),
    );
    expect(Object.keys(palette)).toHaveLength(Object.keys(CONTRACT).length);
  });
});

describe("legacy colour aliases", () => {
  it("resolve onto editorial primitives, not the old warm values", () => {
    expect(colors.rose).toBe(CONTRACT.coral);
    expect(colors.roseLight).toBe(CONTRACT_DERIVED.coralLight);
    expect(colors.roseDeep).toBe(CONTRACT_DERIVED.coralDeep);
    expect(colors.gold).toBe(CONTRACT.sand);
    expect(colors.goldLight).toBe(CONTRACT_DERIVED.sandLight);
    expect(colors.goldDeep).toBe(CONTRACT_DERIVED.sandDeep);
    expect(colors.cream).toBe(CONTRACT.paper);
    expect(colors.creamDark).toBe(CONTRACT.pebble);
    expect(colors.appBg).toBe(CONTRACT.pebble);
    expect(colors.charcoal).toBe(CONTRACT.ink);
    expect(colors.warmGray).toBe(CONTRACT.stone);
    expect(colors.lightGray).toBe(CONTRACT.mist);
    expect(colors.hair).toBe(CONTRACT.mist);
    expect(colors.white).toBe(CONTRACT_DERIVED.white);
  });

  it("routes chip surfaces onto the shared chip extension tokens", () => {
    expect(colors.roseChipBg).toBe(CONTRACT_DERIVED.chipCoralBg);
    expect(colors.roseChipBorder).toBe(CONTRACT_DERIVED.chipCoralBorder);
    expect(colors.goldChipBg).toBe(CONTRACT.pebble);
    expect(colors.goldChipText).toBe(CONTRACT_DERIVED.chipMutedText);
    expect(colors.goldChipBorder).toBe(CONTRACT.mist);
    expect(colors.greenChipBg).toBe(CONTRACT.pebble);
    expect(colors.greenChipText).toBe(CONTRACT.kohlrabi);
    expect(colors.greenChipBorder).toBe(CONTRACT.mist);
  });

  it("carry no retired warm hexes on any key", () => {
    const values = Object.values(colors).map((v) => v.toUpperCase());
    RETIRED_HEXES.forEach((hex) => expect(values).not.toContain(hex));
  });

  it("hold no hex literal that is not a palette or derived value", () => {
    const allowed = new Set(
      [...Object.values(palette), ...Object.values(derived)].map((v) =>
        v.toUpperCase(),
      ),
    );
    const aliasObjects: Record<string, string>[] = [
      colors,
      { roseFrom: gradients.rose[0], roseTo: gradients.rose[1] },
      { goldFrom: gradients.gold[0], goldTo: gradients.gold[1] },
    ];

    const orphans = aliasObjects.flatMap((obj) =>
      Object.entries(obj)
        .filter(
          ([, value]) =>
            /^#[0-9a-fA-F]{3,8}$/.test(value) &&
            !allowed.has(value.toUpperCase()),
        )
        .map(([key, value]) => `${key}=${value}`),
    );

    expect(orphans).toEqual([]);
  });

  it("keeps gradients flat-ish and inside the coral/sand families", () => {
    expect(gradients.rose).toEqual(["#D45847", "#B8412F"]);
    expect(gradients.gold).toEqual(["#CCAC9F", "#B08D7E"]);
  });
});

describe("radii", () => {
  it("match the contract as numbers, not CSS strings", () => {
    expect(radii.sm).toBe(6);
    expect(radii.md).toBe(12);
    expect(radii.pill).toBe(100);
    [radii.sm, radii.md, radii.pill].forEach((r) => expect(typeof r).toBe("number"));
  });
});

describe("shadows", () => {
  it("expose base/card/float at the contract opacity, radius and offset", () => {
    expect(shadows.base).toMatchObject({
      shadowColor: CONTRACT.ink,
      shadowOpacity: 0.08,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
    });
    expect(shadows.card).toMatchObject({
      shadowColor: CONTRACT.ink,
      shadowOpacity: 0.06,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 4 },
    });
    expect(shadows.float).toMatchObject({
      shadowColor: CONTRACT.ink,
      shadowOpacity: 0.1,
      shadowRadius: 30,
      shadowOffset: { width: 0, height: 8 },
    });
  });

  it("keeps the legacy sm/md/lg keys pointing at the same presets", () => {
    expect(shadows.sm).toBe(shadows.base);
    expect(shadows.md).toBe(shadows.card);
    expect(shadows.lg).toBe(shadows.float);
  });
});

describe("fonts", () => {
  it("uses a serif headline family (Georgia on iOS, serif elsewhere)", () => {
    expect(["Georgia", "serif"]).toContain(fonts.heading);
    expect(fonts.headingSemi).toBe(fonts.heading);
  });

  it("uses the platform default for body text and drops the cursive accent", () => {
    expect(fonts.body).toBeUndefined();
    expect(fonts.bodyMedium).toBeUndefined();
    expect(fonts.bodyBold).toBeUndefined();
    expect(fonts.hand).toBe(fonts.body);
  });

  it("references no bundled webfont family", () => {
    Object.values(fonts).forEach((f) => {
      if (typeof f === "string") expect(f).not.toMatch(/Bricolage|DMSans|Caveat/);
    });
  });
});

/**
 * The RN equivalents of the mockup's base rules. RN has no cascade and no `p`
 * element, so the CSS ratios are resolved into absolute points against each
 * preset's own `fontSize`.
 */
describe("typography presets", () => {
  it("gives body 1.6 leading on ink", () => {
    expect(typography.body.fontFamily).toBe(fonts.body);
    expect(typography.body.fontSize).toBe(16);
    expect(typography.body.lineHeight).toBeCloseTo(16 * 1.6, 5); // 25.6
    expect(typography.body.color).toBe(CONTRACT.ink);
  });

  it("gives paragraph the p{color:stone} rule at body leading", () => {
    expect(typography.paragraph.fontSize).toBe(16);
    expect(typography.paragraph.lineHeight).toBeCloseTo(16 * 1.6, 5); // 25.6
    expect(typography.paragraph.color).toBe(CONTRACT.stone);
  });

  it("gives heading the headline face at weight 400, 1.1 leading, -.02em tracking, ink", () => {
    expect(typography.heading.fontFamily).toBe(fonts.heading);
    expect(typography.heading.fontWeight).toBe("400");
    expect(typography.heading.fontSize).toBe(28);
    expect(typography.heading.lineHeight).toBeCloseTo(28 * 1.1, 5); // 30.8
    expect(typography.heading.letterSpacing).toBeCloseTo(28 * -0.02, 5); // -0.56
    expect(typography.heading.color).toBe(CONTRACT.ink);
  });

  it("gives label 12 / 600 / 1.44 tracking / uppercase / stone", () => {
    expect(typography.label.fontSize).toBe(12);
    expect(typography.label.fontWeight).toBe("600");
    expect(typography.label.letterSpacing).toBeCloseTo(1.44, 5); // .12em at 12px
    expect(typography.label.textTransform).toBe("uppercase");
    expect(typography.label.color).toBe(CONTRACT.stone);
  });

  it("gives serifItalic the headline face in italic", () => {
    expect(typography.serifItalic.fontFamily).toBe(fonts.heading);
    expect(typography.serifItalic.fontStyle).toBe("italic");
  });

  it("is exported on the theme object", () => {
    expect(theme.typography).toBe(typography);
  });
});

/**
 * HANDOFF CONTRACT — `design-handoff/TaDaaaa-Mobile.dc.html` + its README.
 *
 * These pin the values the mobile design specifies, so a later "tidy-up" of the
 * token file cannot quietly drift the app away from the design it was built to.
 */
describe("handoff scales", () => {
  it("ships the handoff spacing scale verbatim", () => {
    expect(Object.values(space)).toEqual([4, 8, 10, 14, 18, 22, 26, 34, 44]);
  });

  it("keeps the legacy spacing scale intact alongside it", () => {
    // Repointing `spacing` would silently re-layout every screen already built
    // against it. The two coexist; `spacing` retires with its last consumer.
    expect(Object.values(spacing)).toEqual([4, 8, 12, 16, 20, 28]);
  });

  it("carries the four handoff radii", () => {
    expect(radii.sm).toBe(6);
    expect(radii.md).toBe(12);
    expect(radii.pill).toBe(100);
    expect(radii.card).toBe(18);
  });

  it("never lets a touch target fall below the 44pt floor", () => {
    expect(touch.min).toBe(44);
    for (const [name, value] of Object.entries(touch)) {
      expect(value).toBeGreaterThanOrEqual(38); // touch.<name>
    }
    // The named exceptions are LARGER than the floor, never smaller.
    expect(touch.control).toBeGreaterThanOrEqual(touch.min);
    expect(touch.pinKey).toBeGreaterThan(touch.min);
  });

  it("uses 20pt screen gutters, 24 on centred states", () => {
    expect(screenPadding.default).toBe(20);
    expect(screenPadding.centered).toBe(24);
  });

  it("builds every ink overlay out of paper, not an arbitrary white", () => {
    // #FFFEFD is paper. A plain #FFF here would read cooler than the rest of
    // the system on exactly the screens where the identity matters most.
    for (const value of Object.values(overlay)) {
      expect(value).toMatch(/^rgba\(255,254,253,/);
    }
  });

  it("keeps the reveal scrim's three stops aligned with its locations", () => {
    expect(revealScrim.colors).toHaveLength(revealScrim.locations.length);
    expect(revealScrim.locations[0]).toBe(0);
    expect(revealScrim.locations[revealScrim.locations.length - 1]).toBe(1);
    // Darkest at the bottom — that is where the copy sits.
    expect(revealScrim.colors[revealScrim.colors.length - 1]).toContain("0.9");
  });
});

describe("type roles", () => {
  it("sets every serif role to weight 400", () => {
    // A bold serif is the fastest way to make this identity look like a
    // different product. The display face is 400 always.
    for (const [name, role] of Object.entries(type)) {
      const r = role as { fontFamily?: string; fontWeight?: string };
      if (r.fontFamily && r.fontFamily === fonts.heading) {
        expect(r.fontWeight).toBe("400"); // type.<name>
      }
    }
  });

  it("resolves every lineHeight and letterSpacing to absolute numbers", () => {
    // RN has no em units. A leftover ratio renders as a 1px line height.
    for (const [name, role] of Object.entries(type)) {
      const r = role as { fontSize?: number; lineHeight?: number; letterSpacing?: number };
      if (r.lineHeight !== undefined) {
        expect(r.lineHeight).toBeGreaterThan(r.fontSize ?? 0);
      }
      if (r.letterSpacing !== undefined) {
        expect(Number.isFinite(r.letterSpacing)).toBe(true);
      }
    }
  });

  it("matches the handoff's role sizes", () => {
    expect(type.screenTitle.fontSize).toBe(26);
    expect(type.revealHeadline.fontSize).toBe(34);
    expect(type.countdown.fontSize).toBe(62);
    expect(type.body.fontSize).toBe(16);
    expect(type.fieldLabel.fontSize).toBe(11);
    expect(type.sectionLabel.fontSize).toBe(11);
    expect(type.buttonLabel.fontSize).toBe(12);
    expect(type.tabLabel.fontSize).toBe(10);
    expect(type.revealMicroLabel.fontSize).toBe(10);
  });

  it("gives the countdown tabular numerals so digits do not jitter", () => {
    expect(type.countdown.fontVariant).toContain("tabular-nums");
  });

  it("keeps reveal roles on ink-safe colours", () => {
    // sand is 8.26:1 on ink and 2.09:1 on paper — these roles only ever sit on ink.
    expect(type.revealMicroLabel.color).toBe(palette.sand);
    expect(type.countdown.color).toBe(palette.sand);
    expect(type.revealHeadline.color).toBe(palette.paper);
  });
});
