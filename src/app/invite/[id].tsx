import { useCallback, useState } from "react";
import { Alert, RefreshControl, ScrollView, Share, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { ChevronLeft, Copy, Eye, Heart, Share2 } from "lucide-react-native";
import { Button, Card, Chip, Txt, colors, radii, spacing } from "@/components/ui";
import { StatCard } from "@/components/invite/StatCard";
import { QuestionTally, type QuestionTallyData } from "@/components/invite/QuestionTally";
import { RsvpList, ContributionList } from "@/components/invite/PeopleList";
import { inviteStatus } from "@/components/InviteRow";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { ENV } from "@/lib/env";
import { getShareCopy } from "@/lib/share-copy";
import { getThemeById, getOccasionById, gradientStops } from "@/lib/themes";
import {
  getRsvps,
  getContributions,
  setInviteActive,
  softDeleteInvite,
  type Invite,
  type InviteContribution,
  type InviteQuestion,
} from "@/lib/db";
import type { Tables } from "@/lib/database.types";

type Rsvp = Tables<"invite_rsvps">;

interface DetailData {
  invite: Invite;
  questions: InviteQuestion[];
  tallies: QuestionTallyData[];
  rsvps: Rsvp[];
  contributions: InviteContribution[];
}

async function loadDetail(id: string): Promise<DetailData | null> {
  const [{ data: invite }, { data: questions }] = await Promise.all([
    supabase.from("invites").select("*").eq("id", id).is("deleted_at", null).maybeSingle(),
    supabase
      .from("invite_questions")
      .select("*")
      .eq("invite_id", id)
      .order("sort_order"),
  ]);
  if (!invite) return null;

  const qList = questions ?? [];
  const [rsvps, contributions, tallies] = await Promise.all([
    getRsvps(id),
    invite.accept_contributions ? getContributions(id) : Promise.resolve([]),
    Promise.all(
      qList.map(async (q): Promise<QuestionTallyData> => {
        const [{ count: yesCount }, { count: noCount }] = await Promise.all([
          supabase
            .from("invite_answers")
            .select("id", { count: "exact", head: true })
            .eq("question_id", q.id)
            .eq("answer", true),
          supabase
            .from("invite_answers")
            .select("id", { count: "exact", head: true })
            .eq("question_id", q.id)
            .eq("answer", false),
        ]);
        return {
          id: q.id,
          questionText: q.question_text,
          yesLabel: q.yes_label,
          noLabel: q.no_label,
          yesCount: yesCount ?? 0,
          noCount: noCount ?? 0,
        };
      })
    ),
  ]);

  return { invite, questions: qList, tallies, rsvps, contributions };
}

export default function InviteDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const [data, setData] = useState<DetailData | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "notfound">("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const result = await loadDetail(id);
    if (!result) {
      setState("notfound");
      return;
    }
    setData(result);
    setState("ready");
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (state === "loading") {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: colors.creamDark }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Txt variant="body" muted>Loading…</Txt>
        </View>
      </SafeAreaView>
    );
  }

  if (state === "notfound" || !data) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: colors.creamDark }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: spacing.xl }}>
          <Txt variant="h2">Not found</Txt>
          <Txt variant="body" muted style={{ textAlign: "center" }}>
            This surprise doesn't exist anymore or was deleted.
          </Txt>
          <Button title="Back" variant="outline" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const { invite, tallies, rsvps, contributions } = data;
  const theme = getThemeById(invite.theme);
  const occasion = getOccasionById(invite.occasion_type);
  const status = inviteStatus(invite);
  const stops = theme ? gradientStops(theme) : [colors.roseLight, colors.rose];
  const shareUrl = `${ENV.siteUrl}/surprise/${invite.slug}`;

  async function onShare() {
    try {
      await Share.share({
        message: getShareCopy("control", {
          title: invite.title,
          url: shareUrl,
          creatorName: profile?.full_name ?? undefined,
        }),
      });
    } catch {
      // user cancelled or share sheet failed — no-op
    }
  }

  async function onCopy() {
    await Clipboard.setStringAsync(shareUrl);
    Alert.alert("Copied", "Link copied to clipboard.");
  }

  async function onToggleActive() {
    setBusy(true);
    try {
      await setInviteActive(invite.id, !invite.is_active);
      await load();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function onDelete() {
    Alert.alert(
      "Delete this surprise?",
      "This can't be undone. The link will stop working immediately.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await softDeleteInvite(invite.id);
              router.back();
            } catch (e) {
              Alert.alert("Error", e instanceof Error ? e.message : "Something went wrong.");
              setBusy(false);
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: colors.creamDark }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.rose} />
        }
      >
        <LinearGradient
          colors={stops as [string, string, ...string[]]}
          style={{ paddingTop: spacing.md, paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Button
              title="Back"
              variant="outline"
              small
              left={<ChevronLeft size={16} color={colors.charcoal} />}
              onPress={() => router.back()}
              style={{ backgroundColor: "rgba(255,255,255,0.85)" }}
            />
            <Chip label={status.label} tone={status.tone} />
          </View>
          <View style={{ gap: 6, marginTop: spacing.sm }}>
            <Txt style={{ fontSize: 40 }}>{occasion?.emoji ?? "💌"}</Txt>
            <Txt variant="h1" numberOfLines={2}>{invite.title}</Txt>
            {invite.message ? (
              <Txt variant="body" numberOfLines={2} style={{ opacity: 0.85 }}>
                {invite.message}
              </Txt>
            ) : null}
          </View>
        </LinearGradient>

        <View style={{ padding: spacing.xl, gap: spacing.lg }}>
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <Button
              title="Share surprise"
              left={<Share2 size={16} color="#fff" />}
              onPress={onShare}
              style={{ flex: 1 }}
            />
            <Button
              title="Copy link"
              variant="outline"
              left={<Copy size={16} color={colors.charcoal} />}
              onPress={onCopy}
              style={{ flex: 1 }}
            />
          </View>
          <Txt variant="body" muted numberOfLines={1} style={{ fontSize: 12 }}>
            {shareUrl}
          </Txt>
          <Button
            title="Preview reveal"
            variant="dark"
            onPress={() => router.push(`/surprise/${invite.slug}`)}
          />

          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <StatCard icon={<Eye size={18} color={colors.rose} />} value={invite.view_count ?? 0} label="Views" />
            <StatCard icon={<Heart size={18} color={colors.rose} />} value={invite.response_count ?? 0} label="Responses" />
          </View>

          {tallies.length > 0 ? (
            <View style={{ gap: spacing.md }}>
              <Txt variant="eyebrow">answers</Txt>
              {tallies.map((q) => (
                <QuestionTally key={q.id} q={q} />
              ))}
            </View>
          ) : null}

          <View style={{ gap: spacing.md }}>
            <Txt variant="eyebrow">rsvps</Txt>
            <RsvpList rsvps={rsvps} />
          </View>

          {invite.accept_contributions ? (
            <View style={{ gap: spacing.md }}>
              <Txt variant="eyebrow">contributions</Txt>
              <ContributionList items={contributions} />
            </View>
          ) : null}

          <View style={{ gap: spacing.md, marginTop: spacing.md }}>
            <Txt variant="eyebrow">manage</Txt>
            <Button
              title={invite.is_active ? "Pause surprise" : "Resume surprise"}
              variant="outline"
              loading={busy}
              onPress={onToggleActive}
            />
            <Button title="Delete surprise" variant="outline" loading={busy} onPress={onDelete} style={{ borderColor: colors.rose }} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
