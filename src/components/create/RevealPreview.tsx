/**
 * C6 — "Play full preview", and C4's "tap a tile to watch it".
 *
 * Both were dead. `onPlayPreview` opened the C2/C3 Peek sheet, which lists the
 * title, a placeholder line and a photo count; `onPreview` was `() => {}` while
 * the tile's own accessibility hint promised "Opens a full-screen demo with
 * your own words". This plays the actual reveal, with the creator's own title,
 * message and photos, using the same components the recipient will see.
 *
 * Nothing here may write. The draft has no row, so every component is rendered
 * in `preview` mode: `RevealOpen` skips `recordAnswer`/`recordRsvp`,
 * `ScrollStoryReveal` runs without an `inviteId` and without the reaction bar,
 * and `CountdownClosed` is given no slug so its Live Activity offer — which
 * captures an email — never mounts.
 */
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Body, Heading, palette } from "@/components/editorial";
import { REVEAL_GROUND } from "@/components/reveal/chrome";
import TapClosed from "@/components/reveal/TapClosed";
import CountdownClosed from "@/components/reveal/CountdownClosed";
import RevealOpen from "@/components/reveal/RevealOpen";
import ScrollStoryReveal from "@/components/reveal/scrollstory/ScrollStoryReveal";
import { previewPhotoUrls, previewRevealData } from "@/lib/preview-reveal";
import { inviteToStoryConfig } from "@/lib/scroll-story/from-invite";
import { occasionLabel } from "@/lib/occasions";
import { getThemeById, themes } from "@/lib/themes";
import { publishOccasionType, type WizardDraft } from "@/lib/wizard";
import { type } from "@/theme/tokens";

/** An hour out, so the digits are worth looking at when nothing is scheduled. */
const FALLBACK_COUNTDOWN_MS = 3600_000;

export function RevealPreview({
  visible,
  draft,
  slug,
  reduced,
  onClose,
}: {
  visible: boolean;
  draft: WizardDraft;
  slug: string;
  reduced: boolean;
  onClose: () => void;
}) {
  /** Every open starts closed, so the reveal is watched, not resumed. */
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    if (visible) setOpened(false);
  }, [visible]);

  const insets = useSafeAreaInsets();
  const data = previewRevealData(draft, slug);
  const photoUrls = previewPhotoUrls(draft);
  const theme = getThemeById(draft.themeId) ?? themes[0];
  const label = occasionLabel(publishOccasionType(draft)) || undefined;

  function body() {
    if (draft.revealStyle === "letters") {
      // Honest rather than empty: the wizard never collects letters, so there
      // is nothing to play. Saying so beats a blank screen that reads as a bug.
      return (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 10 }}
        >
          <Heading size={26} style={{ color: palette.paper, textAlign: "center" }}>
            Letters are written after publishing.
          </Heading>
          <Body size={14} style={{ color: palette.sand, textAlign: "center" }}>
            You&apos;ll add each one, and what it&apos;s for, from the surprise&apos;s own screen.
          </Body>
        </View>
      );
    }

    if (draft.revealStyle === "scroll") {
      const config = {
        ...inviteToStoryConfig(
          {
            slug,
            title: data.invite.title,
            message: data.invite.message,
            countdown_date: data.invite.countdown_date,
            is_paid: false,
            photos: [],
            events: data.invite.events,
          },
          { occasionLabel: label }
        ),
        photos: draft.photos.map((p) => ({
          src: p.uri,
          caption: p.caption || undefined,
          rotationDeg: p.rotationDeg,
        })),
      };
      // No `inviteId`: RsvpScene is then demo-only and records nothing.
      return <ScrollStoryReveal config={config} slug={slug} preview />;
    }

    if (!opened) {
      return draft.revealStyle === "countdown" ? (
        <CountdownClosed
          targetIso={data.invite.countdown_date ?? new Date(Date.now() + FALLBACK_COUNTDOWN_MS).toISOString()}
          title={data.invite.title}
          message={data.invite.message}
          onReachZero={() => setOpened(true)}
        />
      ) : (
        <TapClosed
          title={data.invite.title}
          theme={theme}
          reduced={reduced}
          onOpen={() => setOpened(true)}
        />
      );
    }

    return (
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 76, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <RevealOpen
          data={data}
          photoUrls={photoUrls}
          reduced={reduced}
          occasionLabel={label}
          preview
        />
      </ScrollView>
    );
  }

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} transparent={false}>
      <View style={REVEAL_GROUND}>
        {body()}

        {/* Above everything, always reachable — the scroll story and the
            countdown both own their full screen. */}
        <View
          style={{
            position: "absolute",
            top: insets.top + 6,
            left: 20,
            right: 20,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
          pointerEvents="box-none"
        >
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close the preview"
            hitSlop={12}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <Text style={{ fontSize: 24, color: palette.paper }}>✕</Text>
          </Pressable>
          <Text style={{ ...type.revealMicroLabel, letterSpacing: 11 * 0.14 }}>PREVIEW</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>
    </Modal>
  );
}

