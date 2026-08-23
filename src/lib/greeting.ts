/**
 * The dashboard greeting, ported from web's `Greeting` component
 * (`surprise-invite/src/components/dashboard/Greeting.tsx`), which renders
 * "Good {morning|afternoon|evening}, {name}".
 *
 * Web needs `useSyncExternalStore` there because a server render would report
 * UTC and greet half the world wrongly. React Native only ever renders on the
 * device, so the reader's clock is simply the clock — but the thresholds and
 * the wording must stay identical, which is what this module and its test pin.
 */
export function timeOfDay(hour: number): "morning" | "afternoon" | "evening" {
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export function greeting(name: string | undefined, hour: number): string {
  return `Good ${timeOfDay(hour)}${name ? `, ${name}` : ""}`;
}
