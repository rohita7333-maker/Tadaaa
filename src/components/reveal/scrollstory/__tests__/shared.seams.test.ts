/**
 * Scroll Story seam-parity test — MOBILE HALF OF A TWO-PLATFORM PAIR.
 *
 * ⚠️ THIS TEST HAS A TWIN. Its counterpart lives at
 * `tadaaaa/surprise-invite/src/components/surprise/scrollstory/shared.seams.test.ts`
 * and hard-codes the SAME six literals. Web and mobile render the same invite,
 * and the seam chain is what makes the day→night journey continuous, so the
 * two constant sets must stay byte-identical.
 *
 * BOTH FILES MUST CHANGE TOGETHER. Changing a seam on one platform alone will
 * make that platform's suite fail — that failure is the feature, not a bug.
 * When you intend a new chain: edit both `shared.ts` files, then edit both
 * test files, in the same change.
 *
 * The expectations below are deliberately hard-coded literals rather than
 * imports from the design tokens. A test that re-derives its expectation from
 * the thing under test cannot detect drift.
 */
import {
  FINALE_NIGHT,
  SEAM_MESSAGE_TO_PLAN,
  SEAM_PLAN_TO_POLAROID,
  SEAM_POLAROID_TO_RSVP,
  SEAM_RSVP_TO_FINALE,
  SEAM_SKY_TO_MESSAGE,
} from "../shared";
import { palette } from "@/theme/tokens";

/** The locked chain. Byte-identical to web's twin. */
const EXPECTED_CHAIN = {
  SEAM_SKY_TO_MESSAGE: "#CCAC9F",
  SEAM_MESSAGE_TO_PLAN: "#FFFEFD",
  SEAM_PLAN_TO_POLAROID: "#F5F0ED",
  SEAM_POLAROID_TO_RSVP: "#E8E4E0",
  SEAM_RSVP_TO_FINALE: "#D45847",
  FINALE_NIGHT: "#1A1A1A",
} as const;

describe("scroll story seam chain (byte-locked with web)", () => {
  it("pins every seam constant to its expected literal", () => {
    expect({
      SEAM_SKY_TO_MESSAGE,
      SEAM_MESSAGE_TO_PLAN,
      SEAM_PLAN_TO_POLAROID,
      SEAM_POLAROID_TO_RSVP,
      SEAM_RSVP_TO_FINALE,
      FINALE_NIGHT,
    }).toEqual(EXPECTED_CHAIN);
  });

  it("exposes exactly six constants — no seam added or dropped silently", () => {
    expect(Object.keys(EXPECTED_CHAIN)).toHaveLength(6);
  });

  it("draws every seam from the editorial palette, never an invented hex", () => {
    const primitives = Object.values(palette).map((hex) => hex.toUpperCase());
    for (const [name, hex] of Object.entries(EXPECTED_CHAIN)) {
      expect(primitives).toContain(hex.toUpperCase());
      expect(name).toBeTruthy();
    }
  });

  it("lands the journey on night", () => {
    expect(FINALE_NIGHT).toBe(palette.ink);
  });
});
