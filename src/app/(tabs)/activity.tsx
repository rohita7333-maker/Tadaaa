import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatDistanceToNow } from "date-fns";
import { Eye, Heart, MessageCircle, Sparkles } from "lucide-react-native";
import { Card, Txt, colors, fonts, radii, spacing } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { getActivityRows } from "@/lib/db";
import {
  ACTIVITY_FEED_CAP,
  buildActivityFeed,
  describeActivity,
  filterByFocus,
  groupByInvite,
  type ActivityEvent,
  type ActivityFocus,
  type InviteMeta,
} from "@/lib/activity-feed";

const FOCUS_TABS: { key: ActivityFocus; label: string }[] = [
  { key: "all", label: "Everything" },
  { key: "views", label: "Opens" },
  { key: "rsvps", label: "RSVPs" },
  { key: "answers", label: "Answers" },
];

const KIND_ICON = {
  view: Eye,
  rsvp: Heart,
  answer: MessageCircle,
} as const;

const KIND_COLOR = {
  view: "#C9A96E",
  rsvp: "#C4686D",
  answer: "#6B8F71",
} as const;

/**
 * Activity — the "who" behind the Home tab's counters, mirroring the web
 * `/dashboard/activity` feed: views, RSVPs and answers merged newest-first and
 * grouped per invite. Reads are creator-scoped in db.ts and re-filtered in
 * buildActivityFeed; guest names are sanitized + capped there too.
 */
export default function Activity() {
  const { user } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [invites, setInvites] = useState<InviteMeta[]>([]);
  const [focus, setFocus] = useState<ActivityFocus>("all");
  const [refreshing, setRefreshing] = useState(false);

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
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const visible = useMemo(() => filterByFocus(events, focus), [events, focus]);
  const groups = useMemo(() => groupByInvite(visible, invites), [visible, invites]);
  const isCapped = events.length === ACTIVITY_FEED_CAP;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.creamDark }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.md, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.rose}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        <View style={{ gap: 4, marginBottom: spacing.sm }}>
          <Txt variant="eyebrow">what&apos;s happening</Txt>
          <Txt variant="h1">Activity</Txt>
        </View>

        {events.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {FOCUS_TABS.map((tab) => {
              const count =
                tab.key === "all" ? events.length : filterByFocus(events, tab.key).length;
              const active = tab.key === focus;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setFocus(tab.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${tab.label}, ${count}`}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                  style={({ pressed }) => ({
                    height: 34,
                    paddingHorizontal: 14,
                    borderRadius: radii.pill,
                    borderWidth: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    borderColor: active ? colors.rose : colors.hair,
                    backgroundColor: active ? "#FFF0EE" : "#fff",
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Txt
                    style={{
                      fontFamily: fonts.bodyBold,
                      fontSize: 12,
                      color: active ? colors.rose : colors.warmGray,
                    }}
                  >
                    {tab.label}
                  </Txt>
                  <Txt
                    style={{ fontSize: 11, color: active ? colors.rose : colors.warmGray }}
                  >
                    {count}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
        )}

        {events.length === 0 && (
          <Card style={{ alignItems: "center", gap: 10, paddingVertical: 28 }}>
            <Sparkles size={26} color={colors.rose} />
            <Txt variant="title">No activity yet</Txt>
            <Txt variant="body" muted style={{ textAlign: "center" }}>
              Share a surprise link and every open, RSVP and answer lands here. Your own
              previews never count.
            </Txt>
          </Card>
        )}

        {events.length > 0 && visible.length === 0 && (
          <Card>
            <Txt variant="body" muted style={{ textAlign: "center" }}>
              Nothing in this filter yet.
            </Txt>
          </Card>
        )}

        {groups.map((group) => (
          <Card key={group.invite.id} style={{ gap: 10 }}>
            <Pressable
              onPress={() => router.push(`/invite/${group.invite.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${group.invite.title}`}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Txt variant="title" numberOfLines={1} style={{ flex: 1 }}>
                  {group.invite.title}
                </Txt>
                <Txt variant="body" muted style={{ fontSize: 11 }}>
                  {group.events.length} {group.events.length === 1 ? "moment" : "moments"}
                </Txt>
              </View>
            </Pressable>

            <View style={{ gap: 8 }}>
              {group.events.map((event) => {
                const Icon = KIND_ICON[event.kind];
                return (
                  <View
                    key={event.id}
                    style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
                  >
                    <Icon size={15} color={KIND_COLOR[event.kind]} />
                    <Txt variant="body" numberOfLines={1} style={{ flex: 1 }}>
                      {describeActivity(event)}
                    </Txt>
                    <Txt variant="body" muted style={{ fontSize: 11 }}>
                      {formatDistanceToNow(new Date(event.at), { addSuffix: true })}
                    </Txt>
                  </View>
                );
              })}
            </View>
          </Card>
        ))}

        {isCapped && visible.length > 0 && (
          <Txt variant="body" muted style={{ textAlign: "center", fontSize: 11 }}>
            Showing your {ACTIVITY_FEED_CAP} most recent moments.
          </Txt>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
