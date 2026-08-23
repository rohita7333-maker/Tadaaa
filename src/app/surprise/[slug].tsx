import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, ActivityIndicator, ScrollView, Share, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Body, EdButton, Heading, palette } from "@/components/editorial";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EditorialBurst } from "@/components/reveal/Particles";
import { REVEAL_GROUND, RevealTopBar } from "@/components/reveal/chrome";
import TapClosed from "@/components/reveal/TapClosed";
import CountdownClosed from "@/components/reveal/CountdownClosed";
import RevealOpen from "@/components/reveal/RevealOpen";
import {
  getInviteForReveal,
  getRevealBundle,
  getRevealUnavailableReason,
  recordView,
  type RevealData,
} from "@/lib/db";
import { fetchRevealPhotos } from "@/lib/api";
import { getOccasionById, getThemeById, themes } from "@/lib/themes";
import { ENV } from "@/lib/env";
import {
  REVEAL_UNAVAILABLE_COPY,
  type RevealUnavailableReason,
} from "@/lib/reveal-unavailable";
import ScrollStoryReveal from "@/components/reveal/scrollstory/ScrollStoryReveal";
import LettersReveal from "@/components/reveal/LettersReveal";
import PinGate from "@/components/reveal/PinGate";
import type { LetterRow } from "@/lib/letters";
import { getPinMeta, type PinMeta } from "@/lib/pin-gate";
import WaitingRoom from "@/components/reveal/WaitingRoom";
import { inviteToStoryConfig } from "@/lib/scroll-story/from-invite";

export default function SurpriseReveal() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const canGoBack = router.canGoBack();
  const [data, setData] = useState<RevealData | null>(null);
  const [state, setState] = useState<"loading" | "locked" | "open" | "notfound">("loading");
  // Which of web's three unavailable branches applies. Resolved only when the
  // load fails, so the happy path costs nothing.
  const [unavailable, setUnavailable] = useState<RevealUnavailableReason>("missing");
  const [reduced, setReduced] = useState(false);
  // photo id → signed URL, fetched from the mobile BFF (private bucket). Empty
  // when no backend is configured — the tiles then show themed placeholders.
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const viewedRef = useRef(false);
  /**
   * D1 — the PIN the recipient cleared, held for the rest of the session.
   *
   * It is not a convenience. Since 2026-08-17 the reveal readers WITHHOLD a
   * PIN-locked invite server-side, so this string is what every subsequent
   * read is authorised by: the payload itself, the letters shelf, and each
   * letter open. Null means either "no PIN on this surprise" or "not yet
   * cleared" — `pinMeta.hasPin` distinguishes them.
   */
  const [pin, setPin] = useState<string | null>(null);
  const pinCleared = pin !== null;
  /** Carried from the gated bundle so D5 needs no second round trip. */
  const [letters, setLetters] = useState<LetterRow[] | undefined>(undefined);
  /** null until the PIN meta read lands, so the reveal never flashes first. */
  const [pinMeta, setPinMeta] = useState<PinMeta | null>(null);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
  }, []);

  const loadPhotos = useCallback(
    async (count: number) => {
      if (count === 0) return;
      const signed = await fetchRevealPhotos(slug);
      if (signed) setPhotoUrls(Object.fromEntries(signed.photos.map((p) => [p.id, p.url])));
    },
    [slug]
  );

  useEffect(() => {
    let active = true;
    (async () => {
      if (!slug) return;

      // PIN meta FIRST, and nothing else until it lands. The old order fetched
      // the payload and then asked whether it should have — which was harmless
      // only because the readers were leaking it anyway. They no longer are, so
      // a locked slug now legitimately returns nothing from `getInviteForReveal`
      // and would have classified as "this surprise has closed".
      const meta = await getPinMeta(slug);
      if (!active) return;
      setPinMeta(meta);

      if (meta.hasPin) {
        // Stop here. The keypad renders with no payload behind it; the bundle
        // is fetched by `onUnlocked` once the server has verified four digits.
        setState("locked");
        return;
      }

      const d = await getInviteForReveal(slug);
      if (!active) return;
      if (!d) {
        const reason = await getRevealUnavailableReason(slug);
        if (!active) return;
        setUnavailable(reason);
        setState("notfound");
        return;
      }
      setData(d);
      setState("locked");
      await loadPhotos(d.photos.length);
    })();
    return () => {
      active = false;
    };
  }, [slug, loadPhotos]);

  /** Called by PinGate with the PIN the SERVER accepted. */
  const onUnlocked = useCallback(
    async (verified: string) => {
      const bundle = await getRevealBundle(slug, verified);
      if (!bundle.ok) {
        // verify_invite_pin said yes and the bundle said no: the only ways that
        // happens are the limiter tripping or the surprise expiring between the
        // two calls. Neither is "wrong PIN", so do not send them back to the
        // keypad with a lie.
        setUnavailable("missing");
        setState("notfound");
        return;
      }
      setData(bundle.data);
      setLetters(bundle.letters);
      setPin(verified);
      await loadPhotos(bundle.data.photos.length);
    },
    [slug, loadPhotos]
  );

  const onReveal = useCallback(() => {
    if (!data) return;
    if (!viewedRef.current) {
      viewedRef.current = true;
      recordView(data.invite.id).catch(() => {});
    }
    if (!reduced) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setState("open");
  }, [data, reduced]);

  const onShare = useCallback(() => {
    const url = `${ENV.siteUrl || "https://tadaaaa.app"}/surprise/${slug}`;
    Share.share({ message: url, url }).catch(() => {});
  }, [slug]);

  const theme = getThemeById(data?.invite.theme ?? "") ?? themes[0];
  const occasionMicroLabel = data
    ? (getOccasionById(data.invite.occasion_type)?.label ?? "A SURPRISE").toUpperCase()
    : undefined;

  if (state === "loading") {
    return (
      <View style={[REVEAL_GROUND, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={palette.sand} />
      </View>
    );
  }

  /**
   * D1 — PIN gate. Sits in FRONT of every reveal style AND in front of the
   * unavailable screen: whatever the invite renders, a locked one renders the
   * keypad first.
   *
   * This branch used to sit BELOW the `state === "notfound" || !data` guard.
   * That was correct until the `pin_gates_reveal_content_server_side`
   * migration, which is precisely the point at which a locked invite stopped
   * carrying a payload: `data` is null by design while the keypad is up, so the
   * `|| !data` guard swallowed the gate and EVERY PIN-locked link rendered
   * "This surprise doesn't exist". Seen doing exactly that. The keypad needs no
   * payload — `pin_hint` comes from `get_invite_pin_meta`, and the bundle is
   * fetched by `onUnlocked` once the server has verified four digits.
   */
  if (pinMeta?.hasPin && !pinCleared) {
    return (
      <PinGate
        slug={slug}
        microLabel={occasionMicroLabel}
        hint={pinMeta.hint}
        onUnlocked={onUnlocked}
        onBack={canGoBack ? () => router.back() : undefined}
      />
    );
  }

  if (state === "notfound" || !data) {
    const copy = REVEAL_UNAVAILABLE_COPY[unavailable];
    return (
      <View
        style={[
          REVEAL_GROUND,
          { alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 10 },
        ]}
      >
        <Heading size={26} style={{ color: palette.paper, textAlign: "center" }}>
          {copy.heading}
        </Heading>
        <Body size={14} style={{ color: palette.sand, textAlign: "center" }}>
          {copy.body}
        </Body>
        {copy.cta ? (
          <EdButton
            title={copy.cta}
            variant="coral"
            style={{ marginTop: 14 }}
            onPress={() => router.replace("/(tabs)")}
          />
        ) : null}
      </View>
    );
  }

  /**
   * D7 — Waiting room. A surprise opened before its moment shows the wait.
   *
   * Two reveal types are excluded because they own their own countdown, and
   * sending them here replaces a designed scene with a holding page:
   *
   *   scroll_story — its countdown is the finale scene.
   *   countdown    — frame D4 IS a countdown. This exclusion was missing, so
   *                  `CountdownClosed` could only ever be reached with a target
   *                  already in the past, which fires `onReachZero` on its
   *                  first tick. Frame D4 was unreachable: every countdown
   *                  reveal rendered D7 instead. Found by trying to open one.
   */
  const scheduledFor = data.invite.countdown_date;
  if (
    scheduledFor &&
    data.invite.reveal_type !== "scroll_story" &&
    data.invite.reveal_type !== "countdown" &&
    new Date(scheduledFor) > new Date()
  ) {
    return (
      <WaitingRoom
        slug={data.invite.slug}
        title={data.invite.title}
        targetIso={scheduledFor}
        onReachZero={() => setState("locked")}
        onBack={canGoBack ? () => router.back() : undefined}
      />
    );
  }

  // D5 — Open-when letters. Added as a FOURTH branch above the existing three,
  // which stay byte-identical: the same discipline that kept tap/countdown safe
  // when scroll_story landed. Letters own their own chrome (ink list, paper
  // letter) so nothing below this line had to change shape.
  if (data.invite.reveal_type === "letters") {
    return (
      /* No `fromName`: the mobile reveal payload carries no creator name —
         `get_invite_by_slug` deliberately omits creator_id and every field that
         could identify them. The signature is omitted rather than faked. */
      <LettersReveal
        slug={data.invite.slug}
        recipientName={data.invite.title}
        pin={pin}
        initialLetters={letters}
        onBack={canGoBack ? () => router.back() : undefined}
      />
    );
  }

  // Scroll Story owns its own chrome and choreography end to end — untouched.
  if (data.invite.reveal_type === "scroll_story") {
    const storyConfig = {
      ...inviteToStoryConfig(
        {
          slug: data.invite.slug,
          title: data.invite.title,
          message: data.invite.message,
          countdown_date: data.invite.countdown_date,
          is_paid: data.invite.is_paid ?? undefined,
          photos: [],
          // `events` jsonb exists on the live row but not yet in the generated
          // types; read it untyped and let toStoryEvents validate it.
          events: data.invite.events,
        },
        { occasionLabel: getOccasionById(data.invite.occasion_type)?.label }
      ),
      // Signed photo URLs resolve asynchronously (mobile-only extra step vs.
      // web) — mapped separately so photos without a resolved URL still
      // render as themed placeholders with their caption, instead of being
      // dropped or shown with a broken/empty src.
      photos: data.photos.map((p) => ({
        src: photoUrls[p.id],
        caption: p.caption ?? undefined,
        rotationDeg: p.rotation_deg ?? undefined,
      })),
    };
    return (
      <View style={{ flex: 1 }}>
        {canGoBack && (
          <View style={{ position: "absolute", top: insets.top, left: 0, right: 0, zIndex: 50 }} pointerEvents="box-none">
            <ScreenHeader variant="back" onDark />
          </View>
        )}
        <ScrollStoryReveal
          config={storyConfig}
          inviteId={data.invite.id}
          slug={data.invite.slug}
          pin={pin}
        />
      </View>
    );
  }

  const isCountdown = data.invite.reveal_type === "countdown" && !!data.invite.countdown_date;
  const occasionLabel = getOccasionById(data.invite.occasion_type)?.label;

  return (
    <View style={REVEAL_GROUND}>
      {/* `.rtop` — only shown when the reveal was opened from inside the app.
          A recipient arriving on the link has no history, so no close control. */}
      <RevealTopBar onClose={canGoBack ? () => router.back() : undefined} onShare={onShare} />

      {state === "locked" ? (
        isCountdown ? (
          <CountdownClosed
            targetIso={data.invite.countdown_date as string}
            title={data.invite.title}
            message={data.invite.message}
            onReachZero={onReveal}
            slug={data.invite.slug}
          />
        ) : (
          <TapClosed title={data.invite.title} theme={theme} reduced={reduced} onOpen={onReveal} />
        )
      ) : (
        <View style={{ flex: 1 }}>
          {/* `burst()` — palette-only, and a no-op under reduce-motion. */}
          <EditorialBurst run reduced={reduced} />
          <ScrollView
            contentContainerStyle={{ paddingTop: insets.top + 76, paddingBottom: insets.bottom + 32 }}
            showsVerticalScrollIndicator={false}
          >
            <RevealOpen
              data={data}
              photoUrls={photoUrls}
              reduced={reduced}
              occasionLabel={occasionLabel}
            />
          </ScrollView>
        </View>
      )}
    </View>
  );
}
