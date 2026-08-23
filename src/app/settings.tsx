/**
 * Settings — the privacy/data half of the mockup's `renderSettings()`
 * (`tadaaaa-editorial.html` L1530): a stack of `.setrow` entries, each a label
 * block plus one trailing control, closing on the `.setrow.danger` delete row.
 *
 * Behaviour preserved: the same GDPR export, the same web hand-off for legal
 * pages and account deletion, the same confirm-before-destructive dialogs.
 */
import { useState } from "react";
import { Alert, ScrollView, Share } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { SafeAreaView } from "react-native-safe-area-context";
import { EdButton, EdPageHead, EdPanel, EdSetRow, palette } from "@/components/editorial";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { ENV } from "@/lib/env";

export default function Settings() {
  const { user, signOut } = useAuth();
  const [exporting, setExporting] = useState(false);

  async function exportData() {
    if (!user) return;
    setExporting(true);
    try {
      const [{ data: profile }, { data: invites }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("invites").select("*").eq("creator_id", user.id).is("deleted_at", null),
      ]);

      const payload = {
        exported_at: new Date().toISOString(),
        account: { id: user.id, email: user.email },
        profile,
        invites,
      };

      await Share.share({
        title: "TaDaaaa data export",
        message: JSON.stringify(payload, null, 2),
      });
    } catch (e) {
      Alert.alert("Couldn't export data", (e as Error).message);
    } finally {
      setExporting(false);
    }
  }

  function openLegal(path: "/terms" | "/privacy") {
    if (!ENV.siteUrl) {
      Alert.alert("Not available", "Legal pages need EXPO_PUBLIC_SITE_URL configured.");
      return;
    }
    WebBrowser.openBrowserAsync(`${ENV.siteUrl}${path}`);
  }

  function confirmSignOut() {
    Alert.alert("Sign out?", "You can always sign back in.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => signOut() },
    ]);
  }

  function confirmDelete() {
    Alert.alert(
      "Delete account",
      "Account deletion needs to be handled by our support team to safely remove all your data. We'll open the web settings page where you can request this.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => {
            if (!ENV.siteUrl) {
              Alert.alert("Not available", "This needs EXPO_PUBLIC_SITE_URL configured.");
              return;
            }
            WebBrowser.openBrowserAsync(`${ENV.siteUrl}/settings`);
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: palette.pebble }}>
      <ScreenHeader />
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <EdPageHead title="Settings" sub="Privacy, data export, and account controls." />

        <EdPanel title="Privacy & data">
          <EdSetRow
            title="Download your data"
            sub="Everything we store about you, in one JSON file."
            right={
              <EdButton
                title="Export"
                variant="line"
                small
                loading={exporting}
                onPress={exportData}
              />
            }
          />
          <EdSetRow
            title="Terms of service"
            right={
              <EdButton
                title="Read"
                variant="line"
                small
                onPress={() => openLegal("/terms")}
              />
            }
          />
          <EdSetRow
            title="Privacy policy"
            last
            right={
              <EdButton
                title="Read"
                variant="line"
                small
                onPress={() => openLegal("/privacy")}
              />
            }
          />
        </EdPanel>

        <EdPanel title="Account">
          <EdSetRow
            title="Sign out"
            sub="You can always sign back in."
            right={<EdButton title="Sign out" variant="line" small onPress={confirmSignOut} />}
          />
          {/* `.setrow.danger` — coral label, coral-outlined control. */}
          <EdSetRow
            title="Delete account"
            sub="Permanent. Every surprise and message goes with it."
            danger
            last
            right={<EdButton title="Delete account" variant="danger" small onPress={confirmDelete} />}
          />
        </EdPanel>
      </ScrollView>
    </SafeAreaView>
  );
}
