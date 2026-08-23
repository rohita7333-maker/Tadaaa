/**
 * Invites — the full `.srow` list the Home panel only previews. Same
 * creator-scoped `getMyInvites` read as before; editorial skin over it.
 *
 * Rows sit inside one `.panel` so the hairlines read as a single document
 * rather than a stack of cards, matching the mockup's dashboard list.
 */
import { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { InviteRow } from "@/components/InviteRow";
import { EdEmpty, EdPageHead, EdPanel, palette, radii } from "@/components/editorial";
import { useAuth } from "@/providers/AuthProvider";
import { getMyInvites, type Invite } from "@/lib/db";
import { fetchRsvpCounts } from "@/lib/rsvp-counts";

export default function Invites() {
  const { user } = useAuth();
  const router = useRouter();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [rsvpCounts, setRsvpCounts] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    if (!user) return;
    const list = await getMyInvites(user.id);
    setInvites(list);
    // RSVPs are aggregated from invite_rsvps — response_count is answers.
    setRsvpCounts(await fetchRsvpCounts(list.map((i) => i.id)));
    setLoaded(true);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: palette.pebble }}>
      <FlatList
        data={invites}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <EdPageHead
              title="Your surprises"
              sub={`${invites.length} ${invites.length === 1 ? "surprise" : "surprises"} so far`}
              style={{ marginBottom: 22 }}
            />
            {invites.length > 0 ? <View style={panelCap.top} /> : null}
          </>
        }
        ListEmptyComponent={
          loaded ? (
            <EdPanel>
              <EdEmpty>
                No surprises yet — the first one takes a few minutes
              </EdEmpty>
            </EdPanel>
          ) : null
        }
        // The `.panel` is assembled from three pieces rather than wrapping the
        // list: a cap in the header, bordered sides on each row, and a closing
        // cap in the footer. Wrapping a FlatList in a bordered View would
        // defeat virtualisation.
        renderItem={({ item, index }) => (
          <View style={panelCap.side}>
            <InviteRow
              invite={item}
              rsvpCount={rsvpCounts[item.id]}
              last={index === invites.length - 1}
              onPress={() => router.push(`/invite/${item.id}`)}
            />
          </View>
        )}
        ListFooterComponent={
          invites.length > 0 ? <View style={panelCap.bottom} /> : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={palette.coral}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      />
    </SafeAreaView>
  );
}

/** The three pieces that together draw one `.panel` around a virtualised list. */
const panelCap = StyleSheet.create({
  top: {
    height: 8,
    backgroundColor: palette.paper,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: palette.mist,
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
  },
  side: {
    backgroundColor: palette.paper,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: palette.mist,
    paddingHorizontal: 20,
  },
  bottom: {
    height: 8,
    backgroundColor: palette.paper,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: palette.mist,
    borderBottomLeftRadius: radii.md,
    borderBottomRightRadius: radii.md,
  },
});
