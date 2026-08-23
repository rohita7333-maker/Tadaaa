/**
 * `w1` in `tadaaaa/tadaaaa-editorial.html` — `.occsel` / `.ocard` (a stacked
 * list of whole-row options, each a 26px stroked glyph + `h4` + `p`), the
 * "Not sure? Let AI pick for you" `.tlink`, and a `.field` for the title.
 *
 * The mockup has no theme grid on this step (it sells looks through Templates),
 * but the shipped wizard does, so the grid stays and is re-skinned: paper tile,
 * mist hairline, the theme's own two accent stops as a swatch band, coral 2px
 * when selected. No emoji, no rainbow gradient — the editorial identity bans
 * both. Selection remains free; entitlement is still settled once at publish.
 */
import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { Award, Cake, Flower2, Heart, MessageSquare, Plus, Sparkles, X } from "lucide-react-native";
import {
  Body,
  EdButton,
  EdCounter,
  EdField,
  Label,
  EdSelectCard,
  TextLink,
  derived,
  fonts,
  palette,
  radii,
} from "@/components/editorial";
import { spacing } from "@/components/ui";
import StepHead from "@/components/create/StepHead";
import { occasions, themes, type Theme } from "@/lib/themes";
import { MAX_TITLE_LENGTH } from "@/lib/constants";
import { aiDraftInvite, ApiError, hasBackend, type AIDraft, type AITone } from "@/lib/api";
import { aiDraftErrorMessage, AI_DRAFT_SUCCESS } from "@/lib/ai-draft-errors";

const TONES: { id: AITone; label: string }[] = [
  { id: "warm", label: "Warm" },
  { id: "playful", label: "Playful" },
  { id: "elegant", label: "Elegant" },
  { id: "heartfelt", label: "Heartfelt" },
  { id: "funny", label: "Funny" },
];

/** The mockup's `OICON` set, resolved to the icon family already in the app. */
const OCCASION_ICON: Record<string, typeof Heart> = {
  date: Heart,
  birthday: Cake,
  festival: Sparkles,
  mothers_day: Flower2,
  fathers_day: Award,
  apology: MessageSquare,
  custom: Plus,
};

/** One line per occasion — verbatim from web `OccasionSelector.tsx` OBLURB. */
const OCCASION_SUB: Record<string, string> = {
  date: "Make the ask impossible to refuse.",
  birthday: "Cake, candles, everyone in on it.",
  festival: "Lights, family, the whole crew.",
  mothers_day: "The thank-you she never asks for.",
  fathers_day: "A thank-you he will not expect.",
  apology: "Say it properly this time.",
  custom: "Any moment worth a reveal.",
};

interface Props {
  occasionType: string;
  onOccasionChange: (id: string) => void;
  title: string;
  onTitleChange: (v: string) => void;
  selectedTheme: string;
  onThemeChange: (id: string) => void;
  premiumUnlocked: boolean;
  onDraftApplied: (draft: AIDraft) => void;
  /**
   * Transient messages go UP to the screen, which owns the single toast host in
   * `Screen`'s `overlay` slot. A child cannot render its own toast: `Screen`
   * puts children inside a ScrollView, so an absolutely-positioned element here
   * would scroll away with the content instead of pinning to the viewport.
   * One toast host per screen, not one per component.
   */
  onNotify: (message: string) => void;
}

export default function OccasionStep({
  occasionType,
  onOccasionChange,
  title,
  onTitleChange,
  selectedTheme,
  onThemeChange,
  premiumUnlocked,
  onDraftApplied,
  onNotify,
}: Props) {
  const [drafterOpen, setDrafterOpen] = useState(false);
  const selectedOcc = occasions.find((o) => o.id === occasionType);
  const prompts = selectedOcc?.prompts ?? [];

  return (
    <View style={{ gap: spacing.xxl }}>
      <View>
        <StepHead
          title="What's the occasion?"
          sub="One selection. It shapes the tone of everything after."
        />

        <View style={{ gap: 10 }}>
          {occasions.map((occ) => {
            const Icon = OCCASION_ICON[occ.id] ?? Plus;
            const selected = occasionType === occ.id;
            return (
              <EdSelectCard
                key={occ.id}
                selected={selected}
                onPress={() => onOccasionChange(occ.id)}
                title={occ.label}
                sub={OCCASION_SUB[occ.id]}
                left={<Icon size={26} color={palette.ink} strokeWidth={1.4} />}
              />
            );
          })}
        </View>

        <TextLink
          title="Draft with AI"
          align="left"
          style={{ marginTop: 8 }}
          onPress={() => {
            if (!hasBackend) {
              onNotify("Connect the TaDaaaa backend to draft invites with AI.");
              return;
            }
            setDrafterOpen(true);
          }}
        />
        {drafterOpen ? (
          <AIDrafter
            onClose={() => setDrafterOpen(false)}
            onDraft={(d) => {
              onDraftApplied(d);
              onNotify(AI_DRAFT_SUCCESS);
            }}
            onNotify={onNotify}
          />
        ) : null}
      </View>

      <View>
        {/* Web orders this chips-then-input, under `Quick-fill` and
            `Or write your own` (`components/create/OccasionSelector.tsx:104,129`).
            Mobile had the input first and neither label. */}
        {prompts.length > 0 ? (
          <>
            <Label style={{ marginBottom: 7 }}>Quick-fill</Label>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            {prompts.map((p) => {
              const on = title.trim() === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => onTitleChange(p)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`Use the title ${p}`}
                  hitSlop={8}
                  style={{
                    minHeight: 36,
                    justifyContent: "center",
                    paddingHorizontal: 12,
                    borderRadius: radii.pill,
                    borderWidth: 1,
                    borderColor: on ? palette.ink : palette.mist,
                    backgroundColor: on ? palette.ink : palette.paper,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 13,
                      color: on ? palette.paper : palette.stone,
                    }}
                  >
                    {p}
                  </Text>
                </Pressable>
              );
            })}
            </View>
          </>
        ) : null}

        <EdField
          label={prompts.length > 0 ? "Or write your own" : "Write your own"}
          value={title}
          onChangeText={(v) => onTitleChange(v.slice(0, MAX_TITLE_LENGTH))}
          placeholder={
            occasionType === "custom" ? "Will you be my maid of honour?" : "Type your own line…"
          }
        />
        <EdCounter used={title.length} max={MAX_TITLE_LENGTH} />
      </View>

      <View style={{ gap: 12 }}>
        <StepHead
          title="Choose a theme"
          sub="The colour the whole reveal is built from. Three are free."
        />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {themes.map((theme) => (
            <ThemeTile
              key={theme.id}
              theme={theme}
              selected={selectedTheme === theme.id}
              locked={theme.isPremium && !premiumUnlocked}
              onPress={() => onThemeChange(theme.id)}
            />
          ))}
        </View>
      </View>

    </View>
  );
}

/* --------------------------------------------------------------- theme tile */

function ThemeTile({
  theme,
  selected,
  locked,
  onPress,
}: {
  theme: Theme;
  selected: boolean;
  locked: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${theme.name}. ${theme.description}${locked ? ". Premium" : ""}`}
      style={{
        width: "47%",
        borderRadius: radii.md,
        overflow: "hidden",
        backgroundColor: palette.paper,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? palette.coral : palette.mist,
      }}
    >
      {/* Two stops of the theme's own palette, read as a specimen band rather
          than a decorative gradient. */}
      <View style={{ flexDirection: "row", height: 44 }}>
        <View style={{ flex: 1, backgroundColor: theme.colors.accentLight }} />
        <View style={{ flex: 1, backgroundColor: theme.colors.accent }} />
        <View style={{ flex: 1, backgroundColor: theme.colors.background }} />
      </View>
      <View style={{ padding: 10, gap: 3 }}>
        <Text
          numberOfLines={1}
          style={{ fontFamily: fonts.heading, fontWeight: "400", fontSize: 15, color: palette.ink }}
        >
          {theme.name}
        </Text>
        <Text numberOfLines={2} style={{ fontFamily: fonts.body, fontSize: 11, color: palette.stone }}>
          {theme.description}
        </Text>
        {/* Web labels the tier on EVERY tile, not just the locked ones
            (`components/create/ThemeSelector.tsx:75`), so a free theme reads as
            free rather than as an unlabelled default. */}
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: 11,
            fontWeight: "600",
            color: theme.isPremium ? derived.coralDeep : palette.stone,
            marginTop: 2,
          }}
        >
          {theme.isPremium ? (locked ? "Premium" : "Premium · unlocked") : "Free"}
        </Text>
      </View>
    </Pressable>
  );
}

/* -------------------------------------------------------------- AI drafter */

function AIDrafter({
  onClose,
  onDraft,
  onNotify,
}: {
  onClose: () => void;
  onDraft: (d: AIDraft) => void;
  /** Web toasts drafter failures rather than blocking on a modal. */
  onNotify: (message: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [occasion, setOccasion] = useState("");
  const [details, setDetails] = useState("");
  const [tone, setTone] = useState<AITone>("warm");

  async function go() {
    if (!occasion.trim()) return;
    setLoading(true);
    try {
      const draft = await aiDraftInvite({
        occasion: occasion.trim(),
        recipient: recipient.trim() || "someone special",
        tone,
        details: details.trim() || undefined,
      });
      onDraft(draft);
      onClose();
    } catch (e) {
      // `post()` throws ApiError carrying the HTTP status, so mobile can tell
      // the user WHICH failure happened — the same four cases web distinguishes.
      onNotify(aiDraftErrorMessage(e instanceof ApiError ? e.status : undefined));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View
      style={{
        marginTop: 12,
        backgroundColor: palette.paper,
        borderWidth: 1,
        borderColor: palette.mist,
        borderRadius: radii.md,
        padding: 18,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Body size={14} tone="ink" style={{ fontWeight: "600" }}>
          AI Invite Drafter
        </Body>
        <Pressable onPress={onClose} hitSlop={14} accessibilityRole="button" accessibilityLabel="Close">
          <X size={16} color={palette.stone} />
        </Pressable>
      </View>
      <EdField
        label="Who's it for?"
        value={recipient}
        onChangeText={setRecipient}
        placeholder="Who's it for? (e.g. Mom, best friend)"
        maxLength={50}
      />
      <EdField
        label="Occasion"
        value={occasion}
        onChangeText={setOccasion}
        placeholder="Occasion (e.g. 60th birthday, surprise homecoming)"
        maxLength={80}
      />
      {/* Optional, exactly as on web — `aiDraftInvite` already accepts `details`. */}
      <EdField
        label="Details"
        value={details}
        onChangeText={setDetails}
        placeholder="Any extra details? Optional, e.g. loves hiking, she'll be nervous"
        maxLength={200}
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {TONES.map((t) => {
          const on = tone === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => setTone(t.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              hitSlop={8}
              style={{
                minHeight: 36,
                justifyContent: "center",
                paddingHorizontal: 12,
                borderRadius: radii.pill,
                borderWidth: 1,
                borderColor: on ? palette.ink : palette.mist,
                backgroundColor: on ? palette.ink : palette.paper,
              }}
            >
              <Text
                style={{ fontFamily: fonts.body, fontSize: 13, color: on ? palette.paper : palette.stone }}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <EdButton
        title={loading ? "Drafting…" : "Generate"}
        variant="ink"
        loading={loading}
        disabled={!occasion.trim()}
        onPress={go}
      />
    </View>
  );
}
