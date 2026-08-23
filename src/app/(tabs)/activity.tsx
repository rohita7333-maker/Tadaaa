/**
 * B4 — Activity + moderation.
 *
 * Frame anatomy: a title row with a coral "Mark all read" · the
 * coral-bordered moderation card at the TOP ("moderation lives at the top of
 * Activity rather than in its own tab — approving is a reaction to a
 * notification, not a destination") · then notifications grouped under Today
 * and Earlier, unread rows carrying an 8px coral dot and ink text, read rows no
 * dot and stone text.
 *
 * DEVIATION — the pre-handoff screen grouped by SURPRISE and offered
 * views/RSVPs/answers filter chips. The frame does neither: it is one recency
 * list. Both are dropped to match it. Per-surprise history is still reachable —
 * every row deep-links to its surprise, and B2 carries that surprise's own
 * numbers.
 *
 * READ STATE IS LOCAL — see `lib/activity-read.ts` for why there is no column.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { EdEmpty, derived, palette } from "@/components/editorial";
import { ModerationCard } from "@/components/handoff";
import { useAuth } from "@/providers/AuthProvider";
import { getActivityRows } from "@/lib/db";
import {
  ACTIVITY_FEED_CAP,
  buildActivityFeed,
  describeActivity,
  type ActivityEvent,
  type InviteMeta,
} from "@/lib/activity-feed";
import {
  groupByRecency,
  isUnread,
  markAllRead,
  moderationLine,
  readLastReadAt,
  relativeAge,
} from "@/lib/activity-read";
import {
  getOwnerContributions,
  moderateContribution,
  partitionByModeration,
  type OwnerContribution,
} from "@/lib/contributions";
import { radii, space, touch, type } from "@/theme/tokens";

/** One pending contribution, plus which surprise it belongs to. */
interface PendingItem extends OwnerContribution {
  inviteId: string;
  inviteTitle: string;
}

/**
 * `get_owner_contributions` is per-invite, so this fans out. Capped because a
 * creator with fifty live surprises should not pay fifty round trips to render
 * one card — the newest surprises are the ones with anything waiting.
 */
const MODERATION_INVITE_SCAN = 10;

export default function Activity() {
  const { user } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [invites, setInvites] = useState<InviteMeta[]>([]);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [lastReadAt, setLastReadAt] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    readLastReadAt().then(setLastReadAt);
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    const rows = await getActivityRows(user.id);
    setInvites(rows.invites);
    setEvents(
      buildActivityFeed({
        views: rows.views,
        rsvps: rows.rsvps,
        answers: rows.answers,
        questions: rows.questions,
        ownedInviteIds: rows.invites.map((inv) => inv.id),
      })
    );

    const scanned = rows.invites.slice(0, MODERATION_INVITE_SCAN);
    const perInvite = await Promise.all(
      scanned.map(async (inv) => {
        const all = await getOwnerContributions(inv.id);
        return partitionByModeration(all).pending.map((c) => ({
          ...c,
          inviteId: inv.id,
          inviteTitle: inv.title,
        }));
      })
    );
    setPending(perInvite.flat());
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const groups = useMemo(
    () => groupByRecency(events.map((e) => ({ ...e, at: e.at }))),
    [events]
  );
  const unreadCount = useMemo(
    () => events.filter((e) => isUnread(e.at, lastReadAt)).length,
    [events, lastReadAt]
  );

  const top = pending[0] ?? null;

  async function moderate(id: string, status: "approved" | "rejected") {
    setBusy(true);
    try {
      await moderateContribution(id, status);
      // Drop it locally first: the queue is the point of this card, and a
      // full refetch before the row disappears reads as a stuck button.
      setPending((p) => p.filter((c) => c.id !== id));
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: palette.paper }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingTop: 6,
          paddingBottom: 12,
        }}
      >
        <Text style={type.screenTitle}>Activity</Text>
        {unreadCount > 0 ? (
          <Pressable
            onPress={async () => {
              const now = Date.now();
              await markAllRead(now);
              setLastReadAt(now);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Mark all ${unreadCount} as read`}
            hitSlop={10}
          >
            <Text
              style={{
                ...type.buttonLabel,
                letterSpacing: 12 * 0.06,
                // coralDeep: plain coral is 3.94:1 on paper and this is 12px.
                color: derived.coralDeep,
              }}
            >
              Mark all read
            </Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={palette.coral}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        {top ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: palette.coral,
              borderRadius: radii.md,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 12,
                gap: 12,
              }}
            >
              <Text style={{ ...type.sectionLabel, color: derived.coralDeep }}>Needs you</Text>
              <Text style={{ ...type.bodySecondary, fontSize: 12 }} numberOfLines={1}>
                {top.inviteTitle}
              </Text>
            </View>

            <Text
              style={{
                ...type.screenTitle,
                fontSize: 17,
                lineHeight: 17 * 1.55,
                fontStyle: "italic",
                marginBottom: 6,
              }}
            >
              “{top.message}”
            </Text>
            <Text style={{ ...type.bodySecondary, marginBottom: 14 }}>
              {moderationLine({
                name: top.name,
                photoCount: top.photoUrl ? 1 : 0,
                createdAt: top.createdAt ?? new Date().toISOString(),
              })}
            </Text>

            <View style={{ flexDirection: "row", gap: 9 }}>
              <ModerationAction
                label="Reject"
                disabled={busy}
                onPress={() => moderate(top.id, "rejected")}
              />
              <ModerationAction
                label="Approve"
                filled
                disabled={busy}
                onPress={() => moderate(top.id, "approved")}
              />
            </View>

            {pending.length > 1 ? (
              <Text style={{ ...type.bodySecondary, fontSize: 12, marginTop: 10 }}>
                {pending.length - 1} more waiting
              </Text>
            ) : null}
          </View>
        ) : null}

        {events.length === 0 ? (
          <EdEmpty>
            Share a surprise link and every open, RSVP and answer shows up here — your own
            previews never count.
          </EdEmpty>
        ) : null}

        {groups.map((group) => (
          <View key={group.title}>
            <Text style={{ ...type.sectionLabel, marginTop: 16, marginBottom: 6 }}>
              {group.title}
            </Text>
            {group.items.map((event) => {
              const unread = isUnread(event.at, lastReadAt);
              const invite = invites.find((i) => i.id === event.inviteId);
              return (
                <Pressable
                  key={event.id}
                  onPress={() => invite && router.push(`/invite/${invite.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`${describeActivity(event)}. ${relativeAge(event.at)}.${
                    unread ? " Unread." : ""
                  }`}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    gap: 12,
                    paddingVertical: 13,
                    borderBottomWidth: 1,
                    borderBottomColor: palette.mist,
                    minHeight: touch.min,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      marginTop: 6,
                      backgroundColor: unread ? palette.coral : "transparent",
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        ...type.body,
                        fontSize: 15,
                        lineHeight: 15 * 1.45,
                        color: unread ? palette.ink : palette.stone,
                      }}
                    >
                      {describeActivity(event)}
                    </Text>
                    <Text style={{ ...type.bodySecondary, fontSize: 12, marginTop: 3 }}>
                      {relativeAge(event.at)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}

        {events.length === ACTIVITY_FEED_CAP ? (
          <View style={{ marginTop: space.x5 }}>
            <EdEmpty>
              Showing your {ACTIVITY_FEED_CAP} most recent moments. Open a surprise for its full
              history.
            </EdEmpty>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Frame B4's 50/50 Reject / Approve split, 44px tall. */
function ModerationAction({
  label,
  filled,
  disabled,
  onPress,
}: {
  label: string;
  filled?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: touch.min,
        borderRadius: radii.pill,
        backgroundColor: filled ? palette.ink : "transparent",
        borderWidth: filled ? 0 : 1,
        borderColor: palette.mist,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
      })}
    >
      <Text
        style={{
          ...type.buttonLabel,
          letterSpacing: 12 * 0.06,
          color: filled ? palette.paper : palette.ink,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export { ModerationCard };
