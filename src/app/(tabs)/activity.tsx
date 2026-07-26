import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Eye, Heart } from "lucide-react-native";
import { Card, Txt, colors, spacing } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { getMyInvites, type Invite } from "@/lib/db";

export default function Activity() {
  const { user } = useAuth();
  const router = useRouter();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const list = await getMyInvites(user.id);
    // Surface the invites with the most engagement first.
    list.sort(
      (a, b) =>
        (b.response_count ?? 0) + (b.view_count ?? 0) -
        ((a.response_count ?? 0) + (a.view_count ?? 0))
    );
    setInvites(list);
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const active = invites.filter((i) => (i.view_count ?? 0) > 0 || (i.response_count ?? 0) > 0);

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.creamDark }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.md, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} tintColor={colors.rose}
            onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />
        }
      >
        <View style={{ gap: 4, marginBottom: spacing.sm }}>
          <Txt variant="eyebrow">what's happening</Txt>
          <Txt variant="h1">Activity</Txt>
        </View>

        {active.length === 0 ? (
          <Card>
            <Txt variant="body" muted style={{ textAlign: "center" }}>
              No opens yet. Share a surprise link and watch the magic land here. ✨
            </Txt>
          </Card>
        ) : (
          active.map((inv) => (
            <Card key={inv.id} onTouchEnd={() => router.push(`/invite/${inv.id}`)}>
              <Txt variant="title" numberOfLines={1}>{inv.title}</Txt>
              <View style={{ flexDirection: "row", gap: 18, marginTop: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Eye size={15} color={colors.rose} />
                  <Txt variant="body">{inv.view_count ?? 0} views</Txt>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Heart size={15} color={colors.rose} />
                  <Txt variant="body">{inv.response_count ?? 0} responses</Txt>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
