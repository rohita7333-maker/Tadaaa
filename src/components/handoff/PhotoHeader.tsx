/**
 * PhotoHeader — frame B2's 290px header.
 *
 * Frame anatomy: full-bleed photo, a two-stop ink gradient over it, 40px
 * translucent circular nav buttons, and bottom-aligned metadata (sand eyebrow,
 * 30px serif title, coral dot + status line).
 *
 * DEVIATION — the artwork.
 *
 * The frame shows a licensed Unsplash photo, and the handoff's own open
 * question #2 ("Who licenses the theme artwork?") is unanswered, so there is no
 * theme photo to render. Precedence here is:
 *
 *   1. the creator's own first uploaded photo (real content beats stock), then
 *   2. the theme's gradient, which is parity-locked with web and already the
 *      ground every reveal uses.
 *
 * A missing-image box is never rendered. When licensing lands, only `photoUri`
 * needs a new source.
 */
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { palette, overlay, radii, type } from "@/theme/tokens";

export const PHOTO_HEADER_HEIGHT = 290;

/** Frame B2's own scrim: .55 → .1 at 40% → .85. Not the reveal scrim. */
const HEADER_SCRIM = ["rgba(26,26,26,0.55)", "rgba(26,26,26,0.1)", "rgba(26,26,26,0.85)"] as const;
const HEADER_SCRIM_STOPS = [0, 0.4, 1] as const;

const NAV = 40;

export function HeaderNavButton({
  children,
  onPress,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({
        width: NAV,
        height: NAV,
        borderRadius: NAV / 2,
        backgroundColor: overlay.borderSoft,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {children}
    </Pressable>
  );
}

export interface PhotoHeaderProps {
  /** Signed URL of the creator's first photo, when one exists. */
  photoUri?: string | null;
  /** Theme gradient stops — the fallback ground. At least two colours. */
  gradient: string[];
  eyebrow: string;
  title: string;
  statusLine: string;
  /** Coral dot beside the status line — live only, per the frame. */
  showLiveDot: boolean;
  onBack: () => void;
  onMenu: () => void;
  /** Rendered over the scrim between the nav row and the metadata. */
  children?: ReactNode;
}

export function PhotoHeader({
  photoUri,
  gradient,
  eyebrow,
  title,
  statusLine,
  showLiveDot,
  onBack,
  onMenu,
  children,
}: PhotoHeaderProps) {
  return (
    <View style={{ height: PHOTO_HEADER_HEIGHT, backgroundColor: palette.ink }}>
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          style={{ position: "absolute", inset: 0 }}
          contentFit="cover"
          transition={200}
          accessible={false}
        />
      ) : (
        <LinearGradient
          colors={gradient as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: "absolute", inset: 0 }}
        />
      )}

      <LinearGradient
        colors={HEADER_SCRIM as unknown as [string, string, ...string[]]}
        locations={HEADER_SCRIM_STOPS as unknown as [number, number, ...number[]]}
        style={{ position: "absolute", inset: 0 }}
      />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingTop: 6,
        }}
      >
        <HeaderNavButton onPress={onBack} accessibilityLabel="Back">
          <Text style={{ fontSize: 24, color: palette.paper, lineHeight: 26 }}>‹</Text>
        </HeaderNavButton>
        <HeaderNavButton onPress={onMenu} accessibilityLabel="More actions">
          <Text style={{ fontSize: 18, fontWeight: "600", color: palette.paper }}>···</Text>
        </HeaderNavButton>
      </View>

      {children}

      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 20, paddingTop: 0 }}>
        <Text style={{ ...type.revealMicroLabel, letterSpacing: 10 * 0.14 }}>{eyebrow}</Text>
        <Text style={{ ...type.revealHeadline, fontSize: 30, lineHeight: 30 * 1.1, marginTop: 6 }}>
          {title}
        </Text>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center", marginTop: 9 }}>
          {showLiveDot && (
            <View
              style={{ width: 7, height: 7, borderRadius: radii.pill, backgroundColor: palette.coral }}
            />
          )}
          <Text style={{ ...type.body, fontSize: 13, color: overlay.textStrong }}>{statusLine}</Text>
        </View>
      </View>
    </View>
  );
}
