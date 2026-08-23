/**
 * D5 — Open-when letters.
 *
 * Two states, per the frame:
 *
 * LIST (ink)   30px serif "For <name>", a sub line, then letter rows: a 30x22
 *              outlined envelope, an 18px serif label, and a state line.
 *              Sealed (outlined + chevron) · Opened (filled sand envelope,
 *              opacity .6, no chevron) · Date-locked (dashed border, lock glyph).
 *
 * LETTER (paper)  The ONLY place a reveal goes light. Back chevron,
 *              "LETTER ONE OF FOUR", a coral label, the body at 21px serif with
 *              1.65 leading, an optional signature, and a "Back to the letters"
 *              pill.
 *
 * A locked letter's body never arrives from the server, so tapping one cannot
 * open it — the row is not pressable and says when it unlocks instead.
 */
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Lock } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import {
  classifyLetter,
  getLetters,
  letterStateLine,
  openLetter,
  type LetterRow,
} from "@/lib/letters";
import { palette, derived, radii, space, screenPadding, touch, type, overlay } from "@/theme/tokens";
import { useReducedMotion } from "@/components/editorial";

const ORDINALS = ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT"];
const COUNT_WORDS = ["ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT"];

/** Frame D5: 30x22 outlined envelope. */
function Envelope({ filled, dashed }: { filled?: boolean; dashed?: boolean }) {
  return (
    <View
      style={{
        width: 30,
        height: 22,
        borderRadius: 3,
        borderWidth: 1,
        borderStyle: dashed ? "dashed" : "solid",
        borderColor: filled ? palette.sand : overlay.borderStrong,
        backgroundColor: filled ? palette.sand : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* The flap — a single hairline, so the shape reads as an envelope. */}
      <View
        style={{
          width: 20,
          height: 1,
          backgroundColor: filled ? palette.ink : overlay.borderStrong,
          transform: [{ rotate: "0deg" }],
        }}
      />
    </View>
  );
}

export interface LettersRevealProps {
  slug: string;
  recipientName: string;
  /** Shown under the signature on an open letter. */
  fromName?: string;
  /**
   * The PIN the recipient already cleared, when this surprise has one. Both
   * the shelf read and the open write are PIN-gated server-side now, so
   * without it a locked surprise shows an empty shelf and every open fails.
   */
  pin?: string | null;
  /** Letters already fetched by the gated bundle — saves a second round trip. */
  initialLetters?: LetterRow[];
  /**
   * Shown as a ✕ only when there is history behind this screen — the same rule
   * `RevealTopBar`, `PinGate` and `WaitingRoom` use.
   *
   * This branch returns before `RevealTopBar` ever renders, exactly as the PIN
   * gate did, so a creator who opened their own letters surprise from the
   * detail screen had no way out at all. Seen on /surprise/wizard-verify: an
   * empty shelf reading "No letters in this one." with no control on screen.
   */
  onBack?: () => void;
}

export default function LettersReveal({
  slug,
  recipientName,
  fromName,
  pin = null,
  initialLetters,
  onBack,
}: LettersRevealProps) {
  const [rows, setRows] = useState<LetterRow[]>(initialLetters ?? []);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialLetters);
  const reduced = useReducedMotion();

  const load = useCallback(async () => {
    setRows(await getLetters(slug, pin));
    setLoading(false);
  }, [slug, pin]);

  useEffect(() => {
    // The gated bundle already carried the shelf; re-reading it would spend a
    // round trip to arrive at the same rows.
    if (initialLetters) return;
    load();
  }, [load, initialLetters]);

  const openRow = rows.find((r) => r.id === openId) ?? null;

  async function handleOpen(row: LetterRow) {
    if (classifyLetter(row) === "locked") return;
    if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setOpenId(row.id);
    // Fire-and-forget: the letter is already on screen. If this fails the row
    // simply stays "sealed", which is recoverable — blocking the read is not.
    const at = await openLetter(row.id, pin);
    if (at) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, opened_at: at } : r)));
    }
  }

  // ---------------------------------------------------------------- letter
  if (openRow && openRow.body) {
    const index = rows.findIndex((r) => r.id === openRow.id);
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.paper }}>
        <ScrollView
          contentContainerStyle={{
            padding: screenPadding.default,
            paddingBottom: space.x9,
            gap: space.x5,
          }}
        >
          <Pressable
            onPress={() => setOpenId(null)}
            accessibilityRole="button"
            accessibilityLabel="Back to the letters"
            style={{
              width: touch.min,
              height: touch.min,
              marginLeft: -space.x2,
              alignItems: "flex-start",
              justifyContent: "center",
            }}
          >
            <ChevronLeft size={24} color={palette.ink} strokeWidth={1.4} />
          </Pressable>

          <Text style={type.sectionLabel}>
            LETTER {ORDINALS[index] ?? String(index + 1)} OF{" "}
            {COUNT_WORDS[rows.length] ?? String(rows.length)}
          </Text>

          <Text style={{ ...type.screenTitle, color: palette.coral, fontSize: 22 }}>
            {openRow.label}
          </Text>

          {/* Frame D5: 21px serif, lineHeight 1.65. */}
          <Text
            style={{
              fontFamily: type.screenTitle.fontFamily,
              fontWeight: "400",
              fontSize: 21,
              lineHeight: 21 * 1.65,
              color: palette.ink,
            }}
          >
            {openRow.body}
          </Text>

          {fromName ? (
            <Text
              style={{
                fontFamily: type.screenTitle.fontFamily,
                fontStyle: "italic",
                fontSize: 17,
                color: palette.stone,
              }}
            >
              — {fromName}
            </Text>
          ) : null}

          <Pressable
            onPress={() => setOpenId(null)}
            accessibilityRole="button"
            style={{
              alignSelf: "flex-start",
              minHeight: touch.control,
              paddingHorizontal: space.x7,
              borderRadius: radii.pill,
              borderWidth: 1,
              borderColor: palette.mist,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ ...type.buttonLabel, color: palette.ink }}>Back to the letters</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ------------------------------------------------------------------ list
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.ink }}>
      {onBack ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={12}
            style={({ pressed }) => ({
              width: touch.min,
              height: touch.min,
              justifyContent: "center",
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <Text style={{ fontSize: 24, color: palette.paper }}>✕</Text>
          </Pressable>
        </View>
      ) : null}
      <ScrollView
        contentContainerStyle={{
          padding: screenPadding.default,
          paddingTop: onBack ? space.x4 : space.x8,
          paddingBottom: space.x9,
        }}
      >
        <Text style={{ ...type.screenTitle, fontSize: 30, color: palette.paper }}>
          For {recipientName}
        </Text>
        <Text
          style={{
            ...type.body,
            color: overlay.textSoft,
            marginTop: space.x2,
            marginBottom: space.x7,
          }}
        >
          Open each when it&rsquo;s right. They don&rsquo;t expire.
        </Text>

        {loading ? (
          <Text style={{ ...type.body, color: overlay.textSoft }}>Finding your letters…</Text>
        ) : rows.length === 0 ? (
          <Text style={{ ...type.body, color: overlay.textSoft }}>
            No letters in this one.
          </Text>
        ) : (
          rows.map((row) => {
            const state = classifyLetter(row);
            const locked = state === "locked";
            const opened = state === "opened";

            return (
              <Pressable
                key={row.id}
                onPress={() => handleOpen(row)}
                disabled={locked}
                accessibilityRole="button"
                accessibilityState={{ disabled: locked }}
                accessibilityLabel={`${row.label}. ${letterStateLine(row)}`}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: space.x4,
                  paddingVertical: space.x5,
                  borderBottomWidth: 1,
                  borderBottomColor: overlay.borderSoft,
                  minHeight: touch.min,
                  // Frame D5: an opened letter sits at opacity .6.
                  opacity: opened ? 0.6 : pressed && !reduced ? 0.7 : 1,
                })}
              >
                {locked ? (
                  <Envelope dashed />
                ) : (
                  <Envelope filled={opened} />
                )}

                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      ...type.screenTitle,
                      fontSize: 18,
                      lineHeight: 18 * 1.2,
                      color: palette.paper,
                    }}
                  >
                    {row.label}
                  </Text>
                  <Text style={{ ...type.bodySecondary, color: overlay.textSoft, marginTop: 3 }}>
                    {letterStateLine(row)}
                  </Text>
                </View>

                {locked ? (
                  <Lock size={16} color={overlay.textSoft} strokeWidth={1.4} />
                ) : opened ? null : (
                  <Text style={{ fontSize: 22, color: overlay.textSoft }}>›</Text>
                )}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
