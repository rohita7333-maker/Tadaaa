/**
 * B2 — Surprise detail.
 *
 * Frame anatomy: 290px photo header with a two-stop ink gradient and 40px
 * translucent nav circles · a coral Share pill that flexes beside three 48px
 * outlined circles (QR / preview-as-recipient / edit) · a coral-bordered
 * moderation card when messages are waiting · a 3-up stat row · a settings list
 * with the 46×26 toggles · a `···` sheet holding Duplicate, Extend link, Export
 * keepsake and Delete.
 *
 * WIRING NOTE — the moderation card is not decorative. The owner-side read and
 * the approve/reject write both go through SECURITY DEFINER functions added for
 * this screen, because a live probe showed the table's own policies let a
 * creator neither SELECT nor UPDATE a pending contribution. See
 * `src/lib/contributions.ts` for that probe.
 */
import { useCallback, useState } from "react";
import { Alert, RefreshControl, ScrollView, Share, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { Pencil, Play, QrCode } from "lucide-react-native";
import { Body, EdButton, EdToast, Heading, palette } from "@/components/editorial";
import {
  CircleAction,
  ModerationCard,
  SectionLabel,
  SettingRow,
  StatTile,
} from "@/components/handoff";
import { PhotoHeader } from "@/components/handoff/PhotoHeader";
import { ActionSheet } from "@/components/handoff/Sheet";
import { QrCard } from "@/components/handoff/QrCard";
import { Sheet } from "@/components/handoff/Sheet";
import { PinLockSheet } from "@/components/handoff/PinLockSheet";
import {
  detailEyebrow,
  detailStatusLine,
  moderationSummary,
} from "@/lib/surprise-detail";
import {
  getOwnerContributions,
  moderateContribution,
  partitionByModeration,
  type OwnerContribution,
} from "@/lib/contributions";
import { deriveInviteStatus } from "@/lib/invite-status";
import { getThemeById, gradientStops, themes } from "@/lib/themes";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { ENV } from "@/lib/env";
import { getShareCopy } from "@/lib/share-copy";
import { commitPhotos, fetchRevealPhotos, signedPhotoUploadUrl } from "@/lib/api";
import { FailedUploadCard, SkeletonList } from "@/components/handoff/EdgeStates";
import {
  clearUploadsForInvite,
  entriesForInvite,
  queueSummary,
  readUploadQueue,
  type QueuedUpload,
} from "@/lib/upload-queue";
import {
  duplicateInvite,
  extendInviteLink,
  getReactionTotal,
  setInvitePin,
  setInviteContributions,
  softDeleteInvite,
  type Invite,
} from "@/lib/db";
import { buildKeepsake } from "@/lib/keepsake";
import { space } from "@/theme/tokens";

interface DetailData {
  invite: Invite;
  rsvpCount: number;
  reactionCount: number;
  contributions: OwnerContribution[];
  headerPhoto: string | null;
}

async function loadDetail(id: string): Promise<DetailData | null> {
  const { data: invite } = await supabase
    .from("invites")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!invite) return null;

  // The BFF photo fetch is NOT in this Promise.all. It used to be, and a stale
  // `EXPO_PUBLIC_API_BASE_URL` therefore held the entire screen on its loading
  // state until the OS connect timeout — seen doing exactly that. The header
  // art is decoration; the invite, its counts and its moderation queue are the
  // screen. Those render first and the photo arrives when it arrives.
  const [{ count: rsvpCount }, reactionCount, contributions] = await Promise.all([
    supabase
      .from("invite_rsvps")
      .select("id", { count: "exact", head: true })
      .eq("invite_id", id),
    getReactionTotal(invite.slug),
    getOwnerContributions(id),
  ]);

  return {
    invite,
    rsvpCount: rsvpCount ?? 0,
    reactionCount,
    contributions,
    headerPhoto: null,
  };
}

export default function InviteDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const [data, setData] = useState<DetailData | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "notfound">("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  /** Frame F3 — photos this surprise still owes, kept across launches. */
  const [failed, setFailed] = useState<QueuedUpload[]>([]);
  const [retrying, setRetrying] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const result = await loadDetail(id);
    if (!result) {
      setState("notfound");
      return;
    }
    setData(result);
    setFailed(entriesForInvite(await readUploadQueue(), id));
    setState("ready");

    // Second phase, deliberately un-awaited: the header photo upgrades the
    // screen it is already showing. `fetchRevealPhotos` swallows its own
    // errors, and api.ts now time-boxes the request, so the worst case is the
    // theme gradient staying put.
    void fetchRevealPhotos(result.invite.slug)
      .then((photos) => {
        const url = photos?.photos?.[0]?.url;
        if (url) setData((prev) => (prev ? { ...prev, headerPhoto: url } : prev));
      })
      .catch(() => {});
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
    // Frame F3: skeletons at the real content's dimensions, never a spinner —
    // and never the word "Loading…", which this screen used to show.
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.paper }}>
        <View style={{ paddingHorizontal: 20, paddingTop: space.x6 }}>
          <SkeletonList rows={4} />
        </View>
      </SafeAreaView>
    );
  }

  if (state === "notfound" || !data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.paper }}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: space.x6,
          }}
        >
          <Heading size={22}>Not found</Heading>
          <Body style={{ textAlign: "center" }}>
            This surprise doesn&apos;t exist anymore or was deleted.
          </Body>
          <EdButton title="Back" variant="line" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const { invite, rsvpCount, reactionCount, contributions, headerPhoto } = data;
  const status = deriveInviteStatus(invite);
  const shareUrl = `${ENV.siteUrl}/surprise/${invite.slug}`;
  const theme = getThemeById(invite.theme ?? "") ?? themes[0];
  const buckets = partitionByModeration(contributions);
  const moderation = moderationSummary(buckets.pending.map((c) => ({ name: c.name })));
  const failedSummary = queueSummary(failed);

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
      // user cancelled or the sheet failed — nothing to report
    }
  }

  async function guarded(work: () => Promise<void>) {
    setBusy(true);
    try {
      await work();
      await load();
    } catch (e) {
      // A failure with one button is a notification wearing a modal — web
      // uses a toast for exactly this, and the parity gate enforces it.
      setToast(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function onApproveAll() {
    await guarded(async () => {
      for (const c of buckets.pending) {
        const res = await moderateContribution(c.id, "approved");
        if (!res.ok) throw new Error("Could not approve that message.");
      }
    });
  }

  function onDelete() {
    Alert.alert(
      "Delete surprise?",
      `“${invite.title}” — its link stops working immediately, and everything on it goes with it. There is no undo.`,
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            guarded(async () => {
              await softDeleteInvite(invite.id);
              router.back();
            }),
        },
      ]
    );
  }

  /**
   * Frame F3's Retry.
   *
   * A URI that no longer resolves is DROPPED rather than retried forever: the
   * queue holds cache-directory files written by `expo-image-manipulator`, and
   * iOS reclaims that directory whenever it likes. Retrying a file the OS has
   * deleted is a card that can never be cleared.
   */
  async function onRetryUploads() {
    if (retrying || failed.length === 0) return;
    setRetrying(true);
    try {
      const uploaded: { path: string; caption: string; rotationDeg: number }[] = [];
      let stillFailing = 0;

      for (const entry of failed) {
        try {
          const { path, signedUrl } = await signedPhotoUploadUrl({
            inviteId: entry.inviteId,
            index: entry.index,
            ext: entry.ext,
          });
          const blob = await (await fetch(entry.uri)).blob();
          const put = await fetch(signedUrl, {
            method: "PUT",
            headers: { "Content-Type": entry.mimeType },
            body: blob,
          });
          if (!put.ok) throw new Error("upload failed");
          uploaded.push({ path, caption: entry.caption, rotationDeg: entry.rotationDeg });
        } catch {
          stillFailing += 1;
        }
      }

      if (uploaded.length > 0) await commitPhotos({ inviteId: invite.id, photos: uploaded });
      // Cleared either way: what did not upload this time cannot upload later
      // from a cache file, and a card the user can never dismiss is worse than
      // an honest one-line loss.
      await clearUploadsForInvite(invite.id);
      setFailed([]);
      setToast(
        stillFailing === 0
          ? "Those photos are up."
          : `${uploaded.length} uploaded. ${stillFailing} couldn't be recovered — add them again from Edit.`
      );
      await load();
    } finally {
      setRetrying(false);
    }
  }

  async function onExport() {
    const payload = buildKeepsake({
      invite,
      contributions: buckets.approved,
      rsvpCount,
      reactionCount,
      url: shareUrl,
    });
    try {
      await Share.share({ message: payload });
    } catch {
      // cancelled
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.paper }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.coral} />
        }
      >
        <PhotoHeader
          photoUri={headerPhoto}
          gradient={gradientStops(theme)}
          eyebrow={detailEyebrow(invite.occasion_type, invite.reveal_type)}
          title={invite.title}
          statusLine={detailStatusLine({
            status,
            expiresAt: invite.expires_at,
            countdownDate: invite.countdown_date,
          })}
          showLiveDot={status === "live"}
          onBack={() => router.back()}
          onMenu={() => setMenuOpen(true)}
        />

        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          {/* Action row — coral Share pill + three 48px circles. */}
          <View style={{ flexDirection: "row", gap: 9, marginBottom: space.x5 }}>
            <EdButton title="Share" onPress={onShare} style={{ flex: 1, minHeight: 48 }} />
            <CircleAction onPress={() => setQrOpen(true)} accessibilityLabel="Show QR code">
              <QrCode size={18} color={palette.ink} strokeWidth={1.4} />
            </CircleAction>
            <CircleAction
              onPress={() => router.push(`/surprise/${invite.slug}`)}
              accessibilityLabel="Preview as recipient"
            >
              <Play size={17} color={palette.ink} strokeWidth={1.4} />
            </CircleAction>
            <CircleAction
              onPress={() => router.push(`/create?editId=${invite.id}`)}
              accessibilityLabel="Edit this surprise"
            >
              <Pencil size={17} color={palette.ink} strokeWidth={1.4} />
            </CircleAction>
          </View>

          {/* Frame F3 — the failed-upload card. Only rendered when the queue
              actually holds photos for THIS surprise; a permanently visible
              "everything's fine" card is noise. */}
          {failedSummary ? (
            <View style={{ marginBottom: space.x5 }}>
              <FailedUploadCard
                title={failedSummary.title}
                detail={failedSummary.detail}
                busy={retrying}
                onRetry={onRetryUploads}
              />
            </View>
          ) : null}

          {moderation ? (
            <View style={{ marginBottom: space.x5 }}>
              <ModerationCard
                title={moderation.title}
                detail={moderation.detail}
                onPress={() => router.push("/(tabs)/activity")}
              />
            </View>
          ) : null}

          {/* Every tile opens B5. Frame B5 has no entry point of its own — it
              is reached from the numbers it explains, which is the only place
              a creator would look for them. */}
          <View style={{ flexDirection: "row", gap: space.x3, marginBottom: space.x5 }}>
            <StatTile
              value={String(invite.view_count ?? 0)}
              label="Views"
              onPress={() => router.push(`/analytics/${invite.id}`)}
              accessibilityLabel={`${invite.view_count ?? 0} views. See full analytics`}
            />
            <StatTile
              value={String(rsvpCount)}
              label="RSVPs"
              onPress={() => router.push(`/analytics/${invite.id}`)}
              accessibilityLabel={`${rsvpCount} RSVPs. See full analytics`}
            />
            <StatTile
              value={String(reactionCount)}
              label="Reacts"
              onPress={() => router.push(`/analytics/${invite.id}`)}
              accessibilityLabel={`${reactionCount} reactions. See full analytics`}
            />
          </View>

          <SectionLabel>Settings</SectionLabel>
          <SettingRow
            title="PIN lock"
            detail={
              invite.pin_hash ? "4 digits before anything shows" : "Off — the link is the only key"
            }
            value={!!invite.pin_hash}
            disabled={busy}
            onValueChange={(next) => {
              if (next) {
                setPinOpen(true);
              } else {
                guarded(async () => {
                  const res = await setInvitePin(invite.id, null, null);
                  if (!res.ok) throw new Error("Could not remove the PIN.");
                });
              }
            }}
          />
          <SettingRow
            title="Accepting contributions"
            detail="Closes when it goes live"
            value={!!invite.accept_contributions}
            disabled={busy}
            last
            onValueChange={(next) =>
              guarded(() => setInviteContributions(invite.id, next))
            }
          />

          {buckets.pending.length > 0 ? (
            <View style={{ marginTop: space.x5 }}>
              <EdButton
                title={`Approve all ${buckets.pending.length}`}
                variant="line"
                loading={busy}
                onPress={onApproveAll}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>

      <ActionSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={invite.title}
        actions={[
          {
            label: "Duplicate",
            onPress: () =>
              guarded(async () => {
                const copy = await duplicateInvite(invite.id);
                router.push(`/invite/${copy.id}`);
              }),
          },
          {
            label: "Extend link",
            onPress: () =>
              guarded(async () => {
                const until = await extendInviteLink(invite.id, 30);
                setToast(`This link now lasts until ${until}.`);
              }),
          },
          { label: "Export keepsake", onPress: onExport },
          { label: "Copy link", onPress: () => Clipboard.setStringAsync(shareUrl) },
          { label: "Delete", destructive: true, onPress: onDelete },
        ]}
      />

      <Sheet visible={qrOpen} onClose={() => setQrOpen(false)} title="Scan to open">
        <QrCard url={shareUrl} />
        <Text style={{ textAlign: "center", marginTop: space.x4, color: palette.stone }}>
          {shareUrl}
        </Text>
      </Sheet>

      {toast ? <EdToast message={toast} onDismiss={() => setToast(null)} /> : null}

      <PinLockSheet
        visible={pinOpen}
        onClose={() => setPinOpen(false)}
        onSubmit={(pin, hint) =>
          guarded(async () => {
            const res = await setInvitePin(invite.id, pin, hint);
            if (!res.ok) throw new Error("That PIN was not accepted. Use four digits.");
          })
        }
      />
    </View>
  );
}
