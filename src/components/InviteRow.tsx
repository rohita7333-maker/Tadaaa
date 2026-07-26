import { Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Eye, Heart } from "lucide-react-native";
import { Chip, Txt, colors, radii, shadows } from "@/components/ui";
import { getThemeById, gradientStops } from "@/lib/themes";
import { getOccasionById } from "@/lib/themes";
import type { Invite } from "@/lib/db";

export function inviteStatus(invite: Invite): { label: string; tone: "green" | "gold" | "rose" | "neutral" } {
  if (!invite.is_active) return { label: "Paused", tone: "neutral" };
  if (invite.expires_at && new Date(invite.expires_at) < new Date())
    return { label: "Expired", tone: "rose" };
  if (invite.revealed_at) return { label: "Revealed", tone: "green" };
  return { label: "Live", tone: "gold" };
}

export function InviteRow({ invite, onPress }: { invite: Invite; onPress: () => void }) {
  const theme = getThemeById(invite.theme);
  const occasion = getOccasionById(invite.occasion_type);
  const status = inviteStatus(invite);
  const stops = theme ? gradientStops(theme) : [colors.roseLight, colors.rose];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          padding: 12,
          borderRadius: radii.lg,
          backgroundColor: colors.white,
          borderWidth: 1,
          borderColor: colors.hair,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        shadows.sm,
      ]}
    >
      <LinearGradient colors={stops as [string, string]} style={{ width: 50, height: 50, borderRadius: radii.md, alignItems: "center", justifyContent: "center" }}>
        <Txt style={{ fontSize: 22 }}>{occasion?.emoji ?? "💌"}</Txt>
      </LinearGradient>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Txt variant="title" numberOfLines={1}>{invite.title}</Txt>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Eye size={13} color={colors.warmGray} />
            <Txt variant="body" muted style={{ fontSize: 11.5 }}>{invite.view_count ?? 0}</Txt>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Heart size={13} color={colors.warmGray} />
            <Txt variant="body" muted style={{ fontSize: 11.5 }}>{invite.response_count ?? 0}</Txt>
          </View>
        </View>
      </View>
      <Chip label={status.label} tone={status.tone} />
    </Pressable>
  );
}
