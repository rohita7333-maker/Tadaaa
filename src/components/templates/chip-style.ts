/** Shared toggle-chip classNames — used by every filter rail control
 * (occasion, price, style) so they read as one consistent facet group. */
export function chipClassName(isActive: boolean): string {
  return `rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#C4686D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFF8F0] ${
    isActive
      ? "bg-[#2D2926] text-white"
      : "border border-[#D4CBC3]/60 bg-white text-[#6B5E57] hover:border-[#C4686D]/60 hover:text-[#2D2926]"
  }`;
}
