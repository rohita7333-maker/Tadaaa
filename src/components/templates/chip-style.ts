/** Shared toggle-chip classNames — used by every filter rail control
 * (occasion, price, style) so they read as one consistent facet group. */
export function chipClassName(isActive: boolean): string {
  return `rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#3E6B5C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF9F6] ${
    isActive
      ? "bg-[#1A1B18] text-white"
      : "border border-[#E9E6DF]/60 bg-white text-[#6F6E68] hover:border-[#3E6B5C]/60 hover:text-[#1A1B18]"
  }`;
}
