/**
 * D7 — Waiting room (opened too early).
 *
 * The recipient followed the link before the surprise opens. The frame gives
 * them three things: a Days / Hours / Mins row, a promise, and an email capture
 * — because email is the only way to reach someone who has nothing installed.
 *
 * The countdown is derived from an absolute target on every tick, never
 * accumulated, so backgrounding the app cannot drift it. Same rule as D4.
 */
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { palette, overlay, radii, space, screenPadding, touch, type } from "@/theme/tokens";

interface Remaining {
  days: number;
  hours: number;
  mins: number;
  done: boolean;
}

/** Derived from the target every call — never a decrementing counter. */
export function remainingUntil(targetIso: string, now: number = Date.now()): Remaining {
  const diff = new Date(targetIso).getTime() - now;
  if (!Number.isFinite(diff) || diff <= 0) return { days: 0, hours: 0, mins: 0, done: true };
  const mins = Math.floor(diff / 60_000);
  return {
    days: Math.floor(mins / 1440),
    hours: Math.floor((mins % 1440) / 60),
    mins: mins % 60,
    done: false,
  };
}

/**
 * Shared with D4's Live Activity offer card, which falls back to the same email
 * capture when ActivityKit is unavailable. One implementation, so the two
 * cannot drift on what counts as a valid address.
 */
export async function requestNotify(
  slug: string,
  email: string,
): Promise<"ok" | "invalid" | "error"> {
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    params: Record<string, unknown>,
  ) => Promise<{ data: { ok?: boolean; code?: string } | null; error: unknown }>;
  const { data, error } = await rpc("record_notify_request", { p_slug: slug, p_email: email });
  if (error) return "error";
  if (data?.ok) return "ok";
  return data?.code === "invalid_email" ? "invalid" : "error";
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <View style={{ alignItems: "center", minWidth: 72 }}>
      <Text
        style={{
          ...type.countdown,
          // `type` is `as const`, so fontVariant arrives readonly; RN's
          // TextStyle wants a mutable array.
          fontVariant: [...type.countdown.fontVariant],
          fontSize: 40,
          lineHeight: 40 * 1.1,
        }}
      >
        {String(value).padStart(2, "0")}
      </Text>
      <Text style={{ ...type.revealMicroLabel, marginTop: 4 }}>{label}</Text>
    </View>
  );
}

export interface WaitingRoomProps {
  slug: string;
  title: string;
  targetIso: string;
  /** Called when the countdown reaches zero so the route can re-fetch. */
  onReachZero?: () => void;
  /**
   * Shown as a ✕ only when there is history behind this screen — the same rule
   * `RevealTopBar` and `PinGate` use. A recipient on a bare link gets the
   * frame's undecorated hold; a creator who arrived from their own detail
   * screen gets a way out instead of a dead end.
   */
  onBack?: () => void;
}

export default function WaitingRoom({
  slug,
  title,
  targetIso,
  onReachZero,
  onBack,
}: WaitingRoomProps) {
  const [left, setLeft] = useState<Remaining>(() => remainingUntil(targetIso));
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "invalid" | "error">("idle");

  useEffect(() => {
    // Re-derive from the absolute target each tick. An interval that decrements
    // a stored number drifts every time the OS suspends the app.
    const id = setInterval(() => {
      const next = remainingUntil(targetIso);
      setLeft(next);
      if (next.done) {
        clearInterval(id);
        onReachZero?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [targetIso, onReachZero]);

  async function submit() {
    if (status === "sending") return;
    setStatus("sending");
    const result = await requestNotify(slug, email.trim());
    setStatus(result === "ok" ? "done" : result === "invalid" ? "invalid" : "error");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.ink }}>
      {onBack ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={12}
            style={({ pressed }) => ({
              width: touch.min,
              height: touch.min,
              justifyContent: "center",
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <Text style={{ fontSize: 24, color: palette.paper }}>✕</Text>
          </Pressable>
        </View>
      ) : null}
      <View
        style={{
          flex: 1,
          paddingHorizontal: screenPadding.centered,
          alignItems: "center",
          justifyContent: "center",
          gap: space.x5,
        }}
      >
        <Text
          style={{ ...type.screenTitle, fontSize: 32, color: palette.paper, textAlign: "center" }}
        >
          A surprise is waiting for you.
        </Text>

        <Text style={{ ...type.body, color: palette.sand, textAlign: "center" }}>{title}</Text>

        <View style={{ flexDirection: "row", gap: space.x5, marginVertical: space.x4 }}>
          <Unit value={left.days} label="Days" />
          <Unit value={left.hours} label="Hours" />
          <Unit value={left.mins} label="Mins" />
        </View>

        <Text style={{ ...type.bodySecondary, color: overlay.textSoft, textAlign: "center" }}>
          We&rsquo;ll tell you the moment it opens.
        </Text>

        {status === "done" ? (
          <Text style={{ ...type.body, color: palette.sand, textAlign: "center" }}>
            Done — we&rsquo;ll email you.
          </Text>
        ) : (
          <View style={{ flexDirection: "row", gap: space.x2, width: "100%", maxWidth: 360 }}>
            <TextInput
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (status !== "idle") setStatus("idle");
              }}
              placeholder="you@example.com"
              placeholderTextColor={overlay.textSoft}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              accessibilityLabel="Your email"
              style={{
                flex: 1,
                minHeight: touch.control,
                borderRadius: radii.sm,
                borderWidth: 1,
                borderColor: status === "invalid" ? palette.coral : overlay.borderSoft,
                paddingHorizontal: space.x4,
                color: palette.paper,
                fontSize: 16,
              }}
            />
            <Pressable
              onPress={submit}
              disabled={status === "sending"}
              accessibilityRole="button"
              accessibilityLabel="Notify me when it opens"
              style={{
                minHeight: touch.control,
                paddingHorizontal: space.x6,
                borderRadius: radii.sm,
                backgroundColor: palette.paper,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ ...type.buttonLabel, color: palette.ink }}>
                {status === "sending" ? "…" : "Notify"}
              </Text>
            </Pressable>
          </View>
        )}

        {status === "invalid" ? (
          <Text style={{ ...type.bodySecondary, color: palette.coral }}>
            That email doesn&rsquo;t look right.
          </Text>
        ) : null}
        {status === "error" ? (
          <Text style={{ ...type.bodySecondary, color: palette.coral }}>
            Could not save that. Try again in a moment.
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
