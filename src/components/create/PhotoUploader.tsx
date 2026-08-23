/**
 * `w2`'s photo block in `tadaaaa/tadaaaa-editorial.html` — the `.drop` target,
 * the `.upbar` progress rule, and the `.thumbs` strip of 116px tiles with an
 * inline caption input and a round remove control.
 *
 * Behaviour is untouched from the shipped version: same permission prompt, same
 * `ImageManipulator` resize to `PHOTO_MAX_DIMENSION` + 0.8 JPEG compression,
 * same `DraftPhoto` shape consumed by the wizard's signed-URL upload path.
 */
import { useCallback, useState } from "react";
import { Alert, Image, Pressable, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { X } from "lucide-react-native";
import {
  EdDropZone,
  EdProgressBar,
  fieldStyles,
  fonts,
  palette,
  radii,
} from "@/components/editorial";
import { spacing } from "@/components/ui";
import { MAX_PHOTOS, PHOTO_MAX_DIMENSION } from "@/lib/constants";

export interface DraftPhoto {
  id: string;
  uri: string;
  caption: string;
  rotationDeg: number;
  ext: string;
  mimeType: string;
}

function randomRotation(): number {
  return Math.round((Math.random() * 6 - 3) * 10) / 10;
}

const THUMB_WIDTH = 116;
const THUMB_IMAGE_HEIGHT = 86;

interface Props {
  photos: DraftPhoto[];
  onPhotosChange: (photos: DraftPhoto[]) => void;
  /** Transient messages go up to the screen's single toast host. */
  onNotify: (message: string) => void;
}

export default function PhotoUploader({ photos, onPhotosChange, onNotify }: Props) {
  // `.upbar` — the mockup shows on-device compression progress, which is the
  // only long step here too (the network PUT happens later, at publish).
  const [processing, setProcessing] = useState(0);

  const pick = useCallback(async () => {
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      onNotify(`Maximum ${MAX_PHOTOS} photos allowed`);
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

    const next: DraftPhoto[] = [...photos];
    const total = result.assets.length;
    try {
      for (let i = 0; i < result.assets.length; i++) {
        const asset = result.assets[i];
        if (next.length >= MAX_PHOTOS) break;
        setProcessing((i + 1) / total);
        try {
          const rendered = await ImageManipulator.manipulate(asset.uri)
            .resize({ width: PHOTO_MAX_DIMENSION })
            .renderAsync();
          const saved = await rendered.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
          next.push({
            id: `${Date.now()}-${Math.random()}`,
            uri: saved.uri,
            caption: "",
            rotationDeg: randomRotation(),
            ext: "jpg",
            mimeType: "image/jpeg",
          });
        } catch {
          onNotify("Failed to process photo. Please try again.");
        }
      }
    } finally {
      setProcessing(0);
    }
    onPhotosChange(next);
  }, [photos, onPhotosChange]);

  function removePhoto(id: string) {
    onPhotosChange(photos.filter((p) => p.id !== id));
  }

  function updateCaption(id: string, caption: string) {
    onPhotosChange(photos.map((p) => (p.id === id ? { ...p, caption } : p)));
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={fieldStyles.label}>Photos</Text>

      <EdDropZone
        title="Drop photos or click to browse"
        hint={`Compressed to ${PHOTO_MAX_DIMENSION}px on device · up to ${MAX_PHOTOS}`}
        onPress={pick}
        disabled={photos.length >= MAX_PHOTOS}
        accessibilityLabel={`Add photos. ${photos.length} of ${MAX_PHOTOS} added.`}
      />

      {processing > 0 ? (
        <View style={{ marginTop: 10 }}>
          <EdProgressBar progress={processing} />
        </View>
      ) : null}

      {photos.length > 0 ? (
        <>
          <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.stone, marginTop: 8 }}>
            {photos.length}/{MAX_PHOTOS} · drag to reorder
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
            {photos.map((photo, idx) => (
              <View
                key={photo.id}
                style={{
                  width: THUMB_WIDTH,
                  borderRadius: radii.sm,
                  borderWidth: 1,
                  borderColor: palette.mist,
                  backgroundColor: palette.paper,
                  overflow: "hidden",
                }}
              >
                <View style={{ height: THUMB_IMAGE_HEIGHT }}>
                  <Image
                    source={{ uri: photo.uri }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                    accessibilityLabel={`Photo ${idx + 1}`}
                  />
                  <Pressable
                    onPress={() => removePhoto(photo.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove photo ${idx + 1}`}
                    // 20px control per `.thumbs .t .x`; hitSlop brings the real
                    // target to 44pt without changing the drawn size.
                    hitSlop={12}
                    style={{
                      position: "absolute",
                      top: 3,
                      right: 3,
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: "rgba(26,26,26,0.75)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <X size={11} color={palette.paper} strokeWidth={2.2} />
                  </Pressable>
                </View>
                <TextInput
                  value={photo.caption}
                  onChangeText={(v) => updateCaption(photo.id, v.slice(0, 120))}
                  placeholder="Caption…"
                  placeholderTextColor={palette.stone}
                  accessibilityLabel={`Caption for photo ${idx + 1}`}
                  maxLength={120}
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 11,
                    color: palette.stone,
                    paddingVertical: 7,
                    paddingHorizontal: 8,
                    borderTopWidth: 1,
                    borderTopColor: palette.mist,
                  }}
                />
              </View>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}
