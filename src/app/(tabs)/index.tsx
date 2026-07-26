import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Sparkles } from "lucide-react-native";
import { Button, Card, Txt, colors, gradients, radii, spacing } from "@/components/ui";
import { InviteRow } from "@/components/InviteRow";
import { useAuth } from "@/providers/AuthProvider";
import { getMyInvites, monthlyInviteCount, type Invite } from "@/lib/db";
import { getActiveTier, monthlyInviteLimit } from "@/lib/tier";

export default function Home() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [monthCount, setMonthCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [list, count] = await Promise.all([
      getMyInvites(user.id),
      monthlyInviteCount(user.id),
    ]);
    setInvites(list);
    setMonthCount(count);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const tier = getActiveTier(profile);
  const limit = monthlyInviteLimit(tier);
  const totalViews = invites.reduce((s, i) => s + (i.view_count ?? 0), 0);
  const firstName = (profile?.full_name || user?.email || "there").split(" ")[0].split("@")[0];

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.creamDark }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={colors.rose}
          />
        }
      >
        <View style={{ gap: 4 }}>
          <Txt variant="eyebrow">hello {firstName}</Txt>
          <Txt variant="h1">Make someone{"\n"}gasp today</Txt>
        </View>

        <LinearGradient
          colors={gradients.rose}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: radii.xl, padding: 20, gap: 12 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Sparkles size={18} color="#fff" />
            <Txt style={{ color: "#fff", fontFamily: "DMSans_700Bold", fontSize: 15 }}>
              Craft a new surprise
            </Txt>
          </View>
          <Txt style={{ color: "rgba(255,255,255,0.9)", fontSize: 13 }}>
            Pick an occasion, add photos, and choreograph a tap-to-reveal moment.
          </Txt>
          <Button title="Start creating" variant="dark" small onPress={() => router.push("/create")} style={{ alignSelf: "flex-start", marginTop: 4 }} />
        </LinearGradient>

        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <Stat value={String(invites.length)} label="Surprises" />
          <Stat value={String(totalViews)} label="Total views" />
          <Stat
            value={limit == null ? "∞" : `${monthCount}/${limit}`}
            label="This month"
          />
        </View>

        <View style={{ gap: spacing.md }}>
          <Txt variant="h3">Recent</Txt>
          {invites.length === 0 ? (
            <Card>
              <Txt variant="body" muted style={{ textAlign: "center" }}>
                No surprises yet. Tap the + to craft your first one. ✨
              </Txt>
            </Card>
          ) : (
            invites.slice(0, 4).map((inv) => (
              <InviteRow key={inv.id} invite={inv} onPress={() => router.push(`/invite/${inv.id}`)} />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <Card style={{ flex: 1, padding: 12, gap: 2 }}>
      <Txt style={{ fontFamily: "Bricolage_800ExtraBold", fontSize: 22, color: colors.charcoal }}>{value}</Txt>
      <Txt variant="body" muted style={{ fontSize: 10.5 }}>{label}</Txt>
    </Card>
  );
}
