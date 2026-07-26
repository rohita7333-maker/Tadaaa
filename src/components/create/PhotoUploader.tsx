import { useCallback } from "react";
import { Alert, Image, Pressable, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { ImagePlus, X } from "lucide-react-native";
import { Field, Txt, colors, fonts, radii, spacing } from "@/components/ui";
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

interface Props {
  photos: DraftPhoto[];
  onPhotosChange: (photos: DraftPhoto[]) => void;
}

export default function PhotoUploader({ photos, onPhotosChange }: Props) {
  const pick = useCallback(async () => {
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      Alert.alert("Maximum photos", `You can add up to ${MAX_PHOTOS} photos.`);
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo library access to add pictures.");
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
    for (const asset of result.assets) {
      if (next.length >= MAX_PHOTOS) break;
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
        Alert.alert("Couldn't process photo", "Skipped one photo — please try again.");
      }
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
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Txt variant="label">Photos</Txt>
        <Txt variant="body" muted style={{ fontSize: 11 }}>
          {photos.length}/{MAX_PHOTOS}
        </Txt>
      </View>

      {photos.length < MAX_PHOTOS && (
        <Pressable
          onPress={pick}
          style={({ pressed }) => ({
            borderWidth: 2,
            borderStyle: "dashed",
            borderColor: colors.lightGray,
            borderRadius: radii.lg,
            paddingVertical: spacing.xl,
            alignItems: "center",
            gap: 6,
            backgroundColor: colors.cream,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <ImagePlus size={26} color={colors.rose} />
          <Txt style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.charcoal }}>
            Tap to add photos
          </Txt>
          <Txt variant="body" muted style={{ fontSize: 11 }}>
            JPEG, PNG, WebP
          </Txt>
        </Pressable>
      )}

      {photos.length > 0 && (
        <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
          {photos.map((photo, idx) => (
            <View
              key={photo.id}
              style={{
                flexDirection: "row",
                gap: spacing.sm,
                backgroundColor: colors.white,
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: colors.hair,
                padding: spacing.sm,
              }}
            >
              <View
                style={{
                  width: 76,
                  backgroundColor: "#fff",
                  padding: 5,
                  paddingBottom: 12,
                  borderRadius: 4,
                  transform: [{ rotate: `${photo.rotationDeg}deg` }],
                }}
              >
                <Image
                  source={{ uri: photo.uri }}
                  style={{ width: "100%", aspectRatio: 1, borderRadius: 2 }}
                  resizeMode="cover"
                />
              </View>
              <View style={{ flex: 1, justifyContent: "center", gap: 4 }}>
                {idx === 0 && (
                  <Txt style={{ fontFamily: fonts.bodyBold, fontSize: 9, color: colors.rose, letterSpacing: 0.6 }}>
                    COVER PHOTO
                  </Txt>
                )}
                <Field
                  value={photo.caption}
                  onChangeText={(v) => updateCaption(photo.id, v)}
                  placeholder="Write something sweet…"
                  maxLength={120}
                  style={{ fontFamily: fonts.hand, fontSize: 15, paddingVertical: 8 }}
                />
              </View>
              <Pressable
                onPress={() => removePhoto(photo.id)}
                hitSlop={8}
                style={{
                  alignSelf: "flex-start",
                  width: 22,
                  height: 22,
                  borderRadius: radii.pill,
                  backgroundColor: colors.roseChipBg,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={11} color={colors.rose} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
