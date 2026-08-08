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
import { Txt, fonts } from "@/components/ui";
import { HAND_FONT, SEAM_PLAN_TO_POLAROID, SEAM_POLAROID_TO_RSVP } from "./shared";

const FALLBACK_ROTATIONS = [-6, 5, -3, 7] as const;
const PLACEHOLDER_EMOJI = ["📸", "💛", "🎈", "✨"] as const;
const PHOTO_SIZE = 150;

interface PolaroidSceneProps {
  config: StoryConfig;
}

export default function PolaroidScene({ config }: PolaroidSceneProps) {
  if (config.photos.length === 0) return null;

  return (
    <LinearGradient
      colors={[SEAM_PLAN_TO_POLAROID, "#F2DAD3", SEAM_POLAROID_TO_RSVP]}
      locations={[0, 0.55, 1]}
      style={{ paddingHorizontal: 24, paddingVertical: 96 }}
    >
      <View style={{ alignItems: "center", gap: 4 }}>
        <Txt style={{ fontFamily: HAND_FONT, fontSize: 24, color: "#9B3D42" }}>a few of my favourites</Txt>
        <Txt style={{ fontFamily: fonts.heading, fontWeight: "600" as const, fontSize: 32, color: "#2D2926" }}>
          Us, so far
        </Txt>
      </View>

      <View style={{ marginTop: 40, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 22 }}>
        {config.photos.map((photo, i) => {
          const rotation = photo.rotationDeg ?? FALLBACK_ROTATIONS[i % FALLBACK_ROTATIONS.length];
          return (
            <View
              key={i}
              style={{
                backgroundColor: "#fff",
                padding: 8,
                paddingBottom: 20,
                borderRadius: 4,
                transform: [{ rotate: `${rotation}deg` }],
                shadowColor: "#2D2926",
                shadowOpacity: 0.18,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 8 },
                elevation: 6,
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
                  colors={["#E8A5A8", "#C4686D", "#C9A96E"]}
                  style={{ width: PHOTO_SIZE, height: PHOTO_SIZE * 1.25, borderRadius: 2, alignItems: "center", justifyContent: "center" }}
                >
                  <Txt style={{ fontSize: 40 }}>{PLACEHOLDER_EMOJI[i % PLACEHOLDER_EMOJI.length]}</Txt>
                </LinearGradient>
              )}
              {photo.caption ? (
                <Txt style={{ marginTop: 10, fontFamily: HAND_FONT, fontSize: 16, textAlign: "center", color: "#2D2926" }}>
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
