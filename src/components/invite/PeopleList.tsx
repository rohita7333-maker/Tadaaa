import { View } from "react-native";
import { formatDistanceToNow } from "date-fns";
import { Card, Txt, colors, spacing } from "@/components/ui";
import type { Tables } from "@/lib/database.types";
import type { InviteContribution } from "@/lib/db";

type Rsvp = Tables<"invite_rsvps">;

/** Name + relative time rows for who has responded to the invite. */
export function RsvpList({ rsvps }: { rsvps: Rsvp[] }) {
  if (rsvps.length === 0) {
    return (
      <Card>
        <Txt variant="body" muted style={{ textAlign: "center" }}>
          No responses yet — share the link to get things moving.
        </Txt>
      </Card>
    );
  }
  return (
    <Card style={{ gap: spacing.md }}>
      {rsvps.map((r, i) => (
        <View
          key={r.id}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: i === 0 ? 0 : spacing.md,
            borderTopWidth: i === 0 ? 0 : 1,
            borderTopColor: colors.hair,
          }}
        >
          <Txt variant="title">{r.name?.trim() || "Someone"}</Txt>
          <Txt variant="body" muted style={{ fontSize: 12 }}>
            {safeRelativeTime(r.responded_at)}
          </Txt>
        </View>
      ))}
    </Card>
  );
}

/** Contributor name + message rows (photo memories / notes left on the invite). */
export function ContributionList({ items }: { items: InviteContribution[] }) {
  if (items.length === 0) {
    return (
      <Card>
        <Txt variant="body" muted style={{ textAlign: "center" }}>
          No contributions yet.
        </Txt>
      </Card>
    );
  }
  return (
    <Card style={{ gap: spacing.md }}>
      {items.map((c, i) => (
        <View
          key={c.id}
          style={{
            gap: 4,
            paddingTop: i === 0 ? 0 : spacing.md,
            borderTopWidth: i === 0 ? 0 : 1,
            borderTopColor: colors.hair,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Txt variant="title">{c.contributor_name?.trim() || "Someone"}</Txt>
            <Txt variant="body" muted style={{ fontSize: 12 }}>
              {safeRelativeTime(c.created_at)}
            </Txt>
          </View>
          {c.message ? (
            <Txt variant="body" muted>{c.message}</Txt>
          ) : null}
          {!c.approved ? (
            <Txt variant="label" style={{ color: colors.goldChipText, fontSize: 10.5, marginTop: 2 }}>
              Pending approval
            </Txt>
          ) : null}
        </View>
      ))}
    </Card>
  );
}

function safeRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return formatDistanceToNow(date, { addSuffix: true });
}
