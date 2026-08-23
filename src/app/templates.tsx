/**
 * Templates marketplace — the RN equivalent of the mockup's templates screen
 * (`tadaaaa-editorial.html` L690-697 markup, L282-296 CSS): a `.phead`, a
 * scrolling `.chips` filter row, a `.rescount` line, then the `.tgrid` of
 * `.tcard`s.
 *
 * Pushed screen (not a modal) so back navigation feels like browsing, matching
 * /pricing and /settings. Filtering behaviour is unchanged.
 */
import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View, type ListRenderItem } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  EdChip,
  EdEmpty,
  EdMeta,
  EdPageHead,
  fonts,
  palette,
  radii,
  derived,
} from "@/components/editorial";
import {
  LETTER_SPACING_HEADING_RATIO,
  LINE_HEIGHT_HEADING_RATIO,
} from "@/theme/tokens";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import {
  templates,
  filterTemplates,
  allStyleTags,
  REVEAL_STYLE_LABELS,
  type Template,
} from "@/lib/templates";
import { occasions, getThemeById, gradientStops } from "@/lib/themes";

const FEATURED_COUNT = 5;
const GUTTER = 20;
const GRID_GAP = 12;
const FEATURED_CARD_WIDTH = 168;
const FEATURED_COVER_HEIGHT = 150;
/** `.tcard .img { height:150px }`, scaled for the 2-up mobile grid. */
const GRID_COVER_HEIGHT = 128;
const CARD_TITLE_SIZE = 17;

const OCCASION_FILTERS: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  ...occasions.map((o) => ({ id: o.id, label: o.label })),
];

const PRICE_FILTERS: { id: "all" | "free" | "premium"; label: string }[] = [
  { id: "all", label: "Any price" },
  { id: "free", label: "Free" },
  { id: "premium", label: "Premium" },
];

const STYLE_FILTERS = allStyleTags().map((tag) => ({ id: tag, label: tag }));

export default function TemplatesScreen() {
  const router = useRouter();
  const [activeOccasion, setActiveOccasion] = useState("all");
  const [activeTier, setActiveTier] = useState<"all" | "free" | "premium">("all");
  const [activeStyleTags, setActiveStyleTags] = useState<string[]>([]);

  const filtered = useMemo(
    () =>
      filterTemplates({
        occasionId: activeOccasion,
        tier: activeTier,
        styleTags: activeStyleTags,
      }),
    [activeOccasion, activeTier, activeStyleTags]
  );
  const featured = useMemo(() => templates.slice(0, FEATURED_COUNT), []);
  // A 2-column FlatList stretches a lone trailing card across the full row.
  // One invisible spacer keeps the last real card at half width.
  const grid: (Template | null)[] = useMemo(
    () => (filtered.length % 2 === 1 ? [...filtered, null] : filtered),
    [filtered]
  );

  function toggleStyleTag(tag: string) {
    setActiveStyleTags((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]
    );
  }

  function openTemplate(template: Template) {
    router.push({ pathname: "/create", params: { template: template.id } });
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: palette.pebble }}>
      <ScreenHeader variant="back" title="Templates" />

      <FlatList
        data={grid}
        keyExtractor={(t, i) => t?.id ?? `spacer-${i}`}
        numColumns={2}
        columnWrapperStyle={{ gap: GRID_GAP, paddingHorizontal: GUTTER }}
        contentContainerStyle={{ gap: GRID_GAP, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        renderItem={renderGridItem(openTemplate)}
        ListHeaderComponent={
          <View style={{ gap: 22, paddingBottom: GRID_GAP }}>
            <EdPageHead
              title="Find their moment"
              sub="A ready-made occasion, theme, and reveal — just add your words."
              style={{ paddingHorizontal: GUTTER, paddingTop: 8 }}
            />

            <ChipRow
              items={OCCASION_FILTERS}
              activeIds={[activeOccasion]}
              onToggle={setActiveOccasion}
              labelPrefix="Filter by occasion"
            />
            <ChipRow
              items={PRICE_FILTERS}
              activeIds={[activeTier]}
              onToggle={(id) => setActiveTier(id as "all" | "free" | "premium")}
              labelPrefix="Filter by price"
            />
            <ChipRow
              items={STYLE_FILTERS}
              activeIds={activeStyleTags}
              onToggle={toggleStyleTag}
              labelPrefix="Filter by style"
            />

            <View style={{ gap: GRID_GAP }}>
              <CardTitle style={{ paddingHorizontal: GUTTER }}>Featured</CardTitle>
              <FlatList
                horizontal
                data={featured}
                keyExtractor={(t) => t.id}
                showsHorizontalScrollIndicator={false}
                snapToInterval={FEATURED_CARD_WIDTH + GRID_GAP}
                decelerationRate="fast"
                contentContainerStyle={{ gap: GRID_GAP, paddingHorizontal: GUTTER }}
                renderItem={({ item }) => (
                  <TemplateCard
                    template={item}
                    onPress={() => openTemplate(item)}
                    width={FEATURED_CARD_WIDTH}
                    coverHeight={FEATURED_COVER_HEIGHT}
                  />
                )}
              />
            </View>

            {/* `.rescount` */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 12,
                paddingHorizontal: GUTTER,
              }}
            >
              <CardTitle>
                {activeOccasion === "all"
                  ? "The collection"
                  : `${OCCASION_FILTERS.find((f) => f.id === activeOccasion)?.label ?? ""} templates`}
              </CardTitle>
              <EdMeta>
                {filtered.length} {filtered.length === 1 ? "result" : "results"}
              </EdMeta>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={{ paddingHorizontal: GUTTER }}>
            <EdEmpty>No templates match those filters yet. Try clearing one.</EdEmpty>
          </View>
        }
      />
    </SafeAreaView>
  );
}

/** Section heading at the `.panel h3` size. */
function CardTitle({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.ComponentProps<typeof Text>["style"];
}) {
  return (
    <Text
      style={[
        {
          fontFamily: fonts.heading,
          fontWeight: "400",
          fontSize: 19,
          lineHeight: 19 * LINE_HEIGHT_HEADING_RATIO,
          letterSpacing: 19 * LETTER_SPACING_HEADING_RATIO,
          color: palette.ink,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/**
 * `.chips` — one horizontal scroller per facet. Occasion and price are
 * single-select, style is multi-select; the difference lives in the caller's
 * `onToggle`, not here.
 */
function ChipRow({
  items,
  activeIds,
  onToggle,
  labelPrefix,
}: {
  items: { id: string; label: string }[];
  activeIds: string[];
  onToggle: (id: string) => void;
  labelPrefix: string;
}) {
  if (items.length === 0) return null;
  return (
    <FlatList
      horizontal
      data={items}
      keyExtractor={(f) => f.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingHorizontal: GUTTER }}
      renderItem={({ item }) => (
        <EdChip
          label={item.label}
          selected={activeIds.includes(item.id)}
          onPress={() => onToggle(item.id)}
          accessibilityLabel={`${labelPrefix}: ${item.label}`}
        />
      )}
    />
  );
}

/**
 * `.tcard` — flat theme wash + glyph cover, then a paper body carrying the
 * name and the free/premium price note. One card component serves both the
 * featured rail (fixed width) and the grid (flexed), so the two can never
 * drift apart.
 */
function TemplateCard({
  template,
  onPress,
  width,
  coverHeight = GRID_COVER_HEIGHT,
}: {
  template: Template;
  onPress: () => void;
  width?: number;
  coverHeight?: number;
}) {
  const theme = getThemeById(template.themeId);
  const occasion = occasions.find((o) => o.id === template.occasionId);
  // Flat leading stop, not the ramp — the identity bans decorative gradients.
  const tint = theme ? gradientStops(theme)[0] : palette.pebble;
  const isPremium = template.tier === "premium";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${template.name} — ${isPremium ? "Premium" : "Free"} ${REVEAL_STYLE_LABELS[template.revealType]} template for ${occasion?.label ?? "any occasion"}. ${template.tagline}`}
      style={({ pressed }) => [
        {
          width,
          flex: width == null ? 1 : undefined,
          borderRadius: radii.md,
          overflow: "hidden",
          backgroundColor: palette.paper,
          borderWidth: 1,
          borderColor: pressed ? palette.ink : palette.mist,
        },
      ]}
    >
      <View
        style={{
          height: coverHeight,
          backgroundColor: tint,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* `.tcard .img .pv` — reveal style, legible over any theme wash. */}
        <View
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            backgroundColor: palette.paper,
            borderRadius: radii.pill,
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 9.5,
              fontWeight: "600",
              letterSpacing: 9.5 * 0.1,
              textTransform: "uppercase",
              color: palette.stone,
            }}
          >
            {REVEAL_STYLE_LABELS[template.revealType]}
          </Text>
        </View>
        <Text style={{ fontSize: 38 }}>{template.emoji}</Text>
      </View>

      <View style={{ padding: 14, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontFamily: fonts.heading,
              fontWeight: "400",
              fontSize: CARD_TITLE_SIZE,
              lineHeight: CARD_TITLE_SIZE * LINE_HEIGHT_HEADING_RATIO,
              letterSpacing: CARD_TITLE_SIZE * LETTER_SPACING_HEADING_RATIO,
              color: palette.ink,
            }}
          >
            {template.name}
          </Text>
          {/* `.tcard .pr` / `.tcard .pr.free` */}
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 12,
              fontWeight: "600",
              color: isPremium ? derived.coralDeep : palette.stone,
            }}
          >
            {isPremium ? "Premium" : "Free"}
          </Text>
        </View>
        <EdMeta>{occasion?.label ?? "Any occasion"}</EdMeta>
      </View>
    </Pressable>
  );
}

function renderGridItem(onOpen: (t: Template) => void): ListRenderItem<Template | null> {
  return ({ item }) =>
    item ? (
      <TemplateCard template={item} onPress={() => onOpen(item)} />
    ) : (
      <View style={{ flex: 1 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
    );
}
