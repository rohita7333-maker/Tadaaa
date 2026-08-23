/**
 * PolaroidScene — Scene 4: polaroid wall of favourite memories.
 *
 * GRADIENT SEAM CONTRACT: first stop SEAM_PLAN_TO_POLAROID === PlanScene's
 * final stop; final stop SEAM_POLAROID_TO_RSVP === RsvpScene's first stop.
 */
import { View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import type { StoryConfig } from "@/lib/scroll-story/config";
import { Txt } from "@/components/ui";
import { palette } from "@/theme/tokens";
import { SERIF_FONT, SEAM_PLAN_TO_POLAROID, SEAM_POLAROID_TO_RSVP } from "./shared";

const FALLBACK_ROTATIONS = [-6, 5, -3, 7] as const;
const PHOTO_SIZE = 150;

interface PolaroidSceneProps {
  config: StoryConfig;
}

export default function PolaroidScene({ config }: PolaroidSceneProps) {
  if (config.photos.length === 0) return null;

  return (
    <LinearGradient
      colors={[SEAM_PLAN_TO_POLAROID, "#EEE9E6", SEAM_POLAROID_TO_RSVP]}
      locations={[0, 0.55, 1]}
      style={{ paddingHorizontal: 24, paddingVertical: 96 }}
    >
      <View style={{ alignItems: "center" }}>
        <Txt style={{ fontFamily: SERIF_FONT, fontStyle: "italic", fontSize: 17, color: palette.stone }}>
          A few favorites
        </Txt>
      </View>

      <View style={{ marginTop: 24, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 22 }}>
        {config.photos.map((photo, i) => {
          const rotation = photo.rotationDeg ?? FALLBACK_ROTATIONS[i % FALLBACK_ROTATIONS.length];
          return (
            <View
              key={i}
              style={{
                backgroundColor: palette.paper,
                padding: 8,
                paddingBottom: 8,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: palette.mist,
                transform: [{ rotate: `${rotation}deg` }],
                shadowColor: palette.ink,
                shadowOpacity: 0.06,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 4 },
                elevation: 3,
              }}
            >
              {photo.src ? (
                <Image
                  source={{ uri: photo.src }}
                  style={{ width: PHOTO_SIZE, height: PHOTO_SIZE * 1.25, borderRadius: 2 }}
                  contentFit="cover"
                  transition={300}
                />
              ) : (
                <LinearGradient
                  colors={[palette.pebble, palette.mist]}
                  start={{ x: 0.2, y: 0 }}
                  end={{ x: 0.8, y: 1 }}
                  style={{ width: PHOTO_SIZE, height: PHOTO_SIZE * 1.25, borderRadius: 2 }}
                />
              )}
              {photo.caption ? (
                <Txt style={{ marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: palette.mist, fontSize: 11, color: palette.stone }}>
                  {photo.caption}
                </Txt>
              ) : null}
            </View>
          );
        })}
      </View>
    </LinearGradient>
  );
}
