import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Image } from "expo-image";
import { Gift, Heart } from "lucide-react-native";
import { Txt, colors as brand, fonts, radii } from "@/components/ui";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Confetti, Ribbons } from "@/components/reveal/Particles";
import { getInviteForReveal, recordAnswer, recordRsvp, recordView, type RevealData } from "@/lib/db";
import { fetchRevealPhotos } from "@/lib/api";
import { getThemeById, gradientStops, themes } from "@/lib/themes";

export default function SurpriseReveal() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const canGoBack = router.canGoBack();
  const [data, setData] = useState<RevealData | null>(null);
  const [state, setState] = useState<"loading" | "locked" | "open" | "notfound">("loading");
  const [reduced, setReduced] = useState(false);
  // photo id → signed URL, fetched from the mobile BFF (private bucket). Empty
  // when no backend is configured — the polaroids then show themed placeholders.
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const viewedRef = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!slug) return;
      const d = await getInviteForReveal(slug);
      if (!active) return;
      if (!d) {
        setState("notfound");
        return;
      }
      setData(d);
      setState("locked");
      // Best-effort: fetch signed photo URLs so the polaroids show real images.
      if (d.photos.length > 0) {
        const signed = await fetchRevealPhotos(slug);
        if (active && signed) {
          setPhotoUrls(Object.fromEntries(signed.photos.map((p) => [p.id, p.url])));
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  const onReveal = useCallback(() => {
    if (!data) return;
    if (!viewedRef.current) {
      viewedRef.current = true;
      recordView(data.invite.id).catch(() => {});
    }
    if (!reduced) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setState("open");
  }, [data, reduced]);

  const theme = getThemeById(data?.invite.theme ?? "") ?? themes[0];
  const stops = gradientStops(theme);
  const onDark = theme.colors.text.startsWith("#F") || theme.colors.text.startsWith("#f");
  const textColor = theme.colors.text;

  if (state === "loading") {
    return (
      <View style={{ flex: 1, backgroundColor: brand.charcoal, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={brand.goldLight} />
      </View>
    );
  }

  if (state === "notfound" || !data) {
    return (
      <LinearGradient colors={[brand.charcoal, "#1a1417"]} style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 }}>
        <Txt style={{ fontSize: 44 }}>🎈</Txt>
        <Txt style={{ fontFamily: fonts.heading, fontSize: 24, color: "#fff", textAlign: "center" }}>
          This surprise has drifted away
        </Txt>
        <Txt style={{ fontFamily: fonts.body, color: "rgba(255,255,255,0.7)", textAlign: "center" }}>
          The link may have expired or been closed by its creator.
        </Txt>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={stops as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      {/* Only shown when this reveal was opened from inside the app (preview).
          Real recipients arriving via a link have no history → no chrome. */}
      {canGoBack && (
        <View style={{ position: "absolute", top: insets.top, left: 0, right: 0, zIndex: 50 }} pointerEvents="box-none">
          <ScreenHeader variant="back" onDark />
        </View>
      )}
      {state === "locked" ? (
        <LockedView invite={data.invite} theme={theme} textColor={textColor} reduced={reduced} onReveal={onReveal} />
      ) : (
        <OpenView data={data} theme={theme} textColor={textColor} onDark={onDark} reduced={reduced} photoUrls={photoUrls} />
      )}
    </LinearGradient>
  );
}

// ---------------------------------------------------------------------------
// Locked — ambient ribbons + pulsing gift + "tap to reveal"
// ---------------------------------------------------------------------------
function LockedView({
  invite,
  theme,
  textColor,
  reduced,
  onReveal,
}: {
  invite: RevealData["invite"];
  theme: ReturnType<typeof getThemeById> & {};
  textColor: string;
  reduced: boolean;
  onReveal: () => void;
}) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (reduced) return;
    pulse.value = withRepeat(withSequence(withTiming(1.06, { duration: 900 }), withTiming(1, { duration: 900 })), -1, true);
  }, [pulse, reduced]);
  const giftStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 28 }}>
      <Ribbons colors={[theme!.colors.accent, theme!.colors.accentLight, "#E8D5A8"]} reduced={reduced} />
      <Animated.View entering={FadeInDown.duration(500)} style={{ alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Txt style={{ fontFamily: fonts.hand, fontSize: 22, color: theme!.colors.accent }}>a little something</Txt>
        <Txt style={{ fontFamily: fonts.heading, fontSize: 28, color: textColor, textAlign: "center" }}>{invite.title}</Txt>
      </Animated.View>

      <Animated.View style={[{ marginVertical: 24 }, giftStyle]}>
        <LinearGradient colors={[theme!.colors.accentLight, theme!.colors.accent]} style={{ width: 128, height: 128, borderRadius: 28, alignItems: "center", justifyContent: "center" }}>
          <Gift size={58} color="#fff" strokeWidth={1.6} />
        </LinearGradient>
      </Animated.View>

      <Pressable onPress={onReveal} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.96 : 1 }], marginTop: 8 })}>
        <View style={{ backgroundColor: "#fff", paddingHorizontal: 28, paddingVertical: 15, borderRadius: radii.pill, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Heart size={18} color={theme!.colors.accent} fill={theme!.colors.accent} />
          <Txt style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: brand.charcoal }}>Tap to reveal</Txt>
        </View>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Open — confetti burst, message, polaroids, question, RSVP, contributions
// ---------------------------------------------------------------------------
function OpenView({
  data,
  theme,
  textColor,
  onDark,
  reduced,
  photoUrls,
}: {
  data: RevealData;
  theme: NonNullable<ReturnType<typeof getThemeById>>;
  textColor: string;
  onDark: boolean;
  reduced: boolean;
  photoUrls: Record<string, string>;
}) {
  const { invite, photos, questions, contributions } = data;
  const [rsvped, setRsvped] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <Confetti run theme={theme} reduced={reduced} />
      <ScrollView contentContainerStyle={{ padding: 26, paddingTop: 72, gap: 22, alignItems: "center" }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={reduced ? FadeIn : FadeInDown.duration(600)} style={{ alignItems: "center", gap: 10 }}>
          <Txt style={{ fontFamily: fonts.hand, fontSize: 22, color: theme.colors.accent }}>tadaaaa ✨</Txt>
          <Txt style={{ fontFamily: fonts.heading, fontSize: 32, color: textColor, textAlign: "center" }}>{invite.title}</Txt>
        </Animated.View>

        <Animated.View entering={reduced ? FadeIn : FadeInDown.delay(200).duration(600)}>
          <Txt style={{ fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: textColor, textAlign: "center", opacity: 0.92 }}>
            {invite.message}
          </Txt>
        </Animated.View>

        {photos.length > 0 && (
          <Animated.View entering={reduced ? FadeIn : FadeInDown.delay(350).duration(600)} style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 4 }}>
            {photos.map((p, i) => (
              <Polaroid key={p.id} caption={p.caption} rotation={(p.rotation_deg ?? 0) || (i % 2 === 0 ? -3 : 3)} theme={theme} imageUrl={photoUrls[p.id]} />
            ))}
          </Animated.View>
        )}

        {questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            question={q}
            enableDodge={!!invite.enable_dodge_no}
            theme={theme}
            textColor={textColor}
            reduced={reduced}
            onAnswer={(ans) => recordAnswer(invite.id, q.id, ans).catch(() => {})}
          />
        ))}

        <Animated.View entering={reduced ? FadeIn : FadeInDown.delay(500).duration(600)} style={{ width: "100%", alignItems: "center", marginTop: 6 }}>
          {rsvped ? (
            <Txt style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: textColor }}>💛 Thanks — they'll know you're in!</Txt>
          ) : (
            <Pressable
              onPress={async () => {
                if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                setRsvped(true);
                try { await recordRsvp(invite.id); } catch { /* dedup / offline — still show thanks */ }
              }}
              style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
            >
              <LinearGradient colors={[theme.colors.accentLight, theme.colors.accent]} style={{ paddingHorizontal: 30, paddingVertical: 15, borderRadius: radii.pill, flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Heart size={18} color="#fff" fill="#fff" />
                <Txt style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: "#fff" }}>Count me in!</Txt>
              </LinearGradient>
            </Pressable>
          )}
        </Animated.View>

        {contributions.length > 0 && (
          <View style={{ width: "100%", gap: 10, marginTop: 10 }}>
            <Txt style={{ fontFamily: fonts.heading, fontSize: 18, color: textColor, textAlign: "center" }}>Notes from everyone</Txt>
            {contributions.map((c) => (
              <View key={c.id} style={{ backgroundColor: onDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.7)", borderRadius: radii.lg, padding: 14 }}>
                <Txt style={{ fontFamily: fonts.hand, fontSize: 16, color: textColor }}>{c.contributor_name}</Txt>
                {c.message ? <Txt style={{ fontFamily: fonts.body, fontSize: 13, color: textColor, opacity: 0.9, marginTop: 2 }}>{c.message}</Txt> : null}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 20 }} />
        <Txt style={{ fontFamily: fonts.body, fontSize: 11, color: textColor, opacity: 0.5 }}>Made with TaDaaaa</Txt>
      </ScrollView>
    </View>
  );
}

function Polaroid({ caption, rotation, theme, imageUrl }: { caption: string; rotation: number; theme: NonNullable<ReturnType<typeof getThemeById>>; imageUrl?: string }) {
  // Photo binaries live in a private bucket; the mobile BFF supplies signed URLs
  // when a backend is configured. Without one, the polaroid frame + caption
  // still convey the moment (graceful, honest degrade — no broken image icons).
  return (
    <View style={{ backgroundColor: "#fff", padding: 7, paddingBottom: 18, borderRadius: 5, transform: [{ rotate: `${rotation}deg` }], shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: 120, height: 120, borderRadius: 3 }}
          contentFit="cover"
          transition={300}
        />
      ) : (
        <LinearGradient colors={[theme.colors.accentLight, theme.colors.accent]} style={{ width: 120, height: 120, borderRadius: 3, alignItems: "center", justifyContent: "center" }}>
          <Heart size={26} color="rgba(255,255,255,0.85)" />
        </LinearGradient>
      )}
      {caption ? <Txt style={{ fontFamily: fonts.hand, fontSize: 14, textAlign: "center", marginTop: 5, color: brand.charcoal }}>{caption}</Txt> : null}
    </View>
  );
}

function QuestionCard({
  question,
  enableDodge,
  theme,
  textColor,
  reduced,
  onAnswer,
}: {
  question: RevealData["questions"][number];
  enableDodge: boolean;
  theme: NonNullable<ReturnType<typeof getThemeById>>;
  textColor: string;
  reduced: boolean;
  onAnswer: (answer: boolean) => void;
}) {
  const [answered, setAnswered] = useState<null | boolean>(null);
  const noX = useSharedValue(0);
  const noY = useSharedValue(0);

  const noStyle = useAnimatedStyle(() => ({ transform: [{ translateX: noX.value }, { translateY: noY.value }] }));

  function dodge() {
    if (reduced) return; // reduced-motion: don't run away — accessible No.
    noX.value = withSpring((Math.random() - 0.5) * 180, { stiffness: 300, damping: 14 });
    noY.value = withSpring((Math.random() - 0.5) * 80, { stiffness: 300, damping: 14 });
  }

  if (answered !== null) {
    return (
      <Animated.View entering={FadeIn} style={{ alignItems: "center", gap: 6 }}>
        <Txt style={{ fontFamily: fonts.heading, fontSize: 20, color: textColor, textAlign: "center" }}>{question.question_text}</Txt>
        <Txt style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: theme.colors.accent }}>
          You said {answered ? (question.yes_label || "Yes") : (question.no_label || "No")} 💌
        </Txt>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={reduced ? FadeIn : FadeInDown.delay(420).duration(600)} style={{ alignItems: "center", gap: 14, width: "100%" }}>
      <Txt style={{ fontFamily: fonts.heading, fontSize: 22, color: textColor, textAlign: "center" }}>{question.question_text}</Txt>
      <View style={{ flexDirection: "row", gap: 14, alignItems: "center", justifyContent: "center" }}>
        <Pressable onPress={() => { setAnswered(true); onAnswer(true); }} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.96 : 1 }] })}>
          <LinearGradient colors={[theme.colors.accentLight, theme.colors.accent]} style={{ paddingHorizontal: 28, paddingVertical: 14, borderRadius: radii.pill }}>
            <Txt style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: "#fff" }}>{question.yes_label || "Yes"}</Txt>
          </LinearGradient>
        </Pressable>
        <Animated.View style={noStyle}>
          <Pressable
            onPress={() => { if (!enableDodge) { setAnswered(false); onAnswer(false); } }}
            onPressIn={() => enableDodge && dodge()}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.96 : 1 }] })}
          >
            <View style={{ paddingHorizontal: 28, paddingVertical: 14, borderRadius: radii.pill, backgroundColor: "rgba(255,255,255,0.85)" }}>
              <Txt style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: brand.charcoal }}>{question.no_label || "No"}</Txt>
            </View>
          </Pressable>
        </Animated.View>
      </View>
    </Animated.View>
  );
}
