/**
 * `.tapopen` in `tadaaaa/tadaaaa-editorial.html` — the opened surprise, shared
 * by the tap reveal and by a countdown that has reached zero.
 *
 *   .tapopen h1{color:#fff;font-size:34px}
 *   .tapopen .bd{color:rgba(255,255,254,.85);font-size:16px;line-height:1.7;max-width:340px}
 *   .masonry{columns:2} · .masonry .m{border:1px solid var(--mist)} · .mcap{background:var(--paper)}
 *   .rform + .btn-coral + .dodgezone/.btn-no
 *
 * Every call the shipped reveal made is still made here: `recordAnswer` per
 * question and `recordRsvp` once, both fire-and-forget so an offline guest
 * still sees the acknowledgement.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Pressable, Text, TextInput, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  withDelay,
  withTiming,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { derived, EdButton, fonts, palette, radii } from "@/components/editorial";
import { RevealWatermark } from "@/components/reveal/chrome";
import { recordAnswer, recordRsvp, type RevealData } from "@/lib/db";
import {
  INITIAL_DODGE_STATE,
  hasGivenUp,
  nextDodge,
  shouldDodge,
  type DodgeState,
} from "@/lib/dodging-no";

const BODY_MAX_WIDTH = 340;
/** Web's `.rform` input caps at `maxLength={80}`. */
const RSVP_NAME_MAX_LENGTH = 80;
const MASONRY_MAX_WIDTH = 440;

type Photo = RevealData["photos"][number];

export default function RevealOpen({
  data,
  photoUrls,
  reduced,
  occasionLabel,
  onCreateOwn,
  preview = false,
}: {
  data: RevealData;
  photoUrls: Record<string, string>;
  reduced: boolean;
  occasionLabel?: string;
  onCreateOwn?: () => void;
  /**
   * C6's "Play full preview" renders this against a draft that has no row in
   * the database yet, so `invite.id` is a placeholder. Every write is skipped
   * rather than fired at an id that does not exist. Absent everywhere else, so
   * the shipped reveal is byte-identical.
   */
  preview?: boolean;
}) {
  const { invite, photos, questions, contributions } = data;
  const [rsvped, setRsvped] = useState(false);
  /** Web's `.rform` field. `recordRsvp` has always taken a name — mobile just
   * never asked for one, so every RSVP landed anonymous in the owner's list. */
  const [rsvpName, setRsvpName] = useState("");

  const columns = useMemo(() => {
    const left: Photo[] = [];
    const right: Photo[] = [];
    photos.forEach((p, i) => (i % 2 === 0 ? left : right).push(p));
    return [left, right];
  }, [photos]);

  const enter = (delay: number) =>
    reduced ? FadeIn.duration(150) : FadeInDown.delay(delay).duration(600);

  return (
    <View style={{ alignItems: "center", gap: 22, paddingHorizontal: 26 }}>
      <Animated.View entering={enter(0)} style={{ alignItems: "center", gap: 12 }}>
        {occasionLabel ? (
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 13,
              letterSpacing: 13 * 0.16,
              textTransform: "uppercase",
              color: palette.sand,
            }}
          >
            {occasionLabel}
          </Text>
        ) : null}
        <Text
          style={{
            fontFamily: fonts.heading,
            fontWeight: "400",
            fontSize: 34,
            lineHeight: 34 * 1.1,
            letterSpacing: 34 * -0.02,
            color: palette.paper,
            textAlign: "center",
          }}
        >
          {invite.title}
        </Text>
      </Animated.View>

      <Animated.View entering={enter(200)}>
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: 16,
            lineHeight: 16 * 1.7,
            color: "rgba(255,254,253,0.85)",
            textAlign: "center",
            maxWidth: BODY_MAX_WIDTH,
          }}
        >
          {invite.message}
        </Text>
      </Animated.View>

      {photos.length > 0 ? (
        <View
          style={{ flexDirection: "row", gap: 12, width: "100%", maxWidth: MASONRY_MAX_WIDTH }}
        >
          {columns.map((col, ci) => (
            <View key={ci} style={{ flex: 1, gap: 10 }}>
              {col.map((p, ri) => (
                <MasonryTile
                  key={p.id}
                  photo={p}
                  url={photoUrls[p.id]}
                  reduced={reduced}
                  // Interleave the two columns so the eye travels down the
                  // grid rather than finishing one column then starting the
                  // other. Index within the flattened reading order.
                  order={ri * 2 + ci}
                />
              ))}
            </View>
          ))}
        </View>
      ) : null}

      {questions.map((q) => (
        <QuestionBlock
          key={q.id}
          question={q}
          enableDodge={!!invite.enable_dodge_no}
          reduced={reduced}
          onAnswer={(ans) => {
            if (preview) return;
            recordAnswer(invite.id, q.id, ans).catch(() => {});
          }}
        />
      ))}

      <Animated.View entering={enter(500)} style={{ width: "100%", maxWidth: 300, alignItems: "center" }}>
        {rsvped ? (
          <Text
            style={{
              fontFamily: fonts.heading,
              fontStyle: "italic",
              fontSize: 17,
              color: palette.sand,
              textAlign: "center",
            }}
          >
            Recorded. They&apos;ll know you&apos;re in.
          </Text>
        ) : (
          <>
            {/* Web `.s-rsvp .cap2` */}
            <Text
              style={{
                fontFamily: fonts.heading,
                fontStyle: "italic",
                fontSize: 17,
                color: palette.sand,
                textAlign: "center",
                marginBottom: 10,
              }}
            >
              Don&apos;t leave me hanging
            </Text>

            {/* Web `.rform` — sand hairline, transparent ground, centred white. */}
            <TextInput
              value={rsvpName}
              onChangeText={setRsvpName}
              maxLength={RSVP_NAME_MAX_LENGTH}
              placeholder="Your name"
              placeholderTextColor="rgba(255,255,255,0.5)"
              accessibilityLabel="Your name"
              style={{
                width: "100%",
                marginBottom: 12,
                borderWidth: 1,
                borderColor: palette.sand,
                borderRadius: radii.sm,
                paddingHorizontal: 16,
                paddingVertical: 13,
                textAlign: "center",
                color: derived.white,
                fontFamily: fonts.body,
                fontSize: 16,
              }}
            />

            <EdButton
              title="Count me in"
              variant="coral"
              style={{ alignSelf: "stretch" }}
              onPress={async () => {
                if (!reduced) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                }
                const trimmed = rsvpName.trim();
                setRsvped(true);
                try {
                  if (!preview) await recordRsvp(invite.id, trimmed || undefined);
                } catch {
                  /* dedup / offline — the acknowledgement still stands */
                }
              }}
            />
          </>
        )}
      </Animated.View>

      {contributions.length > 0 ? (
        <View style={{ width: "100%", gap: 10, maxWidth: MASONRY_MAX_WIDTH }}>
          <Text
            style={{
              fontFamily: fonts.heading,
              fontStyle: "italic",
              fontSize: 17,
              color: palette.sand,
              textAlign: "center",
            }}
          >
            Notes from people who love you
          </Text>
          {contributions.map((c) => (
            <View
              key={c.id}
              style={{
                borderWidth: 1,
                borderColor: "rgba(255,254,253,0.16)",
                borderRadius: radii.sm,
                padding: 14,
                gap: 3,
              }}
            >
              <Text style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: "600", color: palette.sand }}>
                {c.contributor_name}
              </Text>
              {c.message ? (
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 14,
                    lineHeight: 14 * 1.6,
                    color: "rgba(255,254,253,0.8)",
                  }}
                >
                  {c.message}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {/* `.wm` — free tier only, per `chrome()`'s `s.tier==="free"` rule. */}
      {invite.is_paid ? null : <RevealWatermark onPress={onCreateOwn} />}
    </View>
  );
}

/* ----------------------------------------------------------------- masonry */

/**
 * Photos used to arrive as one block: a single `entering={enter(350)}` around
 * the whole masonry, so five photos faded up together and the grid read as
 * "stuck there". Each tile now develops on its own — out of blur, up from
 * 0.94, un-tilting as it settles — staggered down the reading order.
 *
 * Direction A of three that were prototyped and compared side by side.
 *
 * On duration: UI motion belongs under 300ms, but that budget is for things
 * seen dozens of times a day. A reveal is seen ONCE, by someone who was sent a
 * surprise, so the stagger is 90ms and the develop 760ms deliberately.
 */
/** Strong ease-out. The built-in curves are too weak to read as intentional. */
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const DEVELOP_MS = 760;
const DEVELOP_STAGGER_MS = 90;
/** Under 20px — heavy blur is expensive, and worst in Safari. */
const DEVELOP_BLUR = 14;
/** Never scale(0): nothing in the real world appears from nothing. */
const DEVELOP_SCALE = 0.94;
/** Resting tilt, alternating, so a grid of photos is not mechanically square. */
const TILT_DEG = 1.3;

function MasonryTile({
  photo,
  url,
  reduced,
  order,
}: {
  photo: Photo;
  url?: string;
  reduced: boolean;
  order: number;
}) {
  const progress = useSharedValue(0);
  const tilt = order % 2 === 0 ? -TILT_DEG : TILT_DEG;

  useEffect(() => {
    // Reduced motion keeps the fade that explains arrival and drops every
    // displacement — gentler, not absent.
    if (reduced) {
      progress.value = withTiming(1, { duration: 150 });
      return;
    }
    progress.value = withDelay(
      order * DEVELOP_STAGGER_MS,
      withTiming(1, { duration: DEVELOP_MS, easing: EASE_OUT })
    );
  }, [order, progress, reduced]);

  const developing = useAnimatedStyle(() => {
    const p = progress.value;
    if (reduced) return { opacity: p };
    return {
      // Opacity finishes early so the photo is present while it sharpens,
      // rather than fading and focusing at the same rate.
      opacity: Math.min(1, p / 0.6),
      transform: [
        { scale: DEVELOP_SCALE + (1 - DEVELOP_SCALE) * p },
        { rotate: `${tilt * (1 - p)}deg` },
      ],
    };
  });

  /**
   * Blur is a plain state flip, not an animated prop: `blurRadius` on
   * expo-image is not driveable from the UI thread, and a Reanimated
   * `useAnimatedProps` for it silently did nothing. One re-render per tile,
   * smoothed by the Image's own `transition`.
   */
  const [sharp, setSharp] = useState(reduced);
  useEffect(() => {
    if (reduced) return;
    const id = setTimeout(() => setSharp(true), order * DEVELOP_STAGGER_MS + DEVELOP_MS * 0.25);
    return () => clearTimeout(id);
  }, [order, reduced]);

  return (
    <Animated.View
      style={[
        {
          borderRadius: radii.sm,
          borderWidth: 1,
          borderColor: palette.mist,
          overflow: "hidden",
          backgroundColor: palette.stone,
        },
        developing,
      ]}
    >
      {url ? (
        <Image
          source={{ uri: url }}
          style={{ width: "100%", aspectRatio: 1 }}
          contentFit="cover"
          blurRadius={sharp ? 0 : DEVELOP_BLUR}
          transition={DEVELOP_MS * 0.55}
          accessibilityLabel={photo.caption || "A photo from this surprise"}
        />
      ) : (
        // Photo binaries live in a private bucket; without a configured backend
        // the frame plus the caption still carry the moment.
        <View style={{ width: "100%", aspectRatio: 1, backgroundColor: palette.stone }} />
      )}
      {photo.caption ? (
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: 11,
            color: palette.stone,
            backgroundColor: palette.paper,
            paddingVertical: 6,
            paddingHorizontal: 9,
            borderTopWidth: 1,
            borderTopColor: palette.mist,
          }}
        >
          {photo.caption}
        </Text>
      ) : null}
    </Animated.View>
  );
}

/* ---------------------------------------------------------------- question */

function QuestionBlock({
  question,
  enableDodge,
  reduced,
  onAnswer,
}: {
  question: RevealData["questions"][number];
  enableDodge: boolean;
  reduced: boolean;
  onAnswer: (answer: boolean) => void;
}) {
  const [answered, setAnswered] = useState<null | boolean>(null);
  const noX = useSharedValue(0);
  const noY = useSharedValue(0);
  const noStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: noX.value }, { translateY: noY.value }],
  }));

  /**
   * D6's rules, all of which the previous implementation broke:
   *
   *   - `onPress` only recorded a No when dodging was OFF, so with the toggle
   *     on the button was UN-DECLINABLE. Forever. That is the exact
   *     accessibility failure the handoff calls out by name.
   *   - `Math.random()` could land the button where it already was, which
   *     reads as broken rather than playful.
   *   - Nothing clamped it, so it could leave the row or sit on top of Yes.
   *   - There was no dodge limit and no screen-reader check.
   *
   * `lib/dodging-no.ts` owns all four decisions and is tested; this only
   * animates what it returns.
   */
  const [screenReader, setScreenReader] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setScreenReader);
    const sub = AccessibilityInfo.addEventListener("screenReaderChanged", setScreenReader);
    return () => sub.remove();
  }, []);

  const dodgeState = useRef<DodgeState>(INITIAL_DODGE_STATE);
  const [givenUp, setGivenUp] = useState(false);
  const rowWidth = useRef(300);
  const noWidth = useRef(88);
  const { height: windowHeight } = useWindowDimensions();

  const dodging = shouldDodge({ enabled: enableDodge, reducedMotion: reduced, screenReader });

  function dodge() {
    if (!dodging || givenUp) return;
    const next = nextDodge(dodgeState.current, {
      width: rowWidth.current,
      buttonWidth: noWidth.current,
      buttonHeight: 40,
      padding: 0,
      // The No roams most of the screen now, not the 40px band its own row
      // gave it. Capped well inside the viewport so it can never strand
      // itself under the notch or below the home indicator.
      roamHeight: Math.max(0, windowHeight * 0.28),
      // The No is centred in its row, so its resting left edge is half the
      // slack — that is how far left it may travel before it would overlap.
      yesRight: Math.max(0, (rowWidth.current - noWidth.current) / 2),
    });
    dodgeState.current = next;
    noX.value = withSpring(next.offset.x, { stiffness: 300, damping: 14 });
    noY.value = withSpring(next.offset.y, { stiffness: 300, damping: 14 });
    if (hasGivenUp(next)) setGivenUp(true);
  }

  /** The No is always answerable: immediately when not dodging, after four
   *  dodges when it is. */
  const noIsAnswerable = !dodging || givenUp;

  const heading = (
    <Text
      style={{
        fontFamily: fonts.heading,
        fontStyle: "italic",
        fontSize: 19,
        lineHeight: 19 * 1.3,
        color: palette.sand,
        textAlign: "center",
      }}
    >
      {question.question_text}
    </Text>
  );

  if (answered !== null) {
    return (
      <Animated.View entering={FadeIn} style={{ alignItems: "center", gap: 8 }}>
        {heading}
        <Text style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: "600", color: palette.paper }}>
          You said {answered ? question.yes_label || "Yes" : question.no_label || "No"}
        </Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={reduced ? FadeIn : FadeInDown.delay(420).duration(600)}
      style={{ alignItems: "center", gap: 14, width: "100%" }}
    >
      {heading}
      <View style={{ width: "100%", maxWidth: 300, gap: 10, alignItems: "center" }}>
        <EdButton
          title={question.yes_label || "Yes"}
          variant="coral"
          style={{ alignSelf: "stretch" }}
          onPress={() => {
            setAnswered(true);
            onAnswer(true);
          }}
        />
        {/* `.dodgezone` reserves the row so the runaway No never reflows copy.
            `overflow: visible` matters now that the No leaves the row — a
            hidden overflow would clip it mid-flight and read as a disappearing
            button rather than a running one. */}
        <View
          onLayout={(e) => (rowWidth.current = e.nativeEvent.layout.width)}
          style={{ height: 56, width: "100%", alignItems: "center", justifyContent: "flex-start" }}
        >
          <Animated.View style={noStyle}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={question.no_label || "No"}
              // onPressIn, not onPress: it has to move BEFORE the tap lands,
              // or it is not dodging, it is just refusing.
              onPressIn={dodge}
              onPress={() => {
                if (!noIsAnswerable) return;
                setAnswered(false);
                onAnswer(false);
              }}
              onLayout={(e) => (noWidth.current = e.nativeEvent.layout.width)}
              style={{
                minHeight: 40,
                justifyContent: "center",
                paddingHorizontal: 24,
                borderRadius: radii.pill,
                borderWidth: 1,
                borderColor: palette.sand,
              }}
              hitSlop={{ top: 4, bottom: 4 }}
            >
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 12,
                  fontWeight: "600",
                  letterSpacing: 12 * 0.08,
                  textTransform: "uppercase",
                  color: palette.sand,
                }}
              >
                {question.no_label || "No"}
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
}
