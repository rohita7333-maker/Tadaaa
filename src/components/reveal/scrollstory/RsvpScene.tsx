/**
 * RsvpScene — Scene 5: the RSVP ask.
 *
 * GRADIENT SEAM CONTRACT: first stop SEAM_POLAROID_TO_RSVP === PolaroidScene's
 * final stop; final stop SEAM_RSVP_TO_FINALE === FinaleScene's first stop.
 *
 * When `inviteId` is present this records a real RSVP via db.ts's
 * `recordRsvp` RPC. On the demo config (no inviteId) it fires haptic +
 * confetti only — matching the web demo's local-only RsvpScene behaviour.
 */
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import type { StoryConfig } from "@/lib/scroll-story/config";
import { Txt, fonts, radii } from "@/components/ui";
import { Confetti } from "@/components/reveal/Particles";
import { recordRsvp } from "@/lib/db";
import { getThemeById, themes } from "@/lib/themes";
import { HAND_FONT, SEAM_POLAROID_TO_RSVP, SEAM_RSVP_TO_FINALE } from "./shared";

interface RsvpSceneProps {
  config: StoryConfig;
  /** Real invite id — when present, RSVP taps record via the Supabase RPC. */
  inviteId?: string;
  reduced: boolean;
}

/** Matches the web field + the record_rsvp RPC, which caps names at 80. */
const NAME_MAX_LENGTH = 80;

export default function RsvpScene({ config, inviteId, reduced }: RsvpSceneProps) {
  const [isRecorded, setIsRecorded] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [name, setName] = useState("");
  const theme = getThemeById("warm-embrace") ?? themes[0];

  async function handleRsvp() {
    if (isRecorded) return;
    setIsRecorded(true);
    setStatusMessage("Recorded!");
    setShowConfetti(true);
    if (!reduced) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (!inviteId) return; // demo — haptic + confetti only, nothing to record
    try {
      await recordRsvp(inviteId, name.trim() || undefined);
    } catch {
      setIsRecorded(false);
      setStatusMessage("Something went wrong — tap to try again.");
    }
  }

  return (
    <LinearGradient
      colors={[SEAM_POLAROID_TO_RSVP, "#C4686D", SEAM_RSVP_TO_FINALE]}
      locations={[0, 0.55, 1]}
      style={{ minHeight: 560, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 96 }}
    >
      {showConfetti && <Confetti run theme={theme} reduced={reduced} />}

      <View style={{ maxWidth: 420, alignItems: "center" }}>
        <Txt style={{ fontFamily: HAND_FONT, fontSize: 22, color: "#E8D5A8" }}>don&apos;t leave me hanging…</Txt>
        <Txt
          style={{
            marginTop: 8,
            fontFamily: fonts.heading,
            fontStyle: "italic",
            fontSize: 40,
            lineHeight: 44,
            color: "#FFF8F0",
            textAlign: "center",
          }}
        >
          please rsvp
        </Txt>

        {/* Optional name — turns an anonymous count into a guest list. Skippable
            by design: nobody has to sign in (or type) to say yes. */}
        {!isRecorded && (
          <View style={{ marginTop: 32, alignItems: "center", alignSelf: "stretch" }}>
            <Txt
              style={{
                fontFamily: fonts.heading,
                fontStyle: "italic",
                fontSize: 14,
                color: "rgba(255,248,240,0.85)",
              }}
            >
              Who&apos;s saying yes?
            </Txt>
            <TextInput
              value={name}
              onChangeText={setName}
              maxLength={NAME_MAX_LENGTH}
              placeholder="Your name (optional)"
              placeholderTextColor="rgba(255,248,240,0.55)"
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              accessibilityLabel="Your name, optional"
              style={{
                marginTop: 12,
                width: 260,
                maxWidth: "100%",
                height: 48,
                borderRadius: radii.pill,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.35)",
                backgroundColor: "rgba(255,255,255,0.15)",
                paddingHorizontal: 20,
                textAlign: "center",
                fontFamily: fonts.body,
                fontSize: 15,
                color: "#FFF8F0",
              }}
            />
          </View>
        )}

        <Pressable
          onPress={handleRsvp}
          disabled={isRecorded}
          style={({ pressed }) => ({
            marginTop: 24,
            transform: [{ scale: pressed ? 0.97 : 1 }],
            opacity: isRecorded ? 0.9 : 1,
          })}
        >
          <View
            style={{
              backgroundColor: "#fff",
              paddingHorizontal: 32,
              paddingVertical: 16,
              borderRadius: radii.pill,
            }}
          >
            <Txt style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: "#9B3D42" }}>
              {isRecorded ? "You're in! 🎉" : "🎉 Count me in!"}
            </Txt>
          </View>
        </Pressable>

        {statusMessage ? (
          <Txt style={{ marginTop: 16, fontSize: 13, color: "rgba(255,248,240,0.85)" }}>{statusMessage}</Txt>
        ) : null}
      </View>
    </LinearGradient>
  );
}
