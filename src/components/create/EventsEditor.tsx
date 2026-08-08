import { Pressable, View } from "react-native";
import { MapPin, Plus, Trash2 } from "lucide-react-native";
import { Field, Txt, colors, fonts, radii, spacing } from "@/components/ui";
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
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <MapPin size={16} color={colors.rose} />
          <Txt variant="h3">The plan (optional)</Txt>
        </View>
        <Txt variant="body" muted>
          Add up to {MAX_EVENTS} plaques to the cinematic scroll — the when, the where, the
          little details. Leave it empty and the story shows a single countdown plaque instead.
        </Txt>
      </View>

      <View style={{ gap: spacing.md }}>
        {events.map((event, i) => (
          <View
            key={i}
            style={{
              backgroundColor: colors.cream,
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: colors.hair,
              padding: spacing.md,
              gap: spacing.sm,
            }}
          >
            <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <Txt style={{ fontFamily: fonts.bodyBold, fontSize: 9.5, color: colors.roseDeep, letterSpacing: 0.5 }}>
                  LABEL
                </Txt>
                <View style={{ marginTop: 4 }}>
                  <Field
                    value={event.label}
                    onChangeText={(v) => updateEvent(i, { label: v.slice(0, MAX_LABEL) })}
                    placeholder="When"
                    maxLength={MAX_LABEL}
                    accessibilityLabel={`Plaque ${i + 1} label`}
                  />
                </View>
              </View>
              <Pressable
                onPress={() => removeEvent(i)}
                accessibilityRole="button"
                accessibilityLabel={`Remove plaque ${i + 1}`}
                style={{
                  marginTop: 22,
                  width: 40,
                  height: 40,
                  borderRadius: radii.pill,
                  borderWidth: 1,
                  borderColor: colors.lightGray,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Trash2 size={15} color={colors.rose} />
              </Pressable>
            </View>

            <Field
              label="Title"
              value={event.title}
              onChangeText={(v) => updateEvent(i, { title: v.slice(0, MAX_TITLE) })}
              placeholder="Saturday, October 24 · 5:30 PM"
              maxLength={MAX_TITLE}
              accessibilityLabel={`Plaque ${i + 1} title`}
            />

            <Field
              label="Detail (optional)"
              value={event.detail ?? ""}
              onChangeText={(v) => updateEvent(i, { detail: v.slice(0, MAX_DETAIL) })}
              placeholder="golden hour, sharp"
              maxLength={MAX_DETAIL}
              accessibilityLabel={`Plaque ${i + 1} detail`}
            />

            <Field
              label="Map location (optional)"
              value={event.mapsQuery ?? ""}
              onChangeText={(v) => updateEvent(i, { mapsQuery: v.slice(0, MAX_MAPS) })}
              placeholder="Sunset Terrace, Jubilee Hills, Hyderabad"
              maxLength={MAX_MAPS}
              accessibilityLabel={`Plaque ${i + 1} map location`}
            />
          </View>
        ))}
      </View>

      {events.length < MAX_EVENTS && (
        <Pressable
          onPress={addEvent}
          accessibilityRole="button"
          accessibilityLabel="Add plaque"
          style={({ pressed }) => ({
            height: 44,
            borderRadius: radii.pill,
            borderWidth: 1.5,
            borderStyle: "dashed",
            borderColor: colors.rose,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 6,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Plus size={15} color={colors.rose} />
          <Txt style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.rose }}>
            Add plaque{events.length > 0 ? ` (${events.length}/${MAX_EVENTS})` : ""}
          </Txt>
        </Pressable>
      )}
    </View>
  );
}
