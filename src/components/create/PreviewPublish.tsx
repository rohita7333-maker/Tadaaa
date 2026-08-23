/**
 * `w6` in `tadaaaa/tadaaaa-editorial.html` — "Preview & finalize": the `.mini`
 * phone still, the `.sumcard` rows, the `.progressbar`, and a `.btn-coral`
 * block action. Coral is spent here and only here in the wizard, which is what
 * the identity reserves it for.
 *
 * Publish behaviour is unchanged: `onPublish` still owns the premium gate,
 * Stripe checkout, monthly-limit check, photo commit and question insert.
 */
import { useState } from "react";
import { Share, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Check, ExternalLink } from "lucide-react-native";
import { useRouter } from "expo-router";
import {
  Body,
  EdButton,
  EdProgressBar,
  EdSummaryCard,
  Heading,
  fieldStyles,
  fonts,
  palette,
  radii,
} from "@/components/editorial";
import { spacing } from "@/components/ui";
import StepHead from "@/components/create/StepHead";
import { getThemeById } from "@/lib/themes";
// Web reads every reveal label from this one map; so does mobile now. The
// second, contradicting map that used to live in this file is gone.
import { REVEAL_STYLE_LABELS } from "@/lib/templates";
import { ENV } from "@/lib/env";

interface Props {
  title: string;
  message: string;
  themeId: string;
  revealType: "tap" | "countdown" | "scroll_story";
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
  const link = publishedSlug ? `${ENV.siteUrl || "https://tadaaaa.app"}/surprise/${publishedSlug}` : "";

  async function handlePublish() {
    const result = await onPublish();
    if (result) setPublishedSlug(result.slug);
  }

  if (publishedSlug) {
    return (
      <View style={{ gap: spacing.lg }}>
        <View style={{ alignItems: "center", gap: spacing.md, paddingTop: spacing.md }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: radii.pill,
              borderWidth: 1,
              borderColor: palette.mist,
              backgroundColor: palette.paper,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Check size={26} color={palette.coral} strokeWidth={1.8} />
          </View>
          {/* Web: 30px `Your surprise is live.` */}
          <Heading size={30} style={{ textAlign: "center" }}>
            Your surprise is live.
          </Heading>
          <Body size={14} style={{ textAlign: "center", maxWidth: 280 }}>
            Send the link. They will have no idea what is waiting.
          </Body>
        </View>

        <View
          style={{
            backgroundColor: palette.paper,
            borderWidth: 1,
            borderColor: palette.mist,
            borderRadius: radii.md,
            padding: 16,
            gap: 6,
          }}
        >
          <Text style={fieldStyles.label}>Shareable link</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.ink }}>{link}</Text>
        </View>

        <View style={{ gap: spacing.sm }}>
          <EdButton
            title="Share"
            variant="coral"
            onPress={() => {
              Share.share({ message: `${title} — ${link}`, url: link }).catch(() => {});
            }}
          />
          <EdButton
            title="Copy link"
            variant="line"
            onPress={() => {
              Clipboard.setStringAsync(link).catch(() => {});
            }}
          />
          <EdButton
            title="Preview"
            variant="line"
            left={<ExternalLink size={15} color={palette.ink} />}
            onPress={() =>
              router.replace({ pathname: "/surprise/[slug]", params: { slug: publishedSlug } })
            }
          />
        </View>

        {tier === "free" ? (
          <Body size={13} style={{ textAlign: "center" }}>
            This surprise stays live for 28 days after it is opened. Upgrade to keep it forever.
          </Body>
        ) : null}
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.lg }}>
      <StepHead title="Preview & finalize" sub="See it exactly as they will. Then decide." />

      {/* `.mini .scr` — the ink-ground still of the reveal. */}
      <View
        style={{
          borderWidth: 1,
          borderColor: palette.mist,
          borderRadius: radii.md,
          padding: 8,
          backgroundColor: palette.paper,
        }}
      >
        <View
          style={{
            borderRadius: radii.md,
            backgroundColor: palette.ink,
            paddingVertical: 34,
            paddingHorizontal: 22,
            alignItems: "center",
            gap: 8,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 10,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              color: palette.sand,
            }}
          >
            {theme?.name ?? "TaDaaaa"}
          </Text>
          <Text
            numberOfLines={2}
            style={{
              fontFamily: fonts.heading,
              fontWeight: "400",
              fontSize: 22,
              color: palette.paper,
              textAlign: "center",
            }}
          >
            {title || "Their name"}
          </Text>
          <Text
            numberOfLines={3}
            style={{
              fontFamily: fonts.body,
              fontSize: 12,
              lineHeight: 19,
              color: "rgba(255,255,254,0.75)",
              textAlign: "center",
            }}
          >
            {message || "Your message will appear here."}
          </Text>
        </View>
      </View>

      <EdSummaryCard
        rows={[
          { key: "Title", value: title || "Untitled" },
          { key: "Look", value: theme?.name ?? "—" },
          { key: "Reveal", value: REVEAL_STYLE_LABELS[revealType] },
          { key: "Photos", value: String(photoCount) },
          { key: "Questions", value: String(questionCount) },
        ]}
      />

      {tier === "free" ? (
        <Body size={13}>
          Free surprises stay live for 28 days after they are opened. After that the link expires. Upgrade to keep yours forever.
        </Body>
      ) : null}

      <EdButton
        title={publishing ? "Publishing…" : "Publish your surprise"}
        variant="coral"
        loading={publishing}
        onPress={handlePublish}
      />
      {publishing ? <EdProgressBar progress={0.6} /> : null}
    </View>
  );
}
