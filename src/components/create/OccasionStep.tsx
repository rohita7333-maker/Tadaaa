import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Lock, PenLine, Sparkles, X } from "lucide-react-native";
import { Field, Txt, colors, fonts, radii, spacing } from "@/components/ui";
import { occasions, themes, gradientStops, type Theme } from "@/lib/themes";
import { aiDraftInvite, hasBackend, type AIDraft, type AITone } from "@/lib/api";

const TONES: { id: AITone; label: string }[] = [
  { id: "warm", label: "Warm" },
  { id: "playful", label: "Playful" },
  { id: "elegant", label: "Elegant" },
  { id: "heartfelt", label: "Heartfelt" },
  { id: "funny", label: "Funny" },
];

interface Props {
  occasionType: string;
  onOccasionChange: (id: string) => void;
  title: string;
  onTitleChange: (v: string) => void;
  selectedTheme: string;
  onThemeChange: (id: string) => void;
  premiumUnlocked: boolean;
  onDraftApplied: (draft: AIDraft) => void;
}

const REVEAL_EMOJI: Record<Theme["revealIcon"], string> = {
  envelope: "✉️",
  gift: "🎁",
  heart: "❤️",
  star: "⭐",
  balloon: "🎈",
};

export default function OccasionStep({
  occasionType,
  onOccasionChange,
  title,
  onTitleChange,
  selectedTheme,
  onThemeChange,
  premiumUnlocked,
  onDraftApplied,
}: Props) {
  const router = useRouter();
  const selectedOcc = occasions.find((o) => o.id === occasionType);
  const hasChips = (selectedOcc?.prompts.length ?? 0) > 0;
  const isCustom = selectedOcc?.id === "custom";

  return (
    <View style={{ gap: spacing.xxl }}>
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Txt variant="h2">What&apos;s the occasion?</Txt>
          <AIDraftButton onDraft={onDraftApplied} />
        </View>
        <Txt variant="body" muted>
          Pick a type — or let AI draft the whole invite for you
        </Txt>
      </View>

      <View style={{ gap: spacing.md }}>
        <Txt variant="label">Occasion</Txt>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {occasions.map((occ) => {
            const selected = occasionType === occ.id;
            return (
              <Pressable
                key={occ.id}
                onPress={() => onOccasionChange(occ.id)}
                style={({ pressed }) => ({
                  width: "31%",
                  paddingVertical: spacing.md,
                  borderRadius: radii.lg,
                  borderWidth: 2,
                  borderColor: selected ? colors.rose : colors.lightGray,
                  backgroundColor: selected ? colors.roseChipBg : colors.white,
                  alignItems: "center",
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                })}
              >
                <Txt style={{ fontSize: 24, marginBottom: 4 }}>{occ.emoji}</Txt>
                <Txt
                  style={{
                    fontFamily: fonts.bodyMedium,
                    fontSize: 11,
                    color: colors.charcoal,
                    textAlign: "center",
                  }}
                >
                  {occ.label}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      </View>

      {selectedOcc && (
        <View style={{ gap: spacing.md }}>
          {hasChips && (
            <View style={{ gap: spacing.sm }}>
              <Txt variant="body" muted style={{ fontSize: 12 }}>
                Quick-fill suggestions:
              </Txt>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                {selectedOcc.prompts.map((p) => {
                  const isSelected = title.trim() === p;
                  return (
                    <Pressable
                      key={p}
                      onPress={() => onTitleChange(p)}
                      style={({ pressed }) => ({
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: radii.pill,
                        borderWidth: 1,
                        borderColor: isSelected ? colors.rose : colors.lightGray,
                        backgroundColor: isSelected ? colors.roseChipBg : colors.white,
                        transform: [{ scale: pressed ? 0.96 : 1 }],
                      })}
                    >
                      <Txt
                        style={{
                          fontFamily: fonts.bodyMedium,
                          fontSize: 12,
                          color: isSelected ? colors.roseDeep : colors.warmGray,
                        }}
                      >
                        {p}
                      </Txt>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <PenLine size={12} color={colors.warmGray} />
              <Txt variant="body" muted style={{ fontSize: 12 }}>
                {isCustom ? "Write your own message" : hasChips ? "Or write your own" : "Write your own message"}
              </Txt>
            </View>
            <Field
              value={title}
              onChangeText={onTitleChange}
              placeholder={isCustom ? "e.g. Will you be my maid of honor?" : "Type your own line…"}
            />
          </View>
        </View>
      )}

      <View style={{ gap: spacing.md }}>
        <Txt variant="h3">Choose a theme</Txt>
        <Txt variant="body" muted>
          Pick the vibe that matches your surprise. 3 free themes included.
        </Txt>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
          {themes.map((theme) => {
            const isSelected = selectedTheme === theme.id;
            const isUnlocked = !theme.isPremium || premiumUnlocked;
            const stops = gradientStops(theme);
            return (
              <Pressable
                key={theme.id}
                onPress={() => {
                  if (isUnlocked) {
                    onThemeChange(theme.id);
                  } else {
                    Alert.alert(
                      "Premium theme",
                      `Unlock "${theme.name}" and every premium theme with Unlimited.`,
                      [
                        { text: "Not now", style: "cancel" },
                        { text: "See plans", onPress: () => router.push("/pricing") },
                      ]
                    );
                  }
                }}
                style={({ pressed }) => ({
                  width: "47%",
                  borderRadius: radii.lg,
                  overflow: "hidden",
                  borderWidth: 2,
                  borderColor: isSelected ? colors.rose : "transparent",
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <LinearGradient
                  colors={stops as [string, string, ...string[]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ height: 72, alignItems: "center", justifyContent: "center" }}
                >
                  <Txt style={{ fontSize: 26 }}>{REVEAL_EMOJI[theme.revealIcon]}</Txt>
                </LinearGradient>
                <View style={{ backgroundColor: colors.white, padding: spacing.sm, gap: 2 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 4 }}>
                    <Txt style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.charcoal, flex: 1 }}>
                      {theme.name}
                    </Txt>
                    {theme.isPremium && !isUnlocked && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 2,
                          backgroundColor: colors.goldChipBg,
                          borderColor: colors.goldChipBorder,
                          borderWidth: 1,
                          borderRadius: radii.pill,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                        }}
                      >
                        <Lock size={9} color={colors.goldChipText} />
                        <Txt style={{ fontFamily: fonts.bodyMedium, fontSize: 9, color: colors.goldChipText }}>
                          ${theme.price.toFixed(2)}
                        </Txt>
                      </View>
                    )}
                  </View>
                  <Txt style={{ fontFamily: fonts.body, fontSize: 10.5, color: colors.warmGray }} numberOfLines={1}>
                    {theme.description}
                  </Txt>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// AI draft — small inline panel, guarded by hasBackend.
// ---------------------------------------------------------------------------
function AIDraftButton({ onDraft }: { onDraft: (d: AIDraft) => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [occasion, setOccasion] = useState("");
  const [tone, setTone] = useState<AITone>("warm");

  if (!hasBackend) {
    return (
      <Pressable
        onPress={() =>
          Alert.alert("AI draft unavailable", "Connect the TaDaaaa backend to draft invites with AI.")
        }
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          paddingHorizontal: 10,
          paddingVertical: 7,
          borderRadius: radii.pill,
          backgroundColor: colors.lightGray,
          opacity: 0.6,
        }}
      >
        <Sparkles size={13} color={colors.warmGray} />
        <Txt style={{ fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.warmGray }}>Draft with AI</Txt>
      </Pressable>
    );
  }

  if (!open) {
    return (
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: radii.pill,
          backgroundColor: colors.charcoal,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        })}
      >
        <Sparkles size={13} color="#fff" />
        <Txt style={{ fontFamily: fonts.bodyMedium, fontSize: 11, color: "#fff" }}>Draft with AI</Txt>
      </Pressable>
    );
  }

  async function go() {
    if (!occasion.trim()) return;
    setLoading(true);
    try {
      const draft = await aiDraftInvite({
        occasion: occasion.trim(),
        recipient: recipient.trim() || "someone special",
        tone,
      });
      onDraft(draft);
      setOpen(false);
    } catch (e) {
      Alert.alert("Draft failed", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View
      style={{
        position: "absolute",
        top: 30,
        right: 0,
        zIndex: 10,
        width: 260,
        backgroundColor: colors.white,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.hair,
        padding: spacing.md,
        gap: spacing.sm,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Txt variant="title">AI Invite Drafter</Txt>
        <Pressable onPress={() => setOpen(false)} hitSlop={8}>
          <X size={16} color={colors.warmGray} />
        </Pressable>
      </View>
      <Field
        value={recipient}
        onChangeText={setRecipient}
        placeholder="Who's it for? (e.g. Mom)"
        maxLength={50}
      />
      <Field
        value={occasion}
        onChangeText={setOccasion}
        placeholder="Occasion (e.g. 60th birthday)"
        maxLength={80}
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {TONES.map((t) => {
          const on = tone === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => setTone(t.id)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: radii.pill,
                backgroundColor: on ? colors.rose : colors.cream,
                borderWidth: 1,
                borderColor: on ? colors.rose : colors.hair,
              }}
            >
              <Txt style={{ fontFamily: fonts.bodyMedium, fontSize: 11, color: on ? "#fff" : colors.warmGray }}>
                {t.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        onPress={go}
        disabled={loading || !occasion.trim()}
        style={{
          height: 38,
          borderRadius: radii.pill,
          backgroundColor: colors.charcoal,
          alignItems: "center",
          justifyContent: "center",
          opacity: loading || !occasion.trim() ? 0.5 : 1,
        }}
      >
        <Txt style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, color: "#fff" }}>
          {loading ? "Drafting…" : "Generate"}
        </Txt>
      </Pressable>
    </View>
  );
}
