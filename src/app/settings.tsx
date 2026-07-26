import { useState } from "react";
import { Alert, Share, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Download, FileText, LogOut, Shield, Trash2 } from "lucide-react-native";
import { Button, Card, Screen, Txt, colors, spacing } from "@/components/ui";
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
    <Screen bg={colors.cream} scroll contentStyle={{ paddingTop: spacing.sm }}>
      <ScreenHeader />
      <View style={{ gap: 4 }}>
        <Txt variant="eyebrow">preferences</Txt>
        <Txt variant="h1">Settings</Txt>
        <Txt variant="body" muted>Privacy, data export, and account controls.</Txt>
      </View>

      <Card style={{ gap: spacing.md }}>
        <Txt variant="title">Privacy & data</Txt>
        <Button
          title="Export my data (GDPR)"
          variant="outline"
          left={<Download size={18} color={colors.charcoal} />}
          loading={exporting}
          onPress={exportData}
        />
        <Button
          title="Terms of service"
          variant="outline"
          left={<FileText size={18} color={colors.charcoal} />}
          onPress={() => openLegal("/terms")}
        />
        <Button
          title="Privacy policy"
          variant="outline"
          left={<Shield size={18} color={colors.charcoal} />}
          onPress={() => openLegal("/privacy")}
        />
      </Card>

      <Card style={{ gap: spacing.md }}>
        <Txt variant="title">Account</Txt>
        <Button
          title="Sign out"
          variant="outline"
          left={<LogOut size={18} color={colors.roseDeep} />}
          onPress={confirmSignOut}
        />
        <Button
          title="Delete account"
          variant="outline"
          left={<Trash2 size={18} color={colors.roseDeep} />}
          onPress={confirmDelete}
        />
      </Card>
    </Screen>
  );
}
