/**
 * The Scroll Story "plan" plaques — the `.plq` blocks the reveal renders in
 * `s-plan`. Editorial skin only; the caps and the blank-row filtering at publish
 * (`create/index.tsx`) are unchanged, and `eventsSchema` is still the gate.
 */
import { Pressable, Text, View } from "react-native";
import { Plus, Trash2 } from "lucide-react-native";
import {
  Body,
  EdField,
  TOUCH_MIN,
  derived,
  Label,
  fieldStyles,
  fonts,
  palette,
  radii,
} from "@/components/editorial";
import { spacing } from "@/components/ui";
import type { StoryEventInput } from "@/lib/schemas";

// Field length caps mirror eventsSchema so the UI can never build an invalid
// payload. eventsSchema re-validates at publish + inside createInviteRow (there
// is no server step on mobile), so these are UX guardrails, not the gate.
const MAX_EVENTS = 4;
const MAX_LABEL = 30;
const MAX_TITLE = 80;
const MAX_DETAIL = 120;
const MAX_MAPS = 120;

const EMPTY_EVENT: StoryEventInput = { label: "", title: "", detail: "", mapsQuery: "" };

interface Props {
  events: StoryEventInput[];
  onEventsChange: (events: StoryEventInput[]) => void;
}

export default function EventsEditor({ events, onEventsChange }: Props) {
  function addEvent() {
    if (events.length >= MAX_EVENTS) return;
    onEventsChange([...events, { ...EMPTY_EVENT }]);
  }
  function removeEvent(index: number) {
    onEventsChange(events.filter((_, i) => i !== index));
  }
  function updateEvent(index: number, patch: Partial<StoryEventInput>) {
    onEventsChange(events.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: 6 }}>
        <Text style={fieldStyles.label}>The plan</Text>
        <Body size={13}>
          Up to four plaques in the cinematic scroll: the when, the where, the little details.
          Leave it empty and the story shows a single countdown plaque instead.
        </Body>
      </View>

      {events.map((event, i) => (
        <View
          key={i}
          style={{
            backgroundColor: palette.paper,
            borderWidth: 1,
            borderColor: palette.mist,
            borderRadius: radii.md,
            padding: 16,
            gap: 14,
          }}
        >
          <Label>Plaque {i + 1}</Label>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-end" }}>
            <View style={{ flex: 1 }}>
              <EdField
                label="Label"
                value={event.label}
                onChangeText={(v) => updateEvent(i, { label: v.slice(0, MAX_LABEL) })}
                placeholder="Saturday"
                maxLength={MAX_LABEL}
                accessibilityLabel={`Plaque ${i + 1} label`}
              />
            </View>
            <Pressable
              onPress={() => removeEvent(i)}
              accessibilityRole="button"
              accessibilityLabel={`Remove plaque ${i + 1}`}
              style={({ pressed }) => ({
                width: TOUCH_MIN,
                height: TOUCH_MIN,
                borderRadius: radii.sm,
                borderWidth: 1,
                borderColor: pressed ? derived.coralDeep : palette.mist,
                alignItems: "center",
                justifyContent: "center",
              })}
            >
              <Trash2 size={15} color={derived.coralDeep} />
            </Pressable>
          </View>

          <EdField
            label="Title"
            value={event.title}
            onChangeText={(v) => updateEvent(i, { title: v.slice(0, MAX_TITLE) })}
            placeholder="Saturday, October 24 · 5:30 PM"
            maxLength={MAX_TITLE}
            accessibilityLabel={`Plaque ${i + 1} title`}
          />

          <EdField
            label="Detail (optional)"
            value={event.detail ?? ""}
            onChangeText={(v) => updateEvent(i, { detail: v.slice(0, MAX_DETAIL) })}
            placeholder="golden hour, sharp"
            maxLength={MAX_DETAIL}
            accessibilityLabel={`Plaque ${i + 1} detail`}
          />

          <EdField
            label="Map location (optional)"
            value={event.mapsQuery ?? ""}
            onChangeText={(v) => updateEvent(i, { mapsQuery: v.slice(0, MAX_MAPS) })}
            placeholder="Sunset Terrace, Jubilee Hills, Hyderabad"
            maxLength={MAX_MAPS}
            accessibilityLabel={`Plaque ${i + 1} map location`}
          />
        </View>
      ))}

      {events.length < MAX_EVENTS ? (
        <Pressable
          onPress={addEvent}
          accessibilityRole="button"
          accessibilityLabel="Add plaque"
          style={({ pressed }) => ({
            minHeight: TOUCH_MIN,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            borderRadius: radii.md,
            borderWidth: 1.5,
            borderStyle: "dashed",
            borderColor: pressed ? palette.coral : palette.mist,
            backgroundColor: palette.paper,
          })}
        >
          <Plus size={15} color={palette.ink} />
          <Text style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: "600", color: palette.ink }}>
            Add plaque{events.length > 0 ? `  ${events.length}/${MAX_EVENTS}` : ""}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
