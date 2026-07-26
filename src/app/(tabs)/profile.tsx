import { useState } from "react";
import { Alert, Switch, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Crown, LogOut, Settings } from "lucide-react-native";
import { Button, Card, Chip, Txt, colors, gradients, radii, spacing } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { updateNotifyPrefs } from "@/lib/db";
import { getActiveTier } from "@/lib/tier";

const TIER_LABEL: Record<string, string> = { free: "Free", plus: "Plus", unlimited: "Unlimited" };

export default function Profile() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const router = useRouter();
  const tier = getActiveTier(profile);
  const [saving, setSaving] = useState(false);

  const name = profile?.full_name || user?.email?.split("@")[0] || "Friend";

  async function toggle(key: "notify_on_view" | "notify_on_answer" | "notify_occasions", value: boolean) {
    if (!user) return;
    setSaving(true);
    try {
      await updateNotifyPrefs(user.id, { [key]: value });
      await refreshProfile();
    } catch (e) {
      Alert.alert("Couldn't save", (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.creamDark }}>
      <View style={{ padding: spacing.xl, gap: spacing.lg, flex: 1 }}>
        <View style={{ gap: 4 }}>
          <Txt variant="eyebrow">your account</Txt>
          <Txt variant="h1">{name}</Txt>
          <Txt variant="body" muted>{user?.email}</Txt>
        </View>

        <LinearGradient colors={tier === "free" ? [colors.gold, "#B8922F"] : gradients.rose}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ borderRadius: radii.xl, padding: 18, gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Crown size={20} color="#fff" />
              <Txt style={{ color: "#fff", fontFamily: "DMSans_700Bold", fontSize: 16 }}>
                {TIER_LABEL[tier]} plan
              </Txt>
            </View>
          </View>
          {tier === "free" && (
            <>
              <Txt style={{ color: "rgba(255,255,255,0.92)", fontSize: 13 }}>
                Unlock premium themes, unlimited surprises, and video reveals.
              </Txt>
              <Button title="See plans" variant="dark" small onPress={() => router.push("/pricing")} style={{ alignSelf: "flex-start", marginTop: 2 }} />
            </>
          )}
        </LinearGradient>

        <Card style={{ gap: 4 }}>
          <Txt variant="title" style={{ marginBottom: 6 }}>Notifications</Txt>
          <ToggleRow label="When someone opens a surprise" value={profile?.notify_on_view ?? true} disabled={saving} onValueChange={(v) => toggle("notify_on_view", v)} />
          <ToggleRow label="When someone answers" value={profile?.notify_on_answer ?? true} disabled={saving} onValueChange={(v) => toggle("notify_on_answer", v)} />
          <ToggleRow label="Occasion reminders" value={profile?.notify_occasions ?? true} disabled={saving} onValueChange={(v) => toggle("notify_occasions", v)} />
        </Card>

        <View style={{ gap: spacing.md, marginTop: "auto" }}>
          <Button title="Settings & privacy" variant="outline" left={<Settings size={18} color={colors.charcoal} />} onPress={() => router.push("/settings")} />
          <Button title="Sign out" variant="outline" left={<LogOut size={18} color={colors.roseDeep} />}
            onPress={() => Alert.alert("Sign out?", "You can always sign back in.", [
              { text: "Cancel", style: "cancel" },
              { text: "Sign out", style: "destructive", onPress: () => signOut() },
            ])} />
        </View>
      </View>
    </SafeAreaView>
  );
}

function ToggleRow({ label, value, onValueChange, disabled }: { label: string; value: boolean; onValueChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 }}>
      <Txt variant="body" style={{ flex: 1, paddingRight: 12 }}>{label}</Txt>
      <Switch value={value} onValueChange={onValueChange} disabled={disabled}
        trackColor={{ true: colors.rose, false: colors.lightGray }} thumbColor="#fff" />
    </View>
  );
}
