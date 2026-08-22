/**
 * Landing `<main>` landmark.
 *
 * The session-gated CraftingIntro overlay was removed here: the editorial
 * mockup opens straight on the hero, and a full-screen overlay covered the
 * `<h1>` LCP element for 2.6s. `CraftingIntro.tsx` is now unused.
 */
export default function LandingShell({ children }: { children: React.ReactNode }) {
  return <main>{children}</main>;
}
