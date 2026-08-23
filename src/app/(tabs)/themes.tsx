/**
 * B3 — Themes.
 *
 * Frame anatomy: 26px serif "Find the look" · a 44px pebble search field at
 * radius 10 · ONE horizontally scrolling chip row (All / occasions / Free /
 * Premium) · a 13px stone result count · a 2-column grid at a 14px gutter whose
 * cards are a 132px cover over a serif name, the occasion, and a price · a
 * dashed "+ Your own photo" tile as the last cell.
 *
 * The pre-handoff `/templates` marketplace (featured rail, three chip rows)
 * stays routable for deep links and web parity — this is the tab the frame
 * specifies, not a replacement for that screen.
 *
 * DEVIATION — covers. The frame's cards carry licensed Unsplash photography and
 * the handoff's open question #2 ("Who licenses the theme artwork?") is still
 * unanswered, so cards render the theme's own gradient with its glyph. Every
 * other measurement is the frame's.
 */
import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search } from "lucide-react-native";
import { EdChip, derived, palette } from "@/components/editorial";
import { THEME_FILTERS, browseThemes, resultCountLabel, themePriceLabel } from "@/lib/theme-browse";
import { getThemeById, gradientStops } from "@/lib/themes";
import { occasionLabel } from "@/lib/occasions";
import type { Template } from "@/lib/templates";
import { radii, space, touch, type } from "@/theme/tokens";

const GUTTER = 20;
const GRID_GAP = 14;
const COVER = 132;
/** The dashed cell has no cover, so the frame gives it an explicit height. */
const DASHED_MIN_HEIGHT = 190;

type Cell = { kind: "theme"; template: Template } | { kind: "own" };

export default function ThemesScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const results = useMemo(() => browseThemes({ query, filter }), [query, filter]);

  /**
   * "+ Your own photo" is always the LAST cell, so it moves as the grid
   * filters rather than sitting at a fixed index. A trailing spacer keeps a
   * lone final card at half width instead of stretching it across the row.
   */
  const cells = useMemo<(Cell | null)[]>(() => {
    const base: Cell[] = [
      ...results.map((template) => ({ kind: "theme" as const, template })),
      { kind: "own" as const },
    ];
    return base.length % 2 === 1 ? [...base, null] : base;
  }, [results]);

  const renderCell: ListRenderItem<Cell | null> = ({ item }) => {
    if (item === null) {
      return (
        <View
          style={{ flex: 1 }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      );
    }
    if (item.kind === "own") {
      return <OwnPhotoTile onPress={() => router.push("/create?theme=own")} />;
    }
    return (
      <ThemeCard
        template={item.template}
        onPress={() => router.push(`/theme/${item.template.id}`)}
      />
    );
  };

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: palette.paper }}>
      <View style={{ paddingHorizontal: GUTTER, paddingTop: 6, paddingBottom: 12 }}>
        <Text style={{ ...type.screenTitle, marginBottom: 12 }}>Find the look</Text>
        <View
          style={{
            minHeight: touch.min,
            backgroundColor: palette.pebble,
            borderRadius: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 9,
            paddingHorizontal: 14,
          }}
        >
          <Search size={16} color={palette.stone} strokeWidth={1.4} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search themes and occasions"
            placeholderTextColor={palette.stone}
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel="Search themes and occasions"
            style={{ flex: 1, ...type.body, paddingVertical: 10 }}
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingHorizontal: GUTTER, paddingBottom: GRID_GAP }}
        // `flexShrink: 0` as well as `flexGrow: 0`. With grow alone the row was
        // squeezed by the FlatList below it and the chips rendered clipped
        // through their own descenders — seen in a browser. Shrink is already
        // 0 by default on native, so this only changes the web target, which is
        // the one anybody can actually look at.
        style={{ flexGrow: 0, flexShrink: 0 }}
      >
        {THEME_FILTERS.map((f) => (
          <EdChip
            key={f.id}
            label={f.label}
            selected={filter === f.id}
            onPress={() => setFilter(f.id)}
            accessibilityLabel={`Filter themes: ${f.label}`}
          />
        ))}
      </ScrollView>

      <FlatList
        data={cells}
        keyExtractor={(c, i) =>
          c === null ? `spacer-${i}` : c.kind === "own" ? "own-photo" : c.template.id
        }
        numColumns={2}
        columnWrapperStyle={{ gap: GRID_GAP, paddingHorizontal: GUTTER }}
        contentContainerStyle={{ gap: GRID_GAP, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        renderItem={renderCell}
        ListHeaderComponent={
          <Text
            style={{ ...type.bodySecondary, paddingHorizontal: GUTTER, marginBottom: 12 }}
          >
            {resultCountLabel(results.length)}
          </Text>
        }
      />
    </SafeAreaView>
  );
}

function ThemeCard({ template, onPress }: { template: Template; onPress: () => void }) {
  const theme = getThemeById(template.themeId);
  const tint = theme ? gradientStops(theme)[0] : palette.pebble;
  const isPremium = template.tier === "premium";
  const occasion = occasionLabel(template.occasionId);
  const price = themePriceLabel(template.tier, theme?.price ?? 0);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${template.name}. ${occasion}. ${price}. ${template.tagline}`}
      style={({ pressed }) => ({
        flex: 1,
        borderWidth: 1,
        borderColor: pressed ? palette.ink : palette.mist,
        borderRadius: radii.md,
        overflow: "hidden",
      })}
    >
      <View
        style={{ height: COVER, backgroundColor: tint, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ fontSize: 38 }}>{template.emoji}</Text>
        {isPremium ? (
          <View
            style={{
              position: "absolute",
              top: 9,
              right: 9,
              minHeight: 24,
              paddingHorizontal: 9,
              borderRadius: radii.pill,
              // Ink at .78 over an arbitrary theme wash — the frame's own value.
              backgroundColor: "rgba(26,26,26,0.78)",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                ...type.buttonLabel,
                fontSize: 9.5,
                letterSpacing: 9.5 * 0.1,
                color: palette.paper,
              }}
            >
              Premium
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ paddingVertical: 11, paddingHorizontal: 12 }}>
        <Text numberOfLines={1} style={{ ...type.screenTitle, fontSize: 16, lineHeight: 16 * 1.2 }}>
          {template.name}
        </Text>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginTop: 3,
          }}
        >
          <Text style={{ ...type.bodySecondary, fontSize: 12 }}>{occasion}</Text>
          <Text
            style={{
              ...type.body,
              fontSize: 11,
              fontWeight: "600",
              // coralDeep: plain coral is 3.94:1 on paper and this is 11px.
              color: isPremium ? derived.coralDeep : palette.stone,
            }}
          >
            {price}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function OwnPhotoTile({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Use your own photo instead of a theme"
      style={({ pressed }) => ({
        flex: 1,
        minHeight: DASHED_MIN_HEIGHT,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: palette.mist,
        borderRadius: radii.md,
        alignItems: "center",
        justifyContent: "center",
        gap: space.x2,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ fontSize: 28, fontWeight: "300", color: palette.stone }}>+</Text>
      <Text style={{ ...type.buttonLabel, letterSpacing: 12 * 0.06, color: palette.stone }}>
        Your own photo
      </Text>
    </Pressable>
  );
}
