import type { Metadata } from "next";

// The playground page below is a client component (interactive theme/mode
// switcher), so metadata can't live there directly — Next.js only reads
// `metadata` exports from Server Components. This layout is the server-side
// sibling that keeps the route out of search results now that /surprise/demo
// is the linked, production-grade reveal (see docs/superpowers/plans
// /2026-08-02-app-coherence.md, Phase W3).
export const metadata: Metadata = {
  robots: "noindex, nofollow",
};

export default function TestSurpriseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
