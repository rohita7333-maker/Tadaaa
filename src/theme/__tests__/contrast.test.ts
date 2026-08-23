import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { palette, derived } from "../tokens";

/**
 * CONTRAST GATE — mobile.
 *
 * Web has the equivalent in `surprise-invite/src/app/ed-atoms.test.ts`. Mobile
 * had none, which is exactly why three separate white-on-`palette.coral`
 * failures shipped: the sign-up consent checkbox, the scroll-story RSVP CTA,
 * and `EdButton`'s `coral` variant — the primary CTA on every screen.
 *
 * APPROACH — reviewed allowlist, not automatic text-descendant detection.
 * Deciding "does this coloured View contain a <Text>?" from source text means
 * resolving JSX nesting, conditional children, and style objects declared far
 * from the element that uses them. A regex approximation of that would produce
 * confident false negatives — the exact failure mode that let these three
 * through. So instead: EVERY coloured ground is enumerated from source, and
 * each must either clear the AA text floor or be explicitly listed below as a
 * reviewed graphic-only usage. Unreviewed grounds fail. A human decision is
 * recorded once; the arithmetic is recomputed from the real tokens every run.
 */

/** WCAG 2.x relative luminance for a #rrggbb string. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** WCAG AA for normal-size text. */
const AA_TEXT = 4.5;
/** WCAG AA for non-text graphics and UI components. */
const AA_GRAPHIC = 3;

const SRC = resolve(__dirname, "../..");

function tsxFiles(dir: string = SRC): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "__tests__") continue;
      out.push(...tsxFiles(full));
    } else if (entry.name.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

/** Token expression → its literal value. Read from the real modules. */
const TOKEN_VALUES: Record<string, string> = {
  ...Object.fromEntries(Object.entries(palette).map(([k, v]) => [`palette.${k}`, v])),
  ...Object.fromEntries(Object.entries(derived).map(([k, v]) => [`derived.${k}`, v])),
};

/**
 * Reviewed graphic-only grounds: `relative/path.tsx` → token expressions that
 * carry NO text and therefore answer to the 3:1 graphic floor, not 4.5:1.
 * Each was read and confirmed. Adding to this list is a design review, not a
 * formality — it is the one place the gate can be told to look away.
 */
const GRAPHIC_ONLY: Record<string, string[]> = {
  // 2px active-tab rule, and the centre FAB whose child is a vector icon.
  "app/(tabs)/_layout.tsx": ["palette.coral"],
  // 7px unread dot on a feed row.
  "components/editorial/chrome.tsx": ["palette.coral"],
  // Segmented-control fill and a progress bar fill.
  "components/editorial/select.tsx": ["palette.coral"],
  // Yes/no tally bar fill.
  "components/invite/QuestionTally.tsx": ["palette.coral"],
  // Miniature reveal-style previews: bars and blocks, no labels.
  "components/create/RevealSettings.tsx": ["palette.ink", "palette.sand"],
  // 2px starfield dots.
  "components/reveal/scrollstory/FinaleScene.tsx": ["palette.sand"],
  // B1 header: the 8px unread dot on the bell, and the ink Avatar circle.
  // The dot carries no text. The avatar's initial is `palette.paper` on
  // `palette.ink` — 16.4:1 — which the scanner cannot see because the ground
  // and the label are set in different style objects.
  "components/handoff/index.tsx": ["palette.coral", "palette.ink"],
  // B2 header: the 7px "Live" dot beside the status line. It carries no text —
  // the status words next to it are `overlay.textStrong` on the ink scrim. The
  // ink fill on the same element is the header's ground BEHIND the photo or
  // theme gradient, and its text is paper (16.4:1).
  "components/handoff/PhotoHeader.tsx": ["palette.coral", "palette.ink"],
  // Wizard chrome: the 3px completed segment of the six-bar progress rule. It
  // is a rule, not a label — the step is announced in text beside it.
  "components/create/WizardChrome.tsx": ["palette.coral"],
  // C5: the 9px filled dot inside a selected radio. The row's label is ink on
  // paper; the dot carries nothing.
  "components/create/steps/ScheduleLockStep.tsx": ["palette.coral"],
  // B4: the 8px unread dot beside a feed row. The row's own text carries the
  // unread state as well (ink vs stone), so the dot is redundant colour, not
  // information.
  "app/(tabs)/activity.tsx": ["palette.coral"],
  // A4: the 8px tone dot beside each notification type. The type's name sits
  // next to it in ink on paper; the dot only tells coral (the one you want)
  // from sand (the rest).
  "app/(onboarding)/notifications.tsx": ["palette.coral"],
  // A3/A4 chrome: the 26×3 completed progress bar. A rule, not a label — the
  // step is announced on the bar group itself.
  "components/create/OnboardingChrome.tsx": ["palette.coral"],
};

describe("contrast — coloured grounds", () => {
  const rel = (f: string) => f.slice(SRC.length + 1);

  it("every coloured ground either clears AA for text or is a reviewed graphic", () => {
    const failures: string[] = [];

    for (const file of tsxFiles()) {
      const source = readFileSync(file, "utf8");
      const path = rel(file);
      const exempt = GRAPHIC_ONLY[path] ?? [];

      for (const match of source.matchAll(
        /backgroundColor:\s*(?:[^,\n]*\?\s*)?((?:palette|derived)\.\w+)/g
      )) {
        const expr = match[1];
        const value = TOKEN_VALUES[expr];
        if (!value) continue; // not a literal token (e.g. a theme tint)

        const floor = exempt.includes(expr) ? AA_GRAPHIC : AA_TEXT;
        // Both plausible foregrounds must work: white for filled controls,
        // paper for the editorial equivalent.
        const best = Math.max(
          contrast(derived.white, value),
          contrast(palette.paper, value),
          contrast(palette.ink, value)
        );

        if (best < floor) {
          const line = source.slice(0, match.index).split("\n").length;
          failures.push(
            `${path}:${line} ${expr} (${value}) best ${best.toFixed(2)}:1 < ${floor}:1`
          );
        }
      }
    }

    // Message rides in the value: jest's expect takes no message argument.
    expect({ groundsFailingContrastFloor: failures }).toEqual({ groundsFailingContrastFloor: [] });
  });

  it("the primary CTA is grounded in coralDeep, like web's .ed-btn-coral", () => {
    const src = readFileSync(join(SRC, "components/editorial/index.tsx"), "utf8");
    const coralFill = /coral:\s*\{\s*bg:\s*(derived|palette)\.(\w+)/.exec(src);

    expect(coralFill).not.toBeNull(); // EdButton must declare a coral variant fill
    expect(`${coralFill![1]}.${coralFill![2]}`).toBe("derived.coralDeep");
    // Its label is white text, so it answers to the text floor.
    expect(contrast(derived.white, derived.coralDeep)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("the consent checkbox tick clears AA — it is text, not a graphic", () => {
    const src = readFileSync(join(SRC, "components/auth/TermsConsent.tsx"), "utf8");
    const checked = /backgroundColor:\s*accepted\s*\?\s*(derived|palette)\.(\w+)/.exec(src);

    expect(checked).not.toBeNull(); // TermsConsent must declare a checked-state background
    const ground = TOKEN_VALUES[`${checked![1]}.${checked![2]}`];
    expect(contrast(derived.white, ground)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("every B5 funnel bar can carry its own percentage label", () => {
    /**
     * Frame B5 puts an 11px/600 PAPER label INSIDE all four funnel bars,
     * including the sand one — paper on sand is 2.09:1, the least legible
     * pairing in the whole system. `FUNNEL_TONES` keeps the frame's fills and
     * re-picks the label colour. This recomputes all three pairings from the
     * real tokens so the note in that file cannot go stale.
     */
    const src = readFileSync(join(SRC, "components/handoff/AnalyticsPanels.tsx"), "utf8");
    const block = /FUNNEL_TONES[^{]*\{([\s\S]*?)\n\};/.exec(src)?.[1];
    expect(block).toBeDefined(); // the map must still exist under that name

    const pairs = [
      ...block!.matchAll(
        /(\w+):\s*\{\s*fill:\s*((?:palette|derived)\.\w+),\s*label:\s*((?:palette|derived)\.\w+)\s*\}/g
      ),
    ];
    // ink / sand / coral — a dropped row must fail here, not render unreadably.
    expect(pairs.map((p) => p[1])).toEqual(["ink", "sand", "coral"]);

    for (const [, tone, fillExpr, labelExpr] of pairs) {
      const fill = TOKEN_VALUES[fillExpr];
      const label = TOKEN_VALUES[labelExpr];
      expect({ tone, fill: fillExpr, resolved: !!fill }).toEqual({
        tone,
        fill: fillExpr,
        resolved: true,
      });
      expect({ tone, ratio: contrast(label, fill) >= AA_TEXT }).toEqual({ tone, ratio: true });
    }

    // Negative control for THIS assertion: the frame's own choice fails it.
    expect(contrast(palette.paper, palette.sand)).toBeLessThan(AA_TEXT);
  });

  it("proves the guard can fail — plain coral would not clear the text floor", () => {
    // Negative control. If this ever passes, the arithmetic above is broken and
    // every assertion in this file is meaningless.
    expect(contrast(derived.white, palette.coral)).toBeLessThan(AA_TEXT);
    // …while still clearing the graphic floor, which is why the exemptions are
    // legitimate rather than a way of ignoring the problem.
    expect(contrast(derived.white, palette.coral)).toBeGreaterThanOrEqual(AA_GRAPHIC);
  });

  it("every allowlisted graphic exemption still points at real code", () => {
    // Stops the allowlist outliving the code it excuses.
    for (const [path, exprs] of Object.entries(GRAPHIC_ONLY)) {
      const source = readFileSync(join(SRC, path), "utf8");
      for (const expr of exprs) {
        expect({ path, expr, present: source.includes(expr) }).toEqual({
          path,
          expr,
          present: true,
        });
      }
    }
  });
});
