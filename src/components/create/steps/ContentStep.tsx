/**
 * C2 — Content.
 *
 * Frame anatomy: a 52px "Who's it for?" title field (required, inline error
 * "Give it a title first.") · a "What do you want to say?" textarea with a coral
 * "AI draft it" in the label row, a 500 cap and a live counter · the photo strip
 * · a "Record a video message" row (60s, front camera) · a "Background music"
 * toggle.
 *
 * BLOCKED — music. The handoff's open question #4 (music licensing) is
 * unanswered and there is no `music_tracks` table in production. The row ships
 * as a disabled control that says why, rather than a toggle that flips and
 * changes nothing.
 */
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { EdButton, derived, palette } from "@/components/editorial";
import { Sheet } from "@/components/handoff/Sheet";
import { Toggle } from "@/components/handoff";
import { PhotoStrip } from "./PhotoStrip";
import { MESSAGE_MAX, type WizardPhoto } from "@/lib/wizard";
import { ApiError, aiDraftInvite, hasBackend, type AITone } from "@/lib/api";
import { aiDraftErrorMessage } from "@/lib/ai-draft-errors";
import { occasionLabel } from "@/lib/occasions";
import { radii, space, touch, type } from "@/theme/tokens";

const TONES: { id: AITone; label: string }[] = [
  { id: "warm", label: "Warm" },
  { id: "playful", label: "Playful" },
  { id: "elegant", label: "Elegant" },
  { id: "heartfelt", label: "Heartfelt" },
  { id: "funny", label: "Funny" },
];

export function ContentStep({
  occasion,
  title,
  message,
  photos,
  photoLimit,
  videoUri,
  musicEnabled,
  titleError,
  onTitleChange,
  onMessageChange,
  onPhotosChange,
  onVideoChange,
  onMusicChange,
  onNotify,
}: {
  occasion: string;
  title: string;
  message: string;
  photos: WizardPhoto[];
  photoLimit: number;
  videoUri: string | null;
  musicEnabled: boolean;
  titleError: string | null;
  onTitleChange: (v: string) => void;
  onMessageChange: (v: string) => void;
  onPhotosChange: (v: WizardPhoto[]) => void;
  onVideoChange: (uri: string | null) => void;
  onMusicChange: (v: boolean) => void;
  onNotify: (message: string) => void;
}) {
  const [aiOpen, setAiOpen] = useState(false);
  const [drafting, setDrafting] = useState(false);

  async function draftWith(tone: AITone) {
    if (!hasBackend) {
      onNotify("AI drafting runs on the TaDaaaa backend — connect it to use this.");
      return;
    }
    setDrafting(true);
    try {
      const draft = await aiDraftInvite({
        // The title doubles as "who is this for" on this step, which is exactly
        // what the endpoint wants for `recipient`.
        recipient: title.trim() || "them",
        occasion: occasionLabel(occasion) || "custom",
        tone,
      });
      onMessageChange(draft.message);
      if (!title.trim()) onTitleChange(draft.title);
      setAiOpen(false);
    } catch (e) {
      // `aiDraftErrorMessage` branches on the HTTP status the way web does;
      // anything that never reached the server has no status and falls through
      // to the generic line.
      onNotify(aiDraftErrorMessage(e instanceof ApiError ? e.status : undefined));
    } finally {
      setDrafting(false);
    }
  }

  async function recordVideo() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      onNotify("Allow camera access to record a video message.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["videos"],
      videoMaxDuration: 60,
      cameraType: ImagePicker.CameraType.front,
    });
    if (result.canceled || result.assets.length === 0) return;
    onVideoChange(result.assets[0].uri);
  }

  return (
    <View>
      <View style={{ marginBottom: 16 }}>
        <Text style={{ ...type.fieldLabel, marginBottom: 7 }}>Who&apos;s it for?</Text>
        <TextInput
          value={title}
          onChangeText={onTitleChange}
          placeholder="Maya turns thirty"
          placeholderTextColor={palette.stone}
          accessibilityLabel="Who is it for"
          style={{
            minHeight: touch.control,
            borderWidth: titleError ? 2 : 1,
            borderColor: titleError ? palette.coral : palette.mist,
            borderRadius: radii.sm,
            paddingHorizontal: titleError ? 14 : 15,
            ...type.body,
            fontSize: 17,
          }}
        />
        {titleError ? (
          <Text style={{ ...type.bodySecondary, color: derived.coralDeep, marginTop: 6 }}>
            {titleError}
          </Text>
        ) : null}
      </View>

      <View style={{ marginBottom: 16 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 7,
          }}
        >
          <Text style={type.fieldLabel}>What do you want to say?</Text>
          <Pressable
            onPress={() => setAiOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Draft this message with AI"
            hitSlop={10}
          >
            <Text
              style={{ ...type.body, fontSize: 12, fontWeight: "600", color: derived.coralDeep }}
            >
              AI draft it
            </Text>
          </Pressable>
        </View>
        <TextInput
          value={message}
          onChangeText={onMessageChange}
          multiline
          maxLength={MESSAGE_MAX}
          placeholder="Thirty looks good on you."
          placeholderTextColor={palette.stone}
          accessibilityLabel="Your message"
          style={{
            minHeight: 104,
            borderWidth: 1,
            borderColor: palette.mist,
            borderRadius: radii.sm,
            paddingHorizontal: 15,
            paddingVertical: 13,
            ...type.body,
            lineHeight: 16 * 1.55,
            textAlignVertical: "top",
          }}
        />
        <Text style={{ ...type.bodySecondary, fontSize: 12, textAlign: "right", marginTop: 5 }}>
          {message.length}/{MESSAGE_MAX}
        </Text>
      </View>

      <PhotoStrip
        photos={photos}
        limit={photoLimit}
        onChange={onPhotosChange}
        onNotify={onNotify}
      />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: palette.mist,
          marginTop: 6,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ ...type.body, fontSize: 15, fontWeight: "600" }}>
            Record a video message
          </Text>
          <Text style={type.bodySecondary}>
            {videoUri ? "Recorded — tap to replace" : "Up to 60 seconds, front camera"}
          </Text>
        </View>
        <Pressable
          onPress={recordVideo}
          accessibilityRole="button"
          accessibilityLabel={videoUri ? "Re-record the video message" : "Record a video message"}
          style={({ pressed }) => ({
            minHeight: 40,
            paddingHorizontal: 16,
            borderWidth: 1,
            borderColor: palette.mist,
            borderRadius: radii.pill,
            justifyContent: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={{ ...type.buttonLabel, fontSize: 11, letterSpacing: 11 * 0.06 }}>
            {videoUri ? "Redo" : "Record"}
          </Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 16 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ ...type.body, fontSize: 15, fontWeight: "600" }}>Background music</Text>
          <Text style={type.bodySecondary}>
            Not available yet — the track library is not licensed for the app.
          </Text>
        </View>
        <Toggle
          value={musicEnabled}
          onValueChange={onMusicChange}
          disabled
          accessibilityLabel="Background music, not available yet"
        />
      </View>

      <Sheet visible={aiOpen} onClose={() => setAiOpen(false)} title="What tone?">
        <Text style={{ ...type.bodySecondary, marginBottom: space.x4 }}>
          It writes a first draft. You edit it — nothing publishes on its own.
        </Text>
        <View style={{ gap: space.x2 }}>
          {TONES.map((t) => (
            <EdButton
              key={t.id}
              title={t.label}
              variant="line"
              loading={drafting}
              onPress={() => draftWith(t.id)}
            />
          ))}
        </View>
      </Sheet>
    </View>
  );
}
