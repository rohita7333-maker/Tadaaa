/**
 * B6 — You.
 *
 * Frame anatomy: 60px ink avatar + 22px serif name + email + an outlined "Edit"
 * pill · the ink plan card (sand "CURRENT PLAN" micro-label, 24px serif tier
 * name, coral "Go Unlimited" pill, 13px summary) — the only ink-filled block in
 * the shell · a "Notifications" group of three toggles · a "Privacy" group with
 * the Face ID toggle, "Export my data ›" and a coral "Delete account ›".
 *
 * DEVIATION — the coral on both the delete row and its chevron is `coralDeep`.
 * Plain `#D45847` measures 3.94:1 on paper; the row is 16px body text, well
 * inside WCAG's normal-text band. This is the same correction the primary CTA
 * already carries, and the fifth time this design source has lost to contrast.
 */
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Share, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { EdButton, EdToast, derived, palette } from "@/components/editorial";
import { SectionLabel, SettingRow, Toggle } from "@/components/handoff";
import { DeleteAccountSheet } from "@/components/handoff/DeleteAccountSheet";
import { useAuth } from "@/providers/AuthProvider";
import { updateNotifyPrefs } from "@/lib/db";
import { getActiveTier } from "@/lib/tier";
import { planCard } from "@/lib/plan-card";
import { UNAVAILABLE_COPY, authenticate, checkBiometrics } from "@/lib/biometrics";
import { supabase } from "@/lib/supabase";
import { ENV } from "@/lib/env";
import { radii, space, touch, type } from "@/theme/tokens";

type NotifyKey = "notify_on_view" | "notify_on_answer" | "notify_occasions";

/** Frame B6's labels verbatim — shorter than the web settings page's. */
const NOTIFY_ROWS: { key: NotifyKey; title: string; detail: string }[] = [
  {
    key: "notify_on_view",
    title: "When someone views",
    detail: "The moment your link gets opened",
  },
  { key: "notify_on_answer", title: "New contributions", detail: "Someone added words or a photo" },
  { key: "notify_occasions", title: "Occasion reminders", detail: "Birthdays and events, 14 days out" },
];

const AVATAR = 60;

export default function You() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const router = useRouter();
  const tier = getActiveTier(profile);
  const card = planCard(tier);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [bioLabel, setBioLabel] = useState("Face ID");
  // Single-button Alerts are notifications, not decisions; web toasts these
  // and the cross-platform parity gate holds mobile to the same rule.
  const [toast, setToast] = useState<string | null>(null);

  const name = profile?.full_name || user?.email?.split("@")[0] || "Friend";
  const initial = (name[0] ?? "?").toUpperCase();

  // The copy has to name what THIS phone actually has: offering "Face ID" on a
  // fingerprint-only Android reads as a broken promise.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      checkBiometrics().then((b) => {
        if (alive && b.available) setBioLabel(b.label);
      });
      return () => {
        alive = false;
      };
    }, [])
  );

  async function saveNotify(key: NotifyKey, value: boolean) {
    if (!user) return;
    setSaving(true);
    try {
      await updateNotifyPrefs(user.id, { [key]: value });
      await refreshProfile();
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function setBiometricLock(next: boolean) {
    if (!user) return;
    if (next) {
      const availability = await checkBiometrics();
      if (!availability.available) {
        setToast(UNAVAILABLE_COPY[availability.reason]);
        return;
      }
      // Prove the sensor works BEFORE writing the preference — otherwise a
      // failed enrolment leaves the app locked behind something that cannot
      // open it.
      const ok = await authenticate(`Turn on ${availability.label} for TaDaaaa`);
      if (!ok) return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ biometric_lock: next })
        .eq("id", user.id);
      if (error) throw new Error(error.message);
      await refreshProfile();
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function exportData() {
    if (!user) return;
    setSaving(true);
    try {
      const [{ data: myProfile }, { data: invites }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("invites").select("*").eq("creator_id", user.id).is("deleted_at", null),
      ]);
      await Share.share({
        title: "TaDaaaa data export",
        message: JSON.stringify(
          {
            exported_at: new Date().toISOString(),
            account: { id: user.id, email: user.email },
            profile: myProfile,
            invites,
          },
          null,
          2
        ),
      });
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    // Deletion needs service-role work (auth.users, storage objects, Stripe),
    // which the app cannot do from the client. The typed confirmation happens
    // here so the intent is unambiguous; the request itself is handed to the
    // web account page that already owns it.
    setDeleteOpen(false);
    if (!ENV.siteUrl) {
      setToast("This needs EXPO_PUBLIC_SITE_URL configured.");
      return;
    }
    WebBrowser.openBrowserAsync(`${ENV.siteUrl}/settings`);
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: palette.paper }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space.x4,
            paddingTop: space.x2,
            paddingBottom: 20,
          }}
        >
          <View
            style={{
              width: AVATAR,
              height: AVATAR,
              borderRadius: AVATAR / 2,
              backgroundColor: palette.ink,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ ...type.body, fontSize: 22, fontWeight: "600", color: palette.paper }}>
              {initial}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ ...type.screenTitle, fontSize: 22 }} numberOfLines={1}>
              {name}
            </Text>
            <Text style={type.bodySecondary} numberOfLines={1}>
              {user?.email ?? ""}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/settings")}
            accessibilityRole="button"
            accessibilityLabel="Edit your profile"
            style={({ pressed }) => ({
              minHeight: 38,
              paddingHorizontal: 15,
              borderWidth: 1,
              borderColor: palette.mist,
              borderRadius: radii.pill,
              justifyContent: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ ...type.buttonLabel, fontSize: 11, letterSpacing: 11 * 0.06 }}>
              Edit
            </Text>
          </Pressable>
        </View>

        {/* Plan card — the only ink block in the shell, so upgrade reads as an
            offer rather than a nag. */}
        <View
          style={{
            backgroundColor: palette.ink,
            borderRadius: radii.md,
            padding: 18,
            marginBottom: space.x6,
          }}
        >
          <View
            style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ ...type.revealMicroLabel, letterSpacing: 10 * 0.14 }}>
                Current plan
              </Text>
              <Text style={{ ...type.statValue, color: palette.paper, marginTop: 4 }}>
                {card.tierName}
              </Text>
            </View>
            {card.ctaLabel ? (
              <Pressable
                onPress={() => router.push("/pricing")}
                accessibilityRole="button"
                accessibilityLabel={card.ctaLabel}
                style={({ pressed }) => ({
                  minHeight: 40,
                  paddingHorizontal: 18,
                  borderRadius: radii.pill,
                  // coralDeep, not coral: the label is 11px paper-on-coral.
                  backgroundColor: derived.coralDeep,
                  justifyContent: "center",
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ ...type.buttonLabel, fontSize: 11, color: palette.paper }}>
                  {card.ctaLabel}
                </Text>
              </Pressable>
            ) : null}
          </View>
          <Text
            style={{
              ...type.bodySecondary,
              color: "rgba(255,254,253,0.65)",
              lineHeight: 13 * 1.55,
              marginTop: 12,
            }}
          >
            {card.summary}
          </Text>
        </View>

        <SectionLabel>Notifications</SectionLabel>
        {NOTIFY_ROWS.map((row, i) => (
          <SettingRow
            key={row.key}
            title={row.title}
            detail={row.detail}
            value={profile?.[row.key] ?? true}
            disabled={saving}
            last={i === NOTIFY_ROWS.length - 1}
            onValueChange={(v) => saveNotify(row.key, v)}
          />
        ))}

        <View style={{ marginTop: 20 }}>
          <SectionLabel>Privacy</SectionLabel>
        </View>
        <SettingRow
          title={`${bioLabel} to open the app`}
          detail="Drafts stay private on a shared phone"
          value={profile?.biometric_lock ?? false}
          disabled={saving}
          onValueChange={setBiometricLock}
        />

        <DisclosureRow label="Export my data" onPress={exportData} />
        <DisclosureRow label="Delete account" danger last onPress={() => setDeleteOpen(true)} />

        <View style={{ marginTop: space.x8 }}>
          <EdButton
            title="Sign out"
            variant="line"
            onPress={() =>
              Alert.alert("Sign out?", "You can always sign back in.", [
                { text: "Cancel", style: "cancel" },
                { text: "Sign out", style: "destructive", onPress: () => signOut() },
              ])
            }
          />
        </View>
      </ScrollView>

      {toast ? <EdToast message={toast} onDismiss={() => setToast(null)} /> : null}

      <DeleteAccountSheet
        visible={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        busy={saving}
      />
    </SafeAreaView>
  );
}

/** Frame B6: a 16px label and a trailing chevron, no control. */
function DisclosureRow({
  label,
  onPress,
  danger,
  last,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  const tone = danger ? derived.coralDeep : palette.ink;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: space.x4,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: palette.mist,
        minHeight: touch.min,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ flex: 1, ...type.body, color: tone }}>{label}</Text>
      <Text style={{ fontSize: 20, color: tone }}>›</Text>
    </Pressable>
  );
}
