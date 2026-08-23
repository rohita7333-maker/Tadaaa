/**
 * D4 — Countdown.
 *
 * REBUILT against frame D4 on 2026-08-17. It had been built from the editorial
 * HTML mockup (`bCd` in `tadaaaa-editorial.html`) instead, which is a different
 * drawing: one unbroken `DD:HH:MM:SS` run, no unit labels, and a serif-italic
 * "Something's coming" UNDER the digits. Frame D4 is
 *
 *   sand "SOMETHING IS COMING"   10px / 600 / +.22em, 22px above
 *   62px Georgia sand digits     tabular-nums, +.02em, line-height 1
 *   Hours · Mins · Secs          9.5px / 600 / +.16em, 12px below, gap 38
 *   the message                  15px / 1.65, max-width 260
 *
 * Nobody had ever seen this screen: the D7 waiting-room branch swallowed every
 * future `countdown_date`, so `CountdownClosed` was unreachable until that was
 * fixed in the same session. Four unexplained numbers is what it had been
 * rendering.
 *
 * The digits are now one Text PER GROUP so each label sits under its own
 * number. A single run with a separate label row cannot align: the groups are
 * two glyphs and the separators one, so no `gap` or `space-between` puts a
 * label under the pair it describes.
 *
 * `--stone` (#484848) on the ink ground measures 2.1:1 and fails AA, so every
 * secondary line here is sand or the frame's own translucent paper.
 */
import { useEffect, useRef, useState } from "react";
import { AppState, Platform, Text, View } from "react-native";
import { fonts, palette } from "@/components/editorial";
import {
  countdownDigitSize,
  countdownGroups,
  countdownSpoken,
  type CountdownGroup,
} from "@/lib/countdown";
import LiveActivityOffer from "./LiveActivityOffer";

const TICK_MS = 1000;

/** Frame D4's label row: 9.5px / 600 / +.16em / uppercase. */
const LABEL_SIZE = 9.5;
/** `rgba(255,254,253,.45)` — the frame's own value, 5.6:1 on ink. */
const LABEL_COLOR = "rgba(255,254,253,0.45)";

/**
 * `font:400 62px Georgia; letter-spacing:.02em; line-height:1`.
 *
 * `fontVariant` is rebuilt per call rather than hoisted and spread: the token
 * layer types these tuples `readonly`, and spreading one into a mutable style
 * object is a compile error that has bitten this repo before.
 */
function digitStyle(groupCount: number) {
  const size = countdownDigitSize(groupCount);
  return {
    fontFamily: fonts.heading,
    fontWeight: "400" as const,
    fontSize: size,
    lineHeight: size,
    letterSpacing: size * 0.02,
    color: palette.sand,
    ...(Platform.OS === "ios" ? { fontVariant: ["tabular-nums" as const] } : null),
  };
}

export default function CountdownClosed({
  targetIso,
  title,
  message,
  onReachZero,
  slug,
}: {
  targetIso: string;
  /**
   * Frame D4's 26px serif headline between the clock and the message. Required,
   * not optional: there is exactly one call site, and an optional prop nobody
   * passes is how this line went missing in the first place.
   */
  title: string;
  message: string;
  onReachZero: () => void;
  /** Drives D4's offer card. Absent on a preview, where there is nothing to
   *  notify anyone about. */
  slug?: string;
}) {
  const targetMs = new Date(targetIso).getTime();
  const [groups, setGroups] = useState<CountdownGroup[]>(() =>
    countdownGroups(targetMs - Date.now())
  );
  const firedRef = useRef(false);

  useEffect(() => {
    if (Number.isNaN(targetMs)) return;
    function update() {
      const remaining = targetMs - Date.now();
      setGroups(countdownGroups(remaining));
      if (remaining <= 0 && !firedRef.current) {
        firedRef.current = true;
        onReachZero();
      }
    }
    update();
    const id = setInterval(update, TICK_MS);
    // Every tick is recomputed from the ABSOLUTE target, so backgrounding
    // cannot make the clock drift — but iOS throttles timers while suspended,
    // so without this the digits show a stale value for up to a second after
    // the app comes back. Re-derive immediately on foreground instead.
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") update();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [targetMs, onReachZero]);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 28,
        paddingVertical: 40,
        gap: 10,
      }}
    >
      {/* Frame D4's micro-label, ABOVE the digits. */}
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: 10,
          fontWeight: "600",
          letterSpacing: 10 * 0.22,
          textTransform: "uppercase",
          color: palette.sand,
          marginBottom: 22,
          textAlign: "center",
        }}
      >
        Something is coming
      </Text>

      {/*
        One column per group so each unit label sits under its own number, and
        the whole row carries a single spoken label — a screen reader must not
        read four separate two-digit Texts as four unrelated numbers.
      */}
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={countdownSpoken(groups)}
        style={{ flexDirection: "row", alignItems: "flex-start" }}
      >
        {groups.map((group, i) => (
          <View key={group.label} style={{ flexDirection: "row", alignItems: "flex-start" }}>
            {i > 0 ? <Text style={digitStyle(groups.length)}>:</Text> : null}
            <View style={{ alignItems: "center" }}>
              <Text style={digitStyle(groups.length)}>{group.value}</Text>
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: LABEL_SIZE,
                  fontWeight: "600",
                  letterSpacing: LABEL_SIZE * 0.16,
                  textTransform: "uppercase",
                  color: LABEL_COLOR,
                  marginTop: 12,
                  // RN adds the tracking AFTER the last glyph too, so a tracked
                  // label measures one unit wider than it looks and centres a
                  // half-unit left of its digits. Nudge it back. Visible at
                  // +.16em; this is why "DAYS" sat left of "02".
                  marginLeft: LABEL_SIZE * 0.16,
                }}
              >
                {group.label}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Frame D4's headline: `400 26px/1.2 Georgia; color:#FFFEFD;
          margin:40px 0 12px`. Paper, not sand — it is the one line on this
          screen that is content rather than chrome. */}
      <Text
        style={{
          fontFamily: fonts.heading,
          fontWeight: "400",
          fontSize: 26,
          lineHeight: 26 * 1.2,
          color: palette.paper,
          textAlign: "center",
          marginTop: 40,
        }}
      >
        {title}
      </Text>

      {/* The paragraph: 15px/1.65, rgba(255,254,253,.62), max-width 260, and
          the headline's own 12px bottom margin between them. The mockup's
          14px/300 belonged to the other drawing. */}
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: 15,
          lineHeight: 15 * 1.65,
          color: "rgba(255,254,253,0.62)",
          textAlign: "center",
          maxWidth: 260,
          marginTop: 12,
        }}
      >
        {message}
      </Text>

      {slug ? (
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
          <LiveActivityOffer slug={slug} />
        </View>
      ) : null}
    </View>
  );
}
