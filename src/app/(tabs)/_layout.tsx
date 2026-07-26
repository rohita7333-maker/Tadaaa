import { Tabs, useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bell, Home, Plus, Sparkles, User } from "lucide-react-native";
import { colors, fonts, gradients, radii, shadows } from "@/theme/tokens";
import { Text } from "react-native";

// Structural subset of the tab-bar props we actually use — decoupled from the
// bundled @react-navigation types (expo-router ships its own copy, which
// otherwise conflicts at the import site).
type TabBarProps = {
  state: { routes: { name: string; key: string }[]; index: number };
  navigation: { navigate: (name: string) => void };
};

const ICONS: Record<string, (active: boolean) => React.ReactNode> = {
  index: (a) => <Home size={22} color={a ? colors.rose : colors.warmGray} strokeWidth={a ? 2.4 : 1.9} />,
  invites: (a) => <Sparkles size={22} color={a ? colors.rose : colors.warmGray} strokeWidth={a ? 2.4 : 1.9} />,
  activity: (a) => <Bell size={22} color={a ? colors.rose : colors.warmGray} strokeWidth={a ? 2.4 : 1.9} />,
  profile: (a) => <User size={22} color={a ? colors.rose : colors.warmGray} strokeWidth={a ? 2.4 : 1.9} />,
};
const LABELS: Record<string, string> = {
  index: "Home",
  invites: "Invites",
  activity: "Activity",
  profile: "Profile",
};

function TabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // Order: Home, Invites, [FAB], Activity, Profile
  const left = state.routes.filter((r: { name: string }) => ["index", "invites"].includes(r.name));
  const right = state.routes.filter((r: { name: string }) => ["activity", "profile"].includes(r.name));

  const renderTab = (routeName: string) => {
    const routeIndex = state.routes.findIndex((r: { name: string }) => r.name === routeName);
    const active = state.index === routeIndex;
    return (
      <Pressable
        key={routeName}
        onPress={() => navigation.navigate(routeName)}
        style={{ flex: 1, alignItems: "center", gap: 4, paddingVertical: 4 }}
      >
        {ICONS[routeName](active)}
        <Text
          style={{
            fontFamily: fonts.bodyMedium,
            fontSize: 10,
            color: active ? colors.rose : colors.warmGray,
          }}
        >
          {LABELS[routeName]}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-around",
          backgroundColor: "rgba(255,255,255,0.98)",
          borderTopWidth: 1,
          borderTopColor: colors.hair,
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, 9),
          paddingHorizontal: 8,
        },
      ]}
    >
      {left.map((r) => renderTab(r.name))}

      {/* Center FAB → create wizard */}
      <View style={{ flex: 1, alignItems: "center" }}>
        <Pressable onPress={() => router.push("/create")} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.94 : 1 }] })}>
          <LinearGradient
            colors={gradients.rose}
            style={[
              {
                width: 54,
                height: 54,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                marginTop: -26,
                borderWidth: 3,
                borderColor: colors.creamDark,
              },
              shadows.md,
            ]}
          >
            <Plus size={26} color="#fff" strokeWidth={2.6} />
          </LinearGradient>
        </Pressable>
      </View>

      {right.map((r) => renderTab(r.name))}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.creamDark } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="invites" />
      <Tabs.Screen name="activity" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
