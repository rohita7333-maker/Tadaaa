/**
 * C2's photo strip — 78×96 thumbnails with a 20px remove badge, a dashed
 * "+ Add" tile, and a caption sheet.
 *
 * On-device resize to 1200px longest edge at JPEG q0.8 before upload, same as
 * web's canvas step, via `expo-image-manipulator`.
 *
 * DEVIATION — reordering. The frame says "Drag to reorder · tap a photo to
 * caption it". Reordering ships as explicit Move left / Move right inside the
 * caption sheet rather than a drag gesture. Two reasons: a drag-to-reorder
 * strip needs a gesture-handler + Reanimated shared-value rig that is its own
 * feature, and drag is unusable under VoiceOver and Switch Control — so the
 * buttons would have had to exist anyway. The hint line says what actually
 * works.
 */
import { useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { EdButton, palette } from "@/components/editorial";
import { Sheet } from "@/components/handoff/Sheet";
import { CAPTION_MAX, type WizardPhoto } from "@/lib/wizard";
import { PHOTO_MAX_DIMENSION } from "@/lib/constants";
import { radii, space, touch, type } from "@/theme/tokens";

const THUMB_W = 78;
const THUMB_H = 96;
const BADGE = 20;

export function PhotoStrip({
  photos,
  limit,
  onChange,
  onNotify,
}: {
  photos: WizardPhoto[];
  limit: number;
  onChange: (next: WizardPhoto[]) => void;
  onNotify: (message: string) => void;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function pick() {
    const remaining = limit - photos.length;
    if (remaining <= 0) {
      onNotify(`That's the ${limit}-photo limit on your plan.`);
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      onNotify("Allow photo library access to add pictures.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.9,
    });
    if (result.canceled || result.assets.length === 0) return;

    setBusy(true);
    const next = [...photos];
    try {
      for (const asset of result.assets) {
        if (next.length >= limit) break;
        const rendered = await ImageManipulator.manipulate(asset.uri)
          .resize({ width: PHOTO_MAX_DIMENSION })
          .renderAsync();
        const saved = await rendered.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
        next.push({
          uri: saved.uri,
          caption: "",
          ext: "jpg",
          mimeType: "image/jpeg",
          // Slight, deterministic-per-slot tilt: the reveal renders these as
          // polaroids and a perfectly square stack reads as a contact sheet.
          rotationDeg: ((next.length % 5) - 2) * 1.2,
        });
      }
      onChange(next);
    } catch {
      onNotify("One of those photos couldn't be prepared. Try another.");
    } finally {
      setBusy(false);
    }
  }

  function remove(i: number) {
    onChange(photos.filter((_, idx) => idx !== i));
    setEditing(null);
  }

  function move(i: number, delta: number) {
    const target = i + delta;
    if (target < 0 || target >= photos.length) return;
    const next = [...photos];
    [next[i], next[target]] = [next[target], next[i]];
    onChange(next);
    setEditing(target);
  }

  function setCaption(i: number, caption: string) {
    onChange(photos.map((p, idx) => (idx === i ? { ...p, caption } : p)));
  }

  const current = editing === null ? null : photos[editing];

  return (
    <View>
      <Text style={{ ...type.fieldLabel, marginBottom: space.x2 }}>
        {`Photos · ${photos.length} of ${limit}`}
      </Text>

      <View style={{ flexDirection: "row", gap: space.x2, flexWrap: "wrap" }}>
        {photos.map((p, i) => (
          <Pressable
            key={`${p.uri}-${i}`}
            onPress={() => setEditing(i)}
            accessibilityRole="button"
            accessibilityLabel={
              p.caption ? `Photo ${i + 1}, captioned ${p.caption}` : `Photo ${i + 1}, no caption`
            }
            accessibilityHint="Opens caption and reorder"
            style={{ width: THUMB_W, height: THUMB_H, borderRadius: radii.sm, overflow: "hidden" }}
          >
            <Image source={{ uri: p.uri }} style={{ width: "100%", height: "100%" }} />
            <View
              // Ink at .75 over arbitrary photography — the frame's own value,
              // and the ✕ is paper on it at 12.4:1.
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                width: BADGE,
                height: BADGE,
                borderRadius: BADGE / 2,
                backgroundColor: "rgba(26,26,26,0.75)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 10, color: palette.paper }}>✕</Text>
            </View>
          </Pressable>
        ))}

        {photos.length < limit ? (
          <Pressable
            onPress={pick}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Add photos"
            style={({ pressed }) => ({
              width: THUMB_W,
              height: THUMB_H,
              borderWidth: 1.5,
              borderStyle: "dashed",
              borderColor: palette.mist,
              borderRadius: radii.sm,
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              opacity: busy ? 0.5 : pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ fontSize: 22, fontWeight: "300", color: palette.stone }}>+</Text>
            <Text style={{ ...type.buttonLabel, fontSize: 9, letterSpacing: 9 * 0.06, color: palette.stone }}>
              Add
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={{ ...type.bodySecondary, fontSize: 12, marginTop: space.x2 }}>
        Tap a photo to caption it or move it
      </Text>

      <Sheet visible={editing !== null} onClose={() => setEditing(null)} title="Photo">
        {current ? (
          <View>
            <Image
              source={{ uri: current.uri }}
              style={{ width: "100%", height: 180, borderRadius: radii.sm, marginBottom: space.x4 }}
            />
            <Text style={{ ...type.fieldLabel, marginBottom: space.x2 }}>Caption</Text>
            <TextInput
              value={current.caption}
              onChangeText={(t) => setCaption(editing!, t)}
              placeholder="Goa, 2019"
              placeholderTextColor={palette.stone}
              maxLength={CAPTION_MAX}
              multiline
              accessibilityLabel="Photo caption"
              style={{
                minHeight: touch.control,
                borderWidth: 1,
                borderColor: palette.mist,
                borderRadius: radii.sm,
                paddingHorizontal: 15,
                paddingVertical: 12,
                ...type.body,
              }}
            />
            <Text style={{ ...type.bodySecondary, fontSize: 12, textAlign: "right", marginTop: 5 }}>
              {current.caption.length}/{CAPTION_MAX}
            </Text>

            <View style={{ flexDirection: "row", gap: space.x2, marginTop: space.x4 }}>
              <View style={{ flex: 1 }}>
                <EdButton
                  title="Move left"
                  variant="line"
                  disabled={editing === 0}
                  onPress={() => move(editing!, -1)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <EdButton
                  title="Move right"
                  variant="line"
                  disabled={editing === photos.length - 1}
                  onPress={() => move(editing!, 1)}
                />
              </View>
            </View>
            <View style={{ marginTop: space.x3 }}>
              <EdButton title="Remove photo" variant="danger" onPress={() => remove(editing!)} />
            </View>
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}
