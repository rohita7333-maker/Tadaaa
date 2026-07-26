import { useState } from "react";
import { Pressable, Share, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import { Check, ExternalLink } from "lucide-react-native";
import { useRouter } from "expo-router";
import { Button, Txt, colors, fonts, radii, spacing } from "@/components/ui";
import { getThemeById, gradientStops } from "@/lib/themes";
import { ENV } from "@/lib/env";

interface Props {
  title: string;
  message: string;
  themeId: string;
  revealType: "tap" | "countdown";
  photoCount: number;
  questionCount: number;
  tier: string;
  publishing: boolean;
  onPublish: () => Promise<{ slug: string } | null>;
}

export default function PreviewPublish({
  title,
  message,
  themeId,
  revealType,
  photoCount,
  questionCount,
  tier,
  publishing,
  onPublish,
}: Props) {
  const router = useRouter();
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const theme = getThemeById(themeId);
  const stops = theme ? gradientStops(theme) : [colors.roseLight, colors.rose];
  const link = publishedSlug ? `${ENV.siteUrl || "https://tadaaaa.app"}/surprise/${publishedSlug}` : "";

  async function handlePublish() {
    const result = await onPublish();
    if (result) setPublishedSlug(result.slug);
  }

  if (publishedSlug) {
    return (
      <View style={{ alignItems: "center", gap: spacing.lg, paddingVertical: spacing.xl }}>
        <View
          style={{
            width: 76,
            height: 76,
            borderRadius: radii.pill,
            backgroundColor: colors.greenChipText,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Check size={36} color="#fff" />
        </View>
        <View style={{ gap: 6, alignItems: "center" }}>
          <Txt variant="h2" style={{ textAlign: "center" }}>
            Your surprise is ready! ✨
          </Txt>
          <Txt variant="body" muted style={{ textAlign: "center", maxWidth: 260 }}>
            Share this link with the lucky person. They&apos;ll have no idea what&apos;s waiting for them!
          </Txt>
        </View>

        <View
          style={{
            width: "100%",
            backgroundColor: colors.cream,
            borderWidth: 1,
            borderColor: colors.hair,
            borderRadius: radii.lg,
            padding: spacing.md,
            gap: 6,
          }}
        >
          <Txt style={{ fontFamily: fonts.bodyBold, fontSize: 10, color: colors.warmGray, letterSpacing: 0.6 }}>
            SHAREABLE LINK
          </Txt>
          <Txt style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.charcoal }}>{link}</Txt>
        </View>

        <View style={{ width: "100%", gap: spacing.sm }}>
          <Button
            title="Share"
            onPress={() => {
              Share.share({ message: `${title} — ${link}`, url: link }).catch(() => {});
            }}
          />
          <Button
            title="Copy link"
            variant="outline"
            onPress={() => {
              Clipboard.setStringAsync(link).catch(() => {});
            }}
          />
          <Pressable
            onPress={() => router.replace({ pathname: "/surprise/[slug]", params: { slug: publishedSlug } })}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              height: 44,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <ExternalLink size={15} color={colors.charcoal} />
            <Txt style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.charcoal }}>Preview it</Txt>
          </Pressable>
        </View>

        {tier === "free" && (
          <Txt variant="body" muted style={{ textAlign: "center", fontSize: 11, paddingHorizontal: spacing.md }}>
            This surprise stays live for 28 days after it&apos;s opened. Upgrade to keep it forever.
          </Txt>
        )}
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: 4 }}>
        <Txt variant="h2">Preview &amp; Publish</Txt>
        <Txt variant="body" muted>
          Here&apos;s how your surprise will look. Ready to share?
        </Txt>
      </View>

      <LinearGradient
        colors={stops as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: radii.xl, padding: spacing.xxl, alignItems: "center", gap: 8, minHeight: 180, justifyContent: "center" }}
      >
        <Txt style={{ fontSize: 34 }}>
          {theme?.revealIcon === "envelope"
            ? "✉️"
            : theme?.revealIcon === "gift"
              ? "🎁"
              : theme?.revealIcon === "heart"
                ? "❤️"
                : theme?.revealIcon === "star"
                  ? "⭐"
                  : "🎈"}
        </Txt>
        <Txt
          style={{
            fontFamily: fonts.headingSemi,
            fontSize: 17,
            textAlign: "center",
            color: theme?.colors.text ?? colors.charcoal,
          }}
        >
          {title || "Your surprise title"}
        </Txt>
        <Txt
          style={{
            fontFamily: fonts.body,
            fontSize: 12,
            textAlign: "center",
            opacity: 0.75,
            color: theme?.colors.text ?? colors.charcoal,
          }}
          numberOfLines={3}
        >
          {message || "Your message will appear here."}
        </Txt>
      </LinearGradient>

      <View
        style={{
          backgroundColor: colors.cream,
          borderRadius: radii.lg,
          padding: spacing.md,
          gap: spacing.xs,
        }}
      >
        <SummaryRow label="Theme" value={theme?.name ?? "—"} />
        <SummaryRow label="Photos" value={String(photoCount)} />
        <SummaryRow label="Questions" value={String(questionCount)} />
        <SummaryRow label="Reveal" value={revealType === "tap" ? "Tap to reveal" : "Countdown"} />
      </View>

      {tier === "free" && (
        <View
          style={{
            backgroundColor: "#FFF0E8",
            borderWidth: 1,
            borderColor: colors.hair,
            borderRadius: radii.md,
            padding: spacing.sm,
          }}
        >
          <Txt variant="body" muted style={{ fontSize: 11.5 }}>
            ⏳ Free surprises stay live for 28 days after they&apos;re opened. Upgrade to keep yours forever.
          </Txt>
        </View>
      )}

      <Button title="✨ Publish Your Surprise" onPress={handlePublish} loading={publishing} />
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Txt variant="body" muted style={{ fontSize: 12.5 }}>
        {label}
      </Txt>
      <Txt style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.charcoal }}>{value}</Txt>
    </View>
  );
}
