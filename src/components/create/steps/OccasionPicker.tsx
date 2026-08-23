/**
 * C1 — Occasion.
 *
 * Frame anatomy: six selectable rows, each a 26px icon, an 18px serif name and a
 * 13px stone description; the selected row takes a 2px coral border with its
 * padding reduced by 1 so nothing shifts. Under the list, a coral
 * "Not sure? Let AI pick →" opens the vibe sheet (Warm & cosy / Romantic /
 * Fun & loud / Elegant), which REORDERS the six rather than choosing for you.
 *
 * DEVIATION — icons. The frames use plain geometric placeholders and the handoff
 * says to replace them with a real set; these are Lucide at the 1.4px stroke
 * weight the handoff specifies, matching the web app's inline SVGs.
 */
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Cake, Check, Heart, HeartHandshake, Plus, Send, Sparkles } from "lucide-react-native";
import { derived, palette } from "@/components/editorial";
import { Sheet } from "@/components/handoff/Sheet";
import {
  AI_VIBES,
  HANDOFF_OCCASIONS,
  occasionsForVibe,
  type HandoffOccasion,
  type VibeId,
} from "@/lib/occasions";
import { radii, space, touch, type } from "@/theme/tokens";

const ICON = 26;
const STROKE = 1.4;
/** Matches the id cap in `toOccasionId`, so nothing typed is silently lost. */
const CUSTOM_OCCASION_INPUT_MAX = 60;

const ICONS: Record<string, typeof Cake> = {
  birthday: Cake,
  anniversary: Heart,
  date: Send,
  festival: Sparkles,
  apology: HeartHandshake,
  custom: Plus,
};

export function OccasionPicker({
  value,
  onChange,
  customOccasion,
  onCustomOccasionChange,
  customError,
}: {
  value: string;
  onChange: (id: string) => void;
  /** C1's Custom row, in the creator's own words. */
  customOccasion: string;
  onCustomOccasionChange: (v: string) => void;
  customError?: string | null;
}) {
  const [vibeOpen, setVibeOpen] = useState(false);
  const [order, setOrder] = useState<readonly HandoffOccasion[]>(HANDOFF_OCCASIONS);

  function applyVibe(vibe: VibeId) {
    // Reorders only. Auto-selecting on the user's behalf here is how someone
    // ends up publishing an anniversary page for a birthday.
    setOrder(occasionsForVibe(vibe));
    setVibeOpen(false);
  }

  return (
    <View>
      <View style={{ gap: space.x3 }}>
        {order.map((o) => {
          const Icon = ICONS[o.id] ?? Plus;
          const selected = value === o.id;
          return (
            <Pressable
              key={o.id}
              onPress={() => onChange(o.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${o.label}. ${o.description}`}
              style={({ pressed }) => ({
                flexDirection: "row",
                gap: space.x4,
                alignItems: "center",
                borderRadius: radii.md,
                // Selection is 1px mist → 2px coral with padding −1, so the row
                // never moves when it is chosen.
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? palette.coral : palette.mist,
                paddingVertical: selected ? 15 : 16,
                paddingHorizontal: selected ? 16 : 17,
                minHeight: touch.min,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Icon size={ICON} color={palette.ink} strokeWidth={STROKE} />
              <View style={{ flex: 1 }}>
                <Text style={{ ...type.screenTitle, fontSize: 18, lineHeight: 18 * 1.2 }}>
                  {o.label}
                </Text>
                <Text style={type.bodySecondary}>{o.description}</Text>
              </View>
              {/* DEVIATION from frame C1, deliberate. The frame's only cue for
                  a chosen row is 1px mist → 2px coral, which is ~3.9:1 on
                  paper and reads at 2x in a screenshot but not at 1x on a
                  phone in daylight — reported as "everything looks the same
                  once the user clicks on it". A filled check adds a second,
                  non-colour cue without moving anything. */}
              {selected ? (
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: derived.coralDeep,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Check size={14} color={palette.paper} strokeWidth={2.5} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {/* The Custom row was a label that did nothing: picking it published
          `occasion_type = 'custom'` and the recipient's eyebrow read the word
          "Custom". Naming it is what makes the row mean anything. */}
      {value === "custom" ? (
        <View style={{ marginTop: space.x3 }}>
          <Text style={{ ...type.fieldLabel, marginBottom: 7 }}>What&apos;s the occasion?</Text>
          <TextInput
            value={customOccasion}
            onChangeText={onCustomOccasionChange}
            placeholder="Graduation"
            placeholderTextColor={palette.stone}
            maxLength={CUSTOM_OCCASION_INPUT_MAX}
            accessibilityLabel="Name your custom occasion"
            style={{
              minHeight: touch.control,
              borderWidth: customError ? 2 : 1,
              borderColor: customError ? palette.coral : palette.mist,
              borderRadius: radii.sm,
              paddingHorizontal: customError ? 14 : 15,
              ...type.body,
              fontSize: 17,
            }}
          />
          {customError ? (
            <Text style={{ ...type.bodySecondary, color: derived.coralDeep, marginTop: 6 }}>
              {customError}
            </Text>
          ) : (
            <Text style={{ ...type.bodySecondary, marginTop: 6 }}>
              This is what they&apos;ll see above the title.
            </Text>
          )}
        </View>
      ) : null}

      <Pressable
        onPress={() => setVibeOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Not sure? Let AI pick an occasion"
        style={({ pressed }) => ({
          alignItems: "center",
          marginTop: space.x5,
          minHeight: touch.min,
          justifyContent: "center",
          opacity: pressed ? 0.6 : 1,
        })}
      >
        {/* coralDeep: plain coral is 3.94:1 on paper and this is 14px. */}
        <Text style={{ ...type.body, fontSize: 14, fontWeight: "600", color: derived.coralDeep }}>
          Not sure? Let AI pick →
        </Text>
      </Pressable>

      <Sheet visible={vibeOpen} onClose={() => setVibeOpen(false)} title="What's the vibe?">
        <Text style={{ ...type.bodySecondary, marginBottom: space.x4 }}>
          This only reorders the list — you still choose.
        </Text>
        <View style={{ gap: space.x2 }}>
          {AI_VIBES.map((v) => (
            <Pressable
              key={v.id}
              onPress={() => applyVibe(v.id)}
              accessibilityRole="button"
              accessibilityLabel={v.label}
              style={({ pressed }) => ({
                minHeight: touch.control,
                justifyContent: "center",
                paddingHorizontal: 16,
                borderWidth: 1,
                borderColor: palette.mist,
                borderRadius: radii.md,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ ...type.body, fontSize: 16 }}>{v.label}</Text>
            </Pressable>
          ))}
        </View>
      </Sheet>
    </View>
  );
}
