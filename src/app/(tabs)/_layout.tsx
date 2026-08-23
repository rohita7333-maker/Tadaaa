/**
 * Tab chrome — the RN equivalent of the mockup's `.appbar`
 * (`tadaaaa/tadaaaa-editorial.html` L727 markup, L49-53 CSS):
 *
 *   .appbar        paper ground, 1px mist top rule, safe-area bottom padding
 *   .appbar button column stack, 10px/600/.06em uppercase label, stone
 *   .appbar .on    ink label, plus a 16x2 coral rule underneath
 *   .appbar svg    20px, 1.6 stroke, currentColor
 *
 * Structure is unchanged from what shipped (Home · Invites · [Create] ·
 * Activity · You) — only the treatment is re-skinned. The centre Create
 * action keeps its raised affordance but loses the gradient: the editorial
 * identity allows flat coral fills, not ramps.
 */
import { Tabs, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bell, Home, Plus, Sparkles, User } from "lucide-react-native";
import { derived, fonts, palette, shadows } from "@/theme/tokens";

/** Frame B1: the create FAB is 54px. */
const FAB_SIZE = 54;
import { TOUCH_MIN, useReducedMotion } from "@/components/editorial";
import { FaceIdOfferSheet } from "@/components/auth/FaceIdOfferSheet";

// Structural subset of the tab-bar props we actually use — decoupled from the
// bundled @react-navigation types (expo-router ships its own copy, which
// otherwise conflicts at the import site).
type TabBarProps = {
  state: { routes: { name: string; key: string }[]; index: number };
  navigation: { navigate: (name: string) => void };
};

/** `.appbar svg { width:20px; height:20px; stroke-width:1.6 }`. */
const ICON_SIZE = 20;
const ICON_STROKE = 1.6;
const LABEL_SIZE = 10;
/** `.appbar button { letter-spacing:.06em }` resolved against the font size. */
const LABEL_TRACKING_RATIO = 0.06;
/** `.appbar button.on::after { width:16px; height:2px }`. */
const ACTIVE_RULE_WIDTH = 16;
const ACTIVE_RULE_HEIGHT = 2;

const ICONS: Record<string, (color: string) => React.ReactNode> = {
  index: (c) => <Home size={ICON_SIZE} color={c} strokeWidth={ICON_STROKE} />,
  themes: (c) => <Sparkles size={ICON_SIZE} color={c} strokeWidth={ICON_STROKE} />,
  activity: (c) => <Bell size={ICON_SIZE} color={c} strokeWidth={ICON_STROKE} />,
  profile: (c) => <User size={ICON_SIZE} color={c} strokeWidth={ICON_STROKE} />,
};

const LABELS: Record<string, string> = {
  index: "Home",
  themes: "Themes",
  activity: "Activity",
  profile: "You",
};

/**
 * Handoff tab set: Home · Themes · [Create FAB] · Activity · You.
 *
 * `invites` is no longer a tab — the B1 frame folds the invite list into Home
 * under "Your surprises". The route still exists and stays reachable; it just
 * lost its tab slot, because the handoff's bar has exactly four.
 */
const LEFT_TABS = ["index", "themes"];
const RIGHT_TABS = ["activity", "profile"];

/** Tabs carrying a coral dot badge. Frame B1: 7px dot, top -2, right 11. */
const BADGE_TABS = new Set(["activity"]);
const BADGE_SIZE = 7;

function TabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const reduced = useReducedMotion();

  const renderTab = (routeName: string) => {
    const routeIndex = state.routes.findIndex((r) => r.name === routeName);
    const active = state.index === routeIndex;
    // `.appbar button { color:var(--stone) }` / `.on { color:var(--ink) }` —
    // the icon inherits it via `stroke:currentColor`.
    const tint = active ? palette.ink : palette.stone;

    return (
      <Pressable
        key={routeName}
        onPress={() => navigation.navigate(routeName)}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={LABELS[routeName]}
        style={{
          flex: 1,
          minWidth: TOUCH_MIN,
          minHeight: TOUCH_MIN,
          alignItems: "center",
          justifyContent: "center",
          // Frame B1: `gap:5px` between icon, label and the active rule.
          gap: 5,
          paddingVertical: 6,
          paddingHorizontal: 10,
        }}
      >
        <View>
          {ICONS[routeName](tint)}
          {BADGE_TABS.has(routeName) && (
            <View
              style={{
                position: "absolute",
                top: -2,
                right: -3,
                width: BADGE_SIZE,
                height: BADGE_SIZE,
                borderRadius: BADGE_SIZE / 2,
                backgroundColor: palette.coral,
              }}
            />
          )}
        </View>
        <Text
          numberOfLines={1}
          style={{
            fontFamily: fonts.body,
            fontSize: LABEL_SIZE,
            fontWeight: "600",
            letterSpacing: LABEL_SIZE * LABEL_TRACKING_RATIO,
            textTransform: "uppercase",
            color: tint,
          }}
        >
          {LABELS[routeName]}
        </Text>
        {/* `.appbar button.on::after` — the coral underline. Always rendered so
            the row's height never shifts between states. */}
        <View
          style={{
            width: ACTIVE_RULE_WIDTH,
            height: ACTIVE_RULE_HEIGHT,
            backgroundColor: active ? palette.coral : "transparent",
          }}
        />
      </Pressable>
    );
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-around",
        backgroundColor: palette.paper,
        borderTopWidth: 1,
        borderTopColor: palette.mist,
        // Frame B1: `padding:9px 6px 6px`, plus the safe-area inset.
        paddingTop: 9,
        paddingBottom: insets.bottom + 6,
        paddingHorizontal: 6,
      }}
    >
      {LEFT_TABS.map(renderTab)}

      {/* Centre Create. Flat coral, no ramp — the identity bans gradients. */}
      <View style={{ flex: 1, alignItems: "center" }}>
        <Pressable
          onPress={() => router.push("/create")}
          accessibilityRole="button"
          accessibilityLabel="Create a surprise"
          style={({ pressed }) => ({
            // Frame B1: 54px circle, raised 16px above the bar, carrying the
            // ONE shadow the handoff sanctions — coral-tinted, not ink.
            width: FAB_SIZE,
            height: FAB_SIZE,
            marginTop: -16,
            borderRadius: FAB_SIZE / 2,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: palette.coral,
            ...shadows.fab,
            // Handoff motion: press = scale .98, 120ms.
            transform: [{ scale: pressed && !reduced ? 0.98 : 1 }],
          })}
        >
          <Plus size={26} color={derived.white} strokeWidth={1.6} />
        </Pressable>
      </View>

      {RIGHT_TABS.map(renderTab)}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <>
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: palette.pebble } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="themes" />
      <Tabs.Screen name="activity" />
      <Tabs.Screen name="profile" />
      {/* Still routable, no longer a tab — B1 folds the list into Home. */}
      <Tabs.Screen name="invites" options={{ href: null }} />
    </Tabs>
    {/* A2's second-launch offer lives HERE, not on the sign-in screen: the ask
        belongs to the launch AFTER a sign-in, and that screen has unmounted by
        then. */}
    <FaceIdOfferSheet />
    </>
  );
}
