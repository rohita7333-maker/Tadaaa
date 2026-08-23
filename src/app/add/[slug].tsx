/**
 * E1 + E2 — the contributor form and its thank-you.
 *
 * One route, two states. `add/[slug]` is the handoff's own path and is a WEB
 * target first: it is reached from a WhatsApp link by someone with no account
 * and probably no app.
 *
 * DEVIATION — no fake browser chrome. The frames draw a 34px pebble URL bar to
 * say "this is a web page, not an app screen". Drawing one ourselves would put a
 * picture of a browser inside a browser; the real one supplies it. Everything
 * below the bar is the frame.
 *
 * BLOCKED — photo and video. The frame offers two dashed 88px tiles. Uploading
 * a binary needs a signed URL from the BFF, and every one of those routes is
 * bearer-authed — a contributor has no account by design. `submit_contribution`
 * accepts a `photo_url` the moment there is an anonymous upload path. Until
 * then the tiles say what they are waiting for rather than opening a picker
 * that cannot finish.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { EdButton, EdToast, palette, useReducedMotion } from "@/components/editorial";
import { Confetti } from "@/components/reveal/Particles";
import {
  CONTRIBUTION_MAX,
  contributionErrorMessage,
  submitContribution,
  validateContribution,
} from "@/lib/contributions";
import { visitorHash } from "@/lib/device";
import { supabase } from "@/lib/supabase";
import { themes } from "@/lib/themes";
import { radii, space, touch, type } from "@/theme/tokens";

interface Meta {
  open: boolean;
  title: string | null;
}

async function getContributeMeta(slug: string): Promise<Meta | null> {
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    params: Record<string, unknown>
  ) => Promise<{ data: Meta[] | null; error: unknown }>;
  const { data, error } = await rpc("get_contribute_meta", { p_slug: slug });
  if (error || !data || data.length === 0) return null;
  return data[0];
}

/** 300ms horizontal shake, ±5px — the handoff's error motion. */
function useShake(reduced: boolean) {
  const v = useRef(new Animated.Value(0)).current;
  const run = useCallback(() => {
    if (reduced) return;
    v.setValue(0);
    Animated.sequence(
      [1, -1, 1, -1, 0].map((dir) =>
        Animated.timing(v, { toValue: dir * 5, duration: 60, useNativeDriver: true })
      )
    ).start();
  }, [v, reduced]);
  return { style: { transform: [{ translateX: v }] }, run };
}

export default function ContributorForm() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const reduced = useReducedMotion();

  const [meta, setMeta] = useState<Meta | null | "loading">("loading");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [nameError, setNameError] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const shake = useShake(reduced);

  useEffect(() => {
    if (!slug) return;
    getContributeMeta(slug).then(setMeta);
  }, [slug]);

  async function submit() {
    const check = validateContribution({ name, message });
    if (!check.ok) {
      if (check.field === "name") {
        setNameError(true);
        shake.run();
      }
      setToast(check.message);
      return;
    }
    setSending(true);
    const res = await submitContribution({
      slug: slug!,
      name: name.trim(),
      message: message.trim(),
      visitorHash: await visitorHash(),
    });
    setSending(false);
    if (!res.ok) {
      setToast(contributionErrorMessage(res.code));
      return;
    }
    setDone(true);
  }

  if (meta === "loading") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.paper }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={type.bodySecondary}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Closed, expired, deleted or PIN-locked all land here. One message: the
  // contributor cannot tell which, and does not need to.
  if (!meta || !meta.open) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.paper }}>
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 }}
        >
          <Text style={{ ...type.screenTitle, fontSize: 24, textAlign: "center" }}>
            This one has closed.
          </Text>
          <Text style={{ ...type.bodySecondary, textAlign: "center", maxWidth: 280 }}>
            It stopped taking messages. Ask whoever sent you the link — they can reopen it.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ------------------------------------------------------------------ E2
  if (done) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.paper }}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 34,
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              borderWidth: 1.5,
              borderColor: palette.sand,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <Text style={{ ...type.screenTitle, fontSize: 22, color: palette.coral }}>✓</Text>
          </View>

          <Text
            style={{
              ...type.screenTitle,
              fontSize: 28,
              lineHeight: 28 * 1.2,
              fontStyle: "italic",
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            That&apos;s in, {name.trim() || "friend"}.
          </Text>
          <Text
            style={{
              ...type.body,
              color: palette.stone,
              textAlign: "center",
              maxWidth: 280,
              marginBottom: 40,
            }}
          >
            {meta.title
              ? `They'll fold it into ${meta.title}. Nothing shows until they say so.`
              : "They'll fold it in. Nothing shows until they say so."}
          </Text>

          {/* One install nudge, AFTER the good feeling, never before. */}
          <View
            style={{
              width: "100%",
              borderWidth: 1,
              borderColor: palette.mist,
              borderRadius: radii.md,
              padding: 20,
              backgroundColor: palette.pebble,
            }}
          >
            <Text style={{ ...type.screenTitle, fontSize: 20, marginBottom: 6 }}>
              Got someone&apos;s big day coming?
            </Text>
            <Text style={{ ...type.body, fontSize: 14, color: palette.stone, marginBottom: 16 }}>
              Make one of these in about three minutes.
            </Text>
            <EdButton title="Get the app" variant="ink" onPress={() => router.replace("/")} />
          </View>
        </View>

        <Confetti run={!reduced} theme={themes[0]} reduced={reduced} />
      </SafeAreaView>
    );
  }

  // ------------------------------------------------------------------ E1
  const over = message.trim().length > CONTRIBUTION_MAX;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.paper }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 26, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ ...type.screenTitle, fontSize: 28, lineHeight: 28 * 1.18, marginBottom: 8 }}>
          {meta.title
            ? `Someone is making something for ${meta.title}.`
            : "Someone is making something."}
        </Text>
        <Text style={{ ...type.body, fontSize: 15, color: palette.stone, marginBottom: 24 }}>
          Add a memory, a wish, an inside joke. No account needed.
        </Text>

        <Animated.View style={[{ marginBottom: 16 }, shake.style]}>
          <Text style={{ ...type.fieldLabel, marginBottom: 7 }}>Your name</Text>
          <TextInput
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (nameError) setNameError(false);
            }}
            placeholder="Aanya"
            placeholderTextColor={palette.stone}
            accessibilityLabel="Your name"
            style={{
              minHeight: touch.control,
              borderWidth: nameError ? 2 : 1,
              borderColor: nameError ? palette.coral : palette.mist,
              borderRadius: radii.sm,
              paddingHorizontal: nameError ? 14 : 15,
              ...type.body,
              fontSize: 17,
            }}
          />
        </Animated.View>

        <View style={{ marginBottom: 18 }}>
          <Text style={{ ...type.fieldLabel, marginBottom: 7 }}>Your message</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={CONTRIBUTION_MAX}
            placeholder="So proud of you."
            placeholderTextColor={palette.stone}
            accessibilityLabel="Your message"
            style={{
              minHeight: 120,
              borderWidth: 1,
              borderColor: over ? palette.coral : palette.mist,
              borderRadius: radii.sm,
              paddingHorizontal: 15,
              paddingVertical: 13,
              ...type.body,
              lineHeight: 16 * 1.55,
              textAlignVertical: "top",
            }}
          />
          <Text style={{ ...type.bodySecondary, fontSize: 12, textAlign: "right", marginTop: 5 }}>
            {message.length}/{CONTRIBUTION_MAX}
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginBottom: 18 }}>
          <AttachTile label="Photo" />
          <AttachTile label="Video · 30s" />
        </View>

        <Text style={{ ...type.bodySecondary, lineHeight: 13 * 1.55 }}>
          They review everything before it shows. The person it&apos;s for won&apos;t know you were
          asked.
        </Text>
      </ScrollView>

      <View style={{ borderTopWidth: 1, borderTopColor: palette.mist, padding: 24, paddingTop: 12 }}>
        <EdButton title="Add my message" loading={sending} onPress={submit} />
      </View>

      {toast ? <EdToast message={toast} reduced={reduced} onDismiss={() => setToast(null)} /> : null}
    </SafeAreaView>
  );
}

/**
 * The frame's dashed attachment tiles. Disabled, and honest about why — a
 * picker that cannot finish its upload is worse than a tile that explains
 * itself.
 */
function AttachTile({ label }: { label: string }) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}. Not available yet.`}
      style={{
        flex: 1,
        minHeight: 88,
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: palette.mist,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        opacity: 0.55,
      }}
    >
      <Text style={{ fontSize: 22, fontWeight: "300", color: palette.stone }}>+</Text>
      <Text
        style={{ ...type.buttonLabel, fontSize: 10, letterSpacing: 10 * 0.08, color: palette.stone }}
      >
        {label}
      </Text>
      <Text style={{ ...type.bodySecondary, fontSize: 10 }}>Words only, for now</Text>
    </View>
  );
}

export { space };
