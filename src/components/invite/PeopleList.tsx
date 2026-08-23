/**
 * Who responded — RSVP and contribution lists on the invite detail screen.
 * Both render as `.setrow`-style hairline rows inside one `.panel`, matching
 * the mockup's contributors table rather than a stack of cards.
 */
import { View } from "react-native";
import { formatDistanceToNow } from "date-fns";
import {
  Body,
  EdEmpty,
  EdHairline,
  EdMeta,
  EdPanel,
  EdPill,
  palette,
} from "@/components/editorial";
import type { Tables } from "@/lib/database.types";
import type { InviteContribution } from "@/lib/db";

type Rsvp = Tables<"invite_rsvps">;

/** Name + relative time rows for who has responded to the invite. */
export function RsvpList({ rsvps }: { rsvps: Rsvp[] }) {
  if (rsvps.length === 0) {
    return (
      <EdPanel>
        {/* Web splits this into a heading and a sub
            (`components/dashboard/ResponsesModal.tsx:169-171`). */}
        <EdEmpty>No RSVPs yet. Share your invite to start collecting responses.</EdEmpty>
      </EdPanel>
    );
  }
  return (
    <EdPanel>
      {rsvps.map((r, i) => (
        <View key={r.id}>
          {i > 0 ? <EdHairline /> : null}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              paddingVertical: 12,
            }}
          >
            {/* Web names an unnamed RSVP "Guest {n}", not "Someone"
                (`components/dashboard/ResponsesModal.tsx:185`). */}
            <Body size={15} tone="ink" numberOfLines={1} style={{ flex: 1, fontWeight: "600" }}>
              {r.name?.trim() || `Guest ${i + 1}`}
            </Body>
            <EdMeta>{safeRelativeTime(r.responded_at)}</EdMeta>
          </View>
        </View>
      ))}
    </EdPanel>
  );
}

/** Contributor name + message rows (photo memories / notes left on the invite). */
export function ContributionList({ items }: { items: InviteContribution[] }) {
  if (items.length === 0) {
    return (
      <EdPanel>
        <EdEmpty>No contributions yet.</EdEmpty>
      </EdPanel>
    );
  }
  return (
    <EdPanel>
      {items.map((c, i) => (
        <View key={c.id}>
          {i > 0 ? <EdHairline /> : null}
          <View style={{ gap: 4, paddingVertical: 12 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Body size={15} tone="ink" numberOfLines={1} style={{ flex: 1, fontWeight: "600" }}>
                {c.contributor_name?.trim() || "Someone"}
              </Body>
              <EdMeta>{safeRelativeTime(c.created_at)}</EdMeta>
            </View>
            {c.message ? (
              <Body size={14}>
                {c.message}
              </Body>
            ) : null}
            {/* Moderation state reuses the pill base so it reads like a
                status, not a warning banner. */}
            {!c.approved ? (
              <View style={{ marginTop: 2 }}>
                <EdPill label="Pending approval" border={palette.sand} />
              </View>
            ) : null}
          </View>
        </View>
      ))}
    </EdPanel>
  );
}

function safeRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return formatDistanceToNow(date, { addSuffix: true });
}
