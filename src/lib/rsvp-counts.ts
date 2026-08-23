/**
 * RSVP counts per invite.
 *
 * `invites.response_count` is incremented by the ANSWER path, not the RSVP
 * path — web reads answers from that column and RSVPs by aggregating
 * `invite_rsvps` in a separate query
 * (`surprise-invite/src/app/dashboard/page.tsx:65-76`). Mobile was rendering
 * `response_count` under the label "RSVPs", so every row showed the answer
 * count with the wrong noun on it.
 *
 * `db.ts` is a locked module and its `invites` row type has no `rsvp_count`
 * column, so the aggregate lives here — same one-query, group-client-side shape
 * web uses.
 *
 * Supabase is imported lazily so this module stays import-safe in unit tests,
 * which have no native AsyncStorage runtime.
 */

/** Group rows into `invite_id → count`. Pure, so the grouping is testable. */
export function tallyRsvps(rows: { invite_id: string }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) {
    out[row.invite_id] = (out[row.invite_id] ?? 0) + 1;
  }
  return out;
}

export async function fetchRsvpCounts(
  inviteIds: string[]
): Promise<Record<string, number>> {
  if (inviteIds.length === 0) return {};
  const { supabase } = await import("./supabase");
  const { data } = await supabase
    .from("invite_rsvps")
    .select("invite_id")
    .in("invite_id", inviteIds);
  return tallyRsvps(data ?? []);
}
