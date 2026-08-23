/**
 * B1 — Home.
 *
 * Rebuilt to the handoff frame (`design-handoff/TaDaaaa-Mobile.dc.html`,
 * `data-screen-label="B1"`): paper ground, a serif greeting beside a bell and an
 * avatar, a three-tile stat strip, the resume-draft card, then the surprise list.
 *
 * Data behaviour is UNCHANGED from what shipped — same creator-scoped
 * `getMyInvites` / `monthlyInviteCount` reads, same RSVP aggregation, same tier
 * limit. Only the composition changed, plus two additions the frame requires:
 * a Pending tile that deep-links to moderation, and the draft card.
 *
 * Deliberate deviation from the frame: thumbnails are solid theme colour, not
 * photos. Photo URLs resolve through the BFF, which is unreachable on a device
 * whose LAN address has moved — a broken image box on the first screen is worse
 * than a considered block of the invite's own theme colour.
 */
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bell } from "lucide-react-native";
import {
  Avatar,
  IconCircle,
  ResumeDraftCard,
  SectionLabel,
  StatTile,
  SurpriseRow,
  type PillTone,
} from "@/components/handoff";
import { FirstRunEmpty, SkeletonList } from "@/components/handoff/EdgeStates";
import { palette, screenPadding, space, type } from "@/theme/tokens";
import { useAuth } from "@/providers/AuthProvider";
import { getMyInvites, monthlyInviteCount, type Invite } from "@/lib/db";
import { getActiveTier, monthlyInviteLimit } from "@/lib/tier";
import { greeting } from "@/lib/greeting";
import { fetchRsvpCounts } from "@/lib/rsvp-counts";
import { deriveInviteStatus } from "@/lib/invite-status";
import { getThemeById } from "@/lib/themes";
import { readDraft, clearDraft, type StoredDraft } from "@/lib/draft";
import { syncScheduledLiveReminders } from "@/lib/push-notifications";

/** Frame B1 shows three rows before the list runs into the tab bar. */
const RECENT_LIMIT = 4;

/** Production lifecycle label -> the frame's pill vocabulary. */
const TONE_BY_STATUS: Record<string, { tone: PillTone; label: string }> = {
  live: { tone: "live", label: "Live" },
  scheduled: { tone: "scheduled", label: "Scheduled" },
  expired: { tone: "expired", label: "Expired" },
  archived: { tone: "expired", label: "Expired" },
  draft: { tone: "draft", label: "Draft" },
};

export default function Home() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [monthCount, setMonthCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [rsvpCounts, setRsvpCounts] = useState<Record<string, number>>({});
  const [draft, setDraft] = useState<StoredDraft | null>(null);
  /**
   * Frame F3: "Never a spinner for list loads." Without this the first paint
   * was an empty list that then popped into rows — indistinguishable from
   * "you have no surprises", which is the one thing F2 must not say by
   * accident.
   */
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const [list, count] = await Promise.all([
      getMyInvites(user.id),
      monthlyInviteCount(user.id),
    ]);
    setInvites(list);
    setMonthCount(count);
    // RSVPs aggregate from invite_rsvps — response_count counts ANSWERS.
    setRsvpCounts(await fetchRsvpCounts(list.map((i) => i.id)));
    setDraft(await readDraft());
    // Frame F1's SCHEDULED_LIVE, from the device rather than a server: the
    // phone already knows when each of these opens. Reconciled here because
    // this is the one place the creator's full invite list is in hand, and it
    // re-runs on every focus so a moved or deleted date cannot leave a stale
    // "it's live" alert queued.
    void syncScheduledLiveReminders(list);
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const tier = getActiveTier(profile);
  const limit = monthlyInviteLimit(tier);
  const totalViews = invites.reduce((sum, i) => sum + (i.view_count ?? 0), 0);
  const totalRsvps = Object.values(rsvpCounts).reduce((a, b) => a + b, 0);
  // Frame B1: Pending is the only number implying work, so it is the only
  // coral one and the only tile that deep-links.
  const pending = invites.reduce((sum, i) => sum + (i.response_count ?? 0), 0);

  const firstName = (profile?.full_name || user?.email || "there")
    .split(" ")[0]
    .split("@")[0];
  const liveCount = invites.filter((i) => deriveInviteStatus(i) === "live").length;
  const recent = invites.slice(0, RECENT_LIMIT);

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: palette.paper }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: space.x9 }}
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
        {/* Header — 26px serif greeting + status line, bell, avatar. */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: screenPadding.default,
            paddingTop: space.x2,
            paddingBottom: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={type.screenTitle}>{greeting(firstName, new Date().getHours())}</Text>
            <Text style={{ ...type.bodySecondary, marginTop: 2 }}>
              {liveCount > 0
                ? `${liveCount} live right now`
                : invites.length > 0
                  ? "Nothing live right now"
                  : "Nothing running yet"}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
            <IconCircle
              accessibilityLabel="Notifications"
              badge={pending > 0}
              onPress={() => router.push("/activity")}
            >
              <Bell size={17} color={palette.ink} strokeWidth={1.4} />
            </IconCircle>
            <Avatar initial={firstName.charAt(0) || "?"} onPress={() => router.push("/profile")} />
          </View>
        </View>

        <View style={{ paddingHorizontal: screenPadding.default }}>
          {/*
            Frame F2 — first run. The frame drops the stat strip and the list
            heading entirely: three zeroes above "Nothing running yet" answers
            a question nobody asked, where the frame answers the real one
            ("who is this for, and how long does it take?").

            A half-finished draft still shows its card above the empty block —
            resuming is exactly what a first-run user with a draft wants, and
            hiding it would strand the draft.
          */}
          {loading ? (
            <View style={{ marginTop: space.x2 }}>
              <SkeletonList rows={3} />
            </View>
          ) : invites.length === 0 ? (
            <>
              {draft && (
                <View style={{ marginBottom: space.x6 }}>
                  <ResumeDraftCard
                    title={draft.title ? `Half-finished: “${draft.title}”` : "Half-finished surprise"}
                    detail={draft.detail}
                    onResume={() => router.push("/create")}
                    onDiscard={async () => {
                      await clearDraft();
                      setDraft(null);
                    }}
                  />
                </View>
              )}
              <FirstRunEmpty
                onStart={() => router.push("/create")}
                onBrowseThemes={() => router.push("/themes")}
              />
            </>
          ) : (
            <>
          {/* Stat strip — Views / RSVPs / Pending. */}
          <View style={{ flexDirection: "row", gap: space.x3, marginBottom: space.x5 }}>
            <StatTile
              value={String(totalViews)}
              label="Views"
              onPress={() => router.push("/activity")}
            />
            <StatTile value={String(totalRsvps)} label="RSVPs" />
            <StatTile
              value={String(pending)}
              label="Pending"
              emphasis={pending > 0}
              onPress={() => router.push("/activity")}
              accessibilityLabel={`${pending} pending. Review them`}
            />
          </View>

          {draft && (
            <View style={{ marginBottom: space.x6 }}>
              <ResumeDraftCard
                title={draft.title ? `Half-finished: “${draft.title}”` : "Half-finished surprise"}
                detail={draft.detail}
                onResume={() => router.push("/create")}
                onDiscard={async () => {
                  await clearDraft();
                  setDraft(null);
                }}
              />
            </View>
          )}

          <SectionLabel>Your surprises</SectionLabel>

          {/* No empty branch here any more: `invites.length === 0` is handled
              above by frame F2, so a zero-length `recent` is unreachable. The
              old "No surprises yet…" line lives on in `invites.tsx`, which web
              still matches — see the parity gate for that recorded split. */}
          {recent.map((invite, i) => {
              const status = deriveInviteStatus(invite);
              const pill = TONE_BY_STATUS[status] ?? TONE_BY_STATUS.draft;
              const rsvps = rsvpCounts[invite.id] ?? 0;
              return (
                <SurpriseRow
                  key={invite.id}
                  title={invite.title}
                  tone={pill.tone}
                  pillLabel={pill.label}
                  meta={`${invite.view_count ?? 0} views · ${rsvps} RSVPs`}
                  thumbColor={getThemeById(invite.theme)?.colors.accent}
                  dimmed={pill.tone === "expired"}
                  last={i === recent.length - 1}
                  onPress={() => router.push(`/invite/${invite.id}`)}
                />
              );
          })}

          {invites.length > RECENT_LIMIT && (
            <Text
              onPress={() => router.push("/invites")}
              accessibilityRole="link"
              style={{
                ...type.bodySecondary,
                color: palette.coral,
                paddingVertical: space.x4,
              }}
            >
              See all {invites.length} surprises →
            </Text>
          )}

          {limit != null && (
            <Text style={{ ...type.bodySecondary, marginTop: space.x4 }}>
              {monthCount} of {limit} this month on your current plan.
            </Text>
          )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
