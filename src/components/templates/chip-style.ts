/** Shared toggle-chip classNames — used by every filter rail control
 * (occasion, price, style) so they read as one consistent facet group.
 *
 * Editorial layer: the shipped `.ed-chip` / `.ed-chip-on` atoms carry the whole
 * look (pill, mist border, ink-on-active, hover + :active states). The focus
 * ring is the global `:focus-visible` coral outline in globals.css — no
 * per-component ring. */
export function chipClassName(isActive: boolean): string {
  return isActive ? "ed-chip ed-chip-on" : "ed-chip";
}

/** Wrapper for a row of chips — mockup `.chips` (tadaaaa-editorial.html:282). */
export const CHIP_ROW_CLASS = "ed-chiprow !mb-0";
