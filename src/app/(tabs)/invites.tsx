import { useCallback, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card, Txt, colors, spacing } from "@/components/ui";
import { InviteRow } from "@/components/InviteRow";
import { useAuth } from "@/providers/AuthProvider";
import { getMyInvites, type Invite } from "@/lib/db";

export default function Invites() {
  const { user } = useAuth();
  const router = useRouter();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setInvites(await getMyInvites(user.id));
    setLoaded(true);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.creamDark }}>
      <FlatList
        data={invites}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.md, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ gap: 4, marginBottom: spacing.md }}>
            <Txt variant="eyebrow">your work</Txt>
            <Txt variant="h1">My Surprises</Txt>
          </View>
        }
        ListEmptyComponent={
          loaded ? (
            <Card>
              <Txt variant="body" muted style={{ textAlign: "center" }}>
                Nothing here yet — tap the + below to create your first surprise.
              </Txt>
            </Card>
          ) : null
        }
        renderItem={({ item }) => (
          <InviteRow invite={item} onPress={() => router.push(`/invite/${item.id}`)} />
        )}
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
      />
    </SafeAreaView>
  );
}
