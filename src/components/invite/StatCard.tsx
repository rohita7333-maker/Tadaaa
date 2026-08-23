/**
 * Invite-detail metric tile — the mockup's `.stat`
 * (`tadaaaa-editorial.html` L253-256). Thin wrapper over the shared `EdStat`
 * so the detail screen and the dashboard cannot drift.
 *
 * The pre-editorial version carried a leading icon; the mockup's stat is
 * numeral-over-caption with no glyph, so `icon` is accepted and ignored
 * rather than breaking the call sites in `invite/[id].tsx`, which another
 * phase owns.
 */
import type { ReactNode } from "react";
import { EdStat } from "@/components/editorial";

export function StatCard({
  value,
  label,
}: {
  /** Accepted for call-site compatibility; the editorial stat has no glyph. */
  icon?: ReactNode;
  value: string | number;
  label: string;
}) {
  return <EdStat value={String(value)} label={label} />;
}
