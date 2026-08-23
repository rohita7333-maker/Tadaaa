/**
 * C5 — Schedule & lock.
 *
 * Frame anatomy: three radio rows (Right away / Schedule it / Opens on a date);
 * choosing a scheduled option reveals a NATIVE WHEEL PICKER in a pebble tray —
 * not a web datetime input · a "Time zone" disclosure defaulting to "Theirs" ·
 * an "Add to my calendar" toggle that requests calendar write HERE · a "Lock
 * with a PIN" toggle revealing four 62px digit boxes with auto-advance and the
 * weak-PIN warning.
 *
 * Permissions are requested at the moment of the affirmative tap, never at
 * launch — the same rule A4 applies to notifications.
 */
import { useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Calendar from "expo-calendar";
import { derived, palette } from "@/components/editorial";
import { Toggle } from "@/components/handoff";
import { Sheet } from "@/components/handoff/Sheet";
import { WEAK_PIN_WARNING } from "@/components/handoff/PinLockSheet";
import { PIN_LENGTH, isWeakPin } from "@/lib/pin-gate";
import type { ScheduleMode } from "@/lib/wizard";
import { radii, space, touch, type } from "@/theme/tokens";
import { QUICK_PICKS, defaultScheduledAt, quickPickIso } from "@/lib/schedule-defaults";

const MODES: { id: ScheduleMode; label: string }[] = [
  { id: "now", label: "Right away" },
  { id: "schedule", label: "Schedule it" },
  { id: "opens_on", label: "Opens on a date" },
];

const BOX = 62;

/** The device's own zone, for the "Mine" option. */
function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "your zone";
  } catch {
    return "your zone";
  }
}

export function ScheduleLockStep({
  mode,
  scheduledAt,
  timezone,
  addToCalendar,
  pinEnabled,
  pin,
  pinHint,
  onModeChange,
  onScheduledAtChange,
  onTimezoneChange,
  onAddToCalendarChange,
  onPinEnabledChange,
  onPinChange,
  onPinHintChange,
  onNotify,
}: {
  mode: ScheduleMode;
  scheduledAt: string | null;
  timezone: string | null;
  addToCalendar: boolean;
  pinEnabled: boolean;
  pin: string;
  pinHint: string;
  onModeChange: (m: ScheduleMode) => void;
  onScheduledAtChange: (iso: string | null) => void;
  onTimezoneChange: (tz: string | null) => void;
  onAddToCalendarChange: (v: boolean) => void;
  onPinEnabledChange: (v: boolean) => void;
  onPinChange: (v: string) => void;
  onPinHintChange: (v: string) => void;
  onNotify: (message: string) => void;
}) {
  const [tzOpen, setTzOpen] = useState(false);
  // Android's picker is a dialog, not an inline wheel: it opens on demand and
  // in two passes (date, then time).
  const [androidStage, setAndroidStage] = useState<"date" | "time" | null>(null);

  const value = scheduledAt ? new Date(scheduledAt) : new Date(Date.now() + 86_400_000);
  const scheduled = mode !== "now";

  async function toggleCalendar(next: boolean) {
    if (next) {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== "granted") {
        onNotify("Allow calendar access to add this to your own calendar.");
        return;
      }
    }
    onAddToCalendarChange(next);
  }

  const weak = pin.length === PIN_LENGTH && isWeakPin(pin);

  return (
    <View>
      <View style={{ gap: space.x3, marginBottom: space.x5 }}>
        {MODES.map((m) => {
          const selected = mode === m.id;
          return (
            <Pressable
              key={m.id}
              onPress={() => {
                onModeChange(m.id);
                // The row renders a date the instant a scheduling mode is
                // chosen; without this the draft keeps `null` and Continue
                // fails on a value the creator can see but never picked.
                if (m.id !== "now") onScheduledAtChange(defaultScheduledAt(scheduledAt));
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={m.label}
              style={{
                flexDirection: "row",
                gap: 12,
                alignItems: "center",
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? palette.coral : palette.mist,
                borderRadius: radii.sm,
                paddingVertical: selected ? 14 : 15,
                paddingHorizontal: selected ? 15 : 16,
                minHeight: touch.min,
              }}
            >
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  borderWidth: 1.5,
                  borderColor: selected ? palette.coral : palette.stone,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {selected ? (
                  <View
                    style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: palette.coral }}
                  />
                ) : null}
              </View>
              <Text style={{ ...type.body }}>{m.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {scheduled ? (
        <>
          {/* Quick picks. Faster than a spinner for the three cases that cover
              most surprises, and the ONLY way to set a date on web, where
              `@react-native-community/datetimepicker` has no build at all. */}
          <View style={{ flexDirection: "row", gap: space.x2, marginBottom: space.x3 }}>
            {QUICK_PICKS.map((q) => {
              const iso = quickPickIso(q.id);
              const active = scheduledAt === iso;
              return (
                <Pressable
                  key={q.id}
                  onPress={() => onScheduledAtChange(iso)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={q.label}
                  style={({ pressed }) => ({
                    flex: 1,
                    minHeight: touch.min,
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: radii.pill,
                    borderWidth: active ? 2 : 1,
                    borderColor: active ? palette.coral : palette.mist,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Text style={{ ...type.buttonLabel, fontSize: 11 }}>{q.label}</Text>
                </Pressable>
              );
            })}
          </View>
        <View
          style={{
            backgroundColor: palette.pebble,
            borderRadius: radii.md,
            paddingVertical: 6,
            paddingHorizontal: 4,
            marginBottom: 16,
            alignItems: "center",
          }}
        >
          {Platform.OS === "ios" ? (
            <DateTimePicker
              value={value}
              mode="datetime"
              display="spinner"
              minimumDate={new Date()}
              accessibilityLabel="When it opens"
              onChange={(_, d) => d && onScheduledAtChange(d.toISOString())}
            />
          ) : (
            <>
              <Pressable
                onPress={() => setAndroidStage("date")}
                accessibilityRole="button"
                accessibilityLabel="Pick the date and time it opens"
                style={{ paddingVertical: 14, minHeight: touch.min, justifyContent: "center" }}
              >
                <Text style={{ ...type.body, fontSize: 22 }}>
                  {value.toLocaleString(undefined, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </Text>
              </Pressable>
              {androidStage ? (
                <DateTimePicker
                  value={value}
                  mode={androidStage}
                  minimumDate={androidStage === "date" ? new Date() : undefined}
                  onChange={(event, d) => {
                    if (event.type === "dismissed" || !d) {
                      setAndroidStage(null);
                      return;
                    }
                    onScheduledAtChange(d.toISOString());
                    setAndroidStage(androidStage === "date" ? "time" : null);
                  }}
                />
              ) : null}
            </>
          )}
        </View>
        </>
      ) : null}

      <Pressable
        onPress={() => setTzOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Time zone, currently ${timezone ?? "theirs"}`}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: palette.mist,
          minHeight: touch.min,
        }}
      >
        <Text style={type.body}>Time zone</Text>
        <Text style={{ ...type.body, fontSize: 15, color: palette.stone }}>
          {timezone ? `Mine (${timezone})` : "Theirs"} ›
        </Text>
      </Pressable>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: palette.mist,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ ...type.body, fontSize: 15, fontWeight: "600" }}>Add to my calendar</Text>
          <Text style={type.bodySecondary}>So you&apos;re there when it lands</Text>
        </View>
        <Toggle
          value={addToCalendar}
          onValueChange={toggleCalendar}
          accessibilityLabel="Add to my calendar"
        />
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 16 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ ...type.body, fontSize: 15, fontWeight: "600" }}>Lock with a PIN</Text>
          <Text style={type.bodySecondary}>Four digits before anything shows</Text>
        </View>
        <Toggle
          value={pinEnabled}
          onValueChange={onPinEnabledChange}
          accessibilityLabel="Lock with a PIN"
        />
      </View>

      {pinEnabled ? (
        <View>
          <Pressable style={{ flexDirection: "row", gap: space.x3, marginBottom: 8 }}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: BOX,
                  borderWidth: i === pin.length ? 2 : 1,
                  borderColor: i === pin.length ? palette.coral : palette.mist,
                  borderRadius: radii.sm,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ ...type.statValue, fontSize: 26 }}>{pin[i] ?? ""}</Text>
              </View>
            ))}
            <TextInput
              value={pin}
              onChangeText={(t) => onPinChange(t.replace(/[^0-9]/g, "").slice(0, PIN_LENGTH))}
              keyboardType="number-pad"
              maxLength={PIN_LENGTH}
              accessibilityLabel="PIN, four digits"
              style={{ position: "absolute", opacity: 0, width: "100%", height: BOX }}
            />
          </Pressable>

          {weak ? (
            <Text style={{ ...type.bodySecondary, color: derived.coralDeep, marginBottom: 8 }}>
              {WEAK_PIN_WARNING}
            </Text>
          ) : null}

          <TextInput
            value={pinHint}
            onChangeText={onPinHintChange}
            placeholder="Her birthday — she'll work it out."
            placeholderTextColor={palette.stone}
            maxLength={60}
            accessibilityLabel="PIN hint, optional"
            style={{ ...type.bodySecondary, minHeight: touch.min }}
          />
        </View>
      ) : null}

      <Sheet visible={tzOpen} onClose={() => setTzOpen(false)} title="Whose clock?">
        <Text style={{ ...type.bodySecondary, marginBottom: space.x4 }}>
          Recipient-local is the recommended default — 9:30pm should be 9:30pm where they are.
        </Text>
        <View style={{ gap: space.x2 }}>
          {[
            { tz: null, label: "Theirs (recipient's device)" },
            { tz: deviceTimezone(), label: `Mine (${deviceTimezone()})` },
          ].map((o) => (
            <Pressable
              key={o.label}
              onPress={() => {
                onTimezoneChange(o.tz);
                setTzOpen(false);
              }}
              accessibilityRole="button"
              accessibilityLabel={o.label}
              style={{
                minHeight: touch.control,
                justifyContent: "center",
                paddingHorizontal: 16,
                borderWidth: 1,
                borderColor: timezone === o.tz ? palette.coral : palette.mist,
                borderRadius: radii.md,
              }}
            >
              <Text style={type.body}>{o.label}</Text>
            </Pressable>
          ))}
        </View>
      </Sheet>
    </View>
  );
}
