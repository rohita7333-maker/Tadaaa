---
name: TaDaaaa Landing Page Fixes (May 2026)
description: Landing page UX improvements — navbar, intro animation, hero spacing, mobile fix, stats wiring
type: project
---

## Changes Made (May 16-17, 2026)

1. **Navbar** — `src/components/landing/Navbar.tsx` NEW. Sticky transparent→solid on scroll. Logo + How it works + Pricing links + Sign in/Sign up buttons. Mobile hamburger with AnimatePresence dropdown. Sign Up button has rose glow shadow.

2. **Hero spacing** — `src/components/landing/Hero.tsx` changed from min-h-screen py-24 → min-h-[85vh] pt-20 pb-16.

3. **Preview card** — Center card changed from static div → Link to /surprise/test demo. Button text "Tap to Open" → "Try the demo". Rose glow shadow, ring, hover lift.

4. **Smooth scroll** — `globals.css` added `html { scroll-behavior: smooth; }` for anchor links.

5. **CraftingIntro animation** — `src/components/landing/CraftingIntro.tsx` NEW. 3s polaroid-assembling intro. Plays once per session (sessionStorage). prefers-reduced-motion skips. Skip button added.

6. **LandingShell** — `src/components/landing/LandingShell.tsx` NEW. Client wrapper managing intro state.

7. **Mobile floating cards** — Hidden on mobile (md:block/md:flex) to prevent overlap on small screens.

8. **Stats wiring** — Hero stats now pull real surprise count from Supabase via server-side query in page.tsx. Shows "2+" for small counts, "12.4k+" for large.

9. **UI refinements** — Enhanced card shadows with rose tint, better polaroid depth, stats cards with glass-morphism background.

**Why:** User reported 5 UX issues on landing page. All fixed + extra polish applied.

**How to apply:** These are the baseline landing page components. Future changes should maintain the warm cream/rose palette and animation patterns established here.
