/**
 * A3 step 2 — "Who's the next surprise for?"
 *
 * A single text field plus an optional contacts picker. Skip stays live: the
 * name only seeds the wizard's title, so nothing is lost by refusing it.
 *
 * Both this answer and step 1's chips are written to `profiles` HERE, in one
 * update, so a user who abandons between the two steps has not half-saved.
 */
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Contacts from "expo-contacts";
import { EdButton, EdToast, palette } from "@/components/editorial";
import { OnboardingChrome } from "@/components/create/OnboardingChrome";
import { toOccasionIds } from "@/lib/onboarding";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { radii, space, touch, type } from "@/theme/tokens";

export default function Who() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const { occasions } = useLocalSearchParams<{ occasions?: string }>();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const picked = toOccasionIds((occasions ?? "").split(",").filter(Boolean));

  async function pickFromContacts() {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== "granted") {
      setToast("Allow contacts access to pick a name, or just type it.");
      return;
    }
    const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.Name] });
    const first = data.find((c) => c.name);
    if (first?.name) setName(first.name);
    else setToast("No named contacts on this phone.");
  }

  async function saveAndContinue() {
    if (user) {
      setSaving(true);
      try {
        // One write for both steps. `welcomed_at` is NOT set here — A4 is the
        // last step, and stamping it early would let a reload skip the ask.
        const { error } = await supabase
          .from("profiles")
          .update({ occasions: picked })
          .eq("id", user.id);
        if (error) throw new Error(error.message);
        await refreshProfile();
      } catch (e) {
        // A failed preference write must not trap anyone in onboarding.
        setToast((e as Error).message);
      } finally {
        setSaving(false);
      }
    }
    router.push({ pathname: "/(onboarding)/notifications", params: { recipient: name.trim() } });
  }

  return (
    <OnboardingChrome step={2} onSkip={() => router.replace("/(onboarding)/notifications")}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 34, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ ...type.screenTitle, fontSize: 32, lineHeight: 32 * 1.15, marginBottom: 8 }}>
          Who&apos;s the next surprise for?
        </Text>
        <Text style={{ ...type.body, fontSize: 16, color: palette.stone, marginBottom: 26 }}>
          Just a name. It only pre-fills the first one.
        </Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Maya"
          placeholderTextColor={palette.stone}
          accessibilityLabel="Who the next surprise is for"
          style={{
            minHeight: touch.control,
            borderWidth: 1,
            borderColor: palette.mist,
            borderRadius: radii.sm,
            paddingHorizontal: 15,
            ...type.body,
            fontSize: 17,
          }}
        />

        <Pressable
          onPress={pickFromContacts}
          accessibilityRole="button"
          accessibilityLabel="Pick from contacts"
          style={({ pressed }) => ({
            marginTop: space.x4,
            minHeight: touch.min,
            justifyContent: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={{ ...type.body, fontSize: 14, fontWeight: "600", color: palette.stone }}>
            Pick from contacts →
          </Text>
        </Pressable>

        <View style={{ marginTop: "auto", paddingBottom: 14, paddingTop: space.x8 }}>
          <EdButton title="Continue" variant="ink" loading={saving} onPress={saveAndContinue} />
        </View>
      </ScrollView>

      {toast ? <EdToast message={toast} onDismiss={() => setToast(null)} /> : null}
    </OnboardingChrome>
  );
}
