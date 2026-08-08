/**
 * Templates marketplace — mirrors the web /templates page: pick a curated
 * occasion + theme + reveal-style bundle, then jump into the create wizard
 * with it preset. Pushed screen (not a modal) so back navigation feels like
 * browsing, matching /pricing and /settings.
 */
import { useMemo, useState } from "react";
import { FlatList, Pressable, View, type ListRenderItem } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Screen, Txt, colors, fonts, radii, shadows, spacing } from "@/components/ui";
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
const GRID_GAP = spacing.md;
// Featured carousel card geometry — declared here (above first use in the
// snapToInterval below) rather than beside FeaturedCard further down.
const FEATURED_CARD_WIDTH = 168;
const FEATURED_COVER_HEIGHT = 150;

const OCCASION_FILTERS: { id: string; label: string; emoji: string }[] = [
  { id: "all", label: "All", emoji: "✨" },
  ...occasions.map((o) => ({ id: o.id, label: o.label, emoji: o.emoji })),
];

const PRICE_FILTERS: { id: "all" | "free" | "premium"; label: string; emoji: string }[] = [
  { id: "all", label: "Any price", emoji: "💫" },
  { id: "free", label: "Free", emoji: "🎁" },
  { id: "premium", label: "Premium", emoji: "✨" },
];

const STYLE_FILTERS: { id: string; label: string }[] = allStyleTags().map((tag) => ({
  id: tag,
  label: tag,
}));

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

  function toggleStyleTag(tag: string) {
    setActiveStyleTags((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]
    );
  }

  function openTemplate(template: Template) {
    router.push({ pathname: "/create", params: { template: template.id } });
  }

  return (
    <Screen bg={colors.creamDark} scroll={false} contentStyle={{ padding: 0, gap: 0 }}>
      <ScreenHeader variant="back" title="Templates" subtitle="find their moment" />

      <FlatList
        data={filtered}
        keyExtractor={(t) => t.id}
        numColumns={2}
        columnWrapperStyle={{ gap: GRID_GAP, paddingHorizontal: spacing.xl }}
        contentContainerStyle={{ gap: GRID_GAP, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        renderItem={renderGridItem(openTemplate)}
        ListHeaderComponent={
          <View style={{ gap: spacing.xxl, paddingBottom: spacing.lg }}>
            <View style={{ paddingHorizontal: spacing.xl, gap: 4, paddingTop: spacing.sm }}>
              <Txt variant="eyebrow">psst… they have no idea</Txt>
              <Txt variant="h1">Find their moment</Txt>
              <Txt variant="body" muted>
                A ready-made occasion, theme, and reveal — just add your words.
              </Txt>
            </View>

            <ChipRow
              items={OCCASION_FILTERS}
              activeIds={[activeOccasion]}
              onToggle={setActiveOccasion}
              accessibilityLabelPrefix="Filter templates by occasion"
            />

            <ChipRow
              items={PRICE_FILTERS}
              activeIds={[activeTier]}
              onToggle={(id) => setActiveTier(id as "all" | "free" | "premium")}
              accessibilityLabelPrefix="Filter templates by price"
            />

            <ChipRow
              items={STYLE_FILTERS}
              activeIds={activeStyleTags}
              onToggle={toggleStyleTag}
              accessibilityLabelPrefix="Filter templates by style"
            />

            <View style={{ gap: spacing.md }}>
              <Txt variant="h3" style={{ paddingHorizontal: spacing.xl }}>
                Featured
              </Txt>
              <FlatList
                horizontal
                data={featured}
                keyExtractor={(t) => t.id}
                showsHorizontalScrollIndicator={false}
                snapToInterval={FEATURED_CARD_WIDTH + spacing.md}
                decelerationRate="fast"
                contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.xl }}
                renderItem={({ item }) => (
                  <FeaturedCard template={item} onPress={() => openTemplate(item)} />
                )}
              />
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "baseline",
                justifyContent: "space-between",
                paddingHorizontal: spacing.xl,
              }}
            >
              <Txt variant="h3">
                {activeOccasion === "all"
                  ? "The Collection"
                  : `${OCCASION_FILTERS.find((f) => f.id === activeOccasion)?.label ?? ""} templates`}
              </Txt>
              <Txt variant="body" muted style={{ fontSize: 12.5 }}>
                {filtered.length} {filtered.length === 1 ? "result" : "results"}
              </Txt>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={{ paddingHorizontal: spacing.xl }}>
            <Txt variant="body" muted style={{ textAlign: "center" }}>
              No templates match those filters yet — try clearing one.
            </Txt>
          </View>
        }
      />
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Shared filter-chip row — occasion (single-select), price (single-select),
// and style (multi-select) all render through this one component. Selection
// semantics live in the caller's onToggle (replace vs. toggle-membership).
// ---------------------------------------------------------------------------
interface ChipItem {
  id: string;
  label: string;
  emoji?: string;
}

function ChipRow({
  items,
  activeIds,
  onToggle,
  accessibilityLabelPrefix,
}: {
  items: ChipItem[];
  activeIds: string[];
  onToggle: (id: string) => void;
  accessibilityLabelPrefix: string;
}) {
  if (items.length === 0) return null;
  return (
    <FlatList
      horizontal
      data={items}
      keyExtractor={(f) => f.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.xl }}
      renderItem={({ item }) => {
        const selected = activeIds.includes(item.id);
        return (
          <Pressable
            onPress={() => onToggle(item.id)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${accessibilityLabelPrefix}: ${item.label}`}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: radii.pill,
              borderWidth: 1.5,
              borderColor: selected ? colors.rose : colors.lightGray,
              backgroundColor: selected ? colors.roseChipBg : colors.white,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            })}
          >
            {item.emoji ? <Txt style={{ fontSize: 14 }}>{item.emoji}</Txt> : null}
            <Txt
              style={{
                fontFamily: fonts.bodyMedium,
                fontSize: 12.5,
                color: selected ? colors.roseDeep : colors.charcoal,
                textTransform: item.emoji ? "none" : "capitalize",
              }}
            >
              {item.label}
            </Txt>
          </Pressable>
        );
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Featured carousel card — peeking, user-driven snap. No autoplay: mobile
// carousels are touch-driven, and a 3D coverflow (the web treatment) doesn't
// translate to a good touch target, so this stays a flat peeking-card row.
// (FEATURED_CARD_WIDTH / FEATURED_COVER_HEIGHT are declared at the top of the
// module, above the snapToInterval that consumes the width.)
// ---------------------------------------------------------------------------
function FeaturedCard({ template, onPress }: { template: Template; onPress: () => void }) {
  const theme = getThemeById(template.themeId);
  const occasion = occasions.find((o) => o.id === template.occasionId);
  const stops = theme ? gradientStops(theme) : [colors.roseLight, colors.rose];
  const isPremium = template.tier === "premium";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${template.name} — ${isPremium ? "Premium" : "Free"} ${REVEAL_STYLE_LABELS[template.revealType]} template for ${occasion?.label ?? "any occasion"}`}
      style={({ pressed }) => [
        { width: FEATURED_CARD_WIDTH, borderRadius: radii.xl, overflow: "hidden", backgroundColor: colors.white },
        shadows.sm,
        { transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}
    >
      <LinearGradient
        colors={stops as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ height: FEATURED_COVER_HEIGHT, alignItems: "center", justifyContent: "center" }}
      >
        <Txt style={{ fontSize: 44 }}>{template.emoji}</Txt>
      </LinearGradient>
      <View style={{ padding: spacing.sm, gap: 2 }}>
        <Txt style={{ fontFamily: fonts.headingSemi, fontSize: 13.5, color: colors.charcoal }} numberOfLines={1}>
          {template.name}
        </Txt>
        <Txt style={{ fontFamily: fonts.body, fontSize: 10.5, color: colors.warmGray }} numberOfLines={1}>
          {occasion?.label ?? "Any occasion"}
        </Txt>
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Grid card — 2-column collection view.
// ---------------------------------------------------------------------------
const GRID_COVER_HEIGHT = 128;

function TemplateCard({ template, onPress }: { template: Template; onPress: () => void }) {
  const theme = getThemeById(template.themeId);
  const stops = theme ? gradientStops(theme) : [colors.roseLight, colors.rose];
  const isPremium = template.tier === "premium";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${template.name} — ${isPremium ? "Premium" : "Free"} ${REVEAL_STYLE_LABELS[template.revealType]} template. ${template.tagline}`}
      style={({ pressed }) => [
        { flex: 1, borderRadius: radii.xl, overflow: "hidden", backgroundColor: colors.white },
        shadows.sm,
        { transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}
    >
      <LinearGradient
        colors={stops as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ height: GRID_COVER_HEIGHT, alignItems: "center", justifyContent: "center" }}
      >
        <View
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            backgroundColor: "rgba(255,255,255,0.85)",
            borderRadius: radii.pill,
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}
        >
          <Txt style={{ fontFamily: fonts.bodyMedium, fontSize: 9.5, color: colors.charcoal }}>
            {REVEAL_STYLE_LABELS[template.revealType]}
          </Txt>
        </View>
        <Txt style={{ fontSize: 38 }}>{template.emoji}</Txt>
      </LinearGradient>
      <View style={{ padding: spacing.sm, gap: 3 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 4 }}>
          <Txt style={{ fontFamily: fonts.headingSemi, fontSize: 13, color: colors.charcoal, flex: 1 }} numberOfLines={1}>
            {template.name}
          </Txt>
          <Txt
            style={{
              fontFamily: fonts.bodyBold,
              fontSize: 9,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              color: isPremium ? colors.gold : colors.warmGray,
            }}
          >
            {isPremium ? "Premium" : "Free"}
          </Txt>
        </View>
        <Txt style={{ fontFamily: fonts.hand, fontSize: 13, color: colors.rose }} numberOfLines={2}>
          {template.tagline}
        </Txt>
      </View>
    </Pressable>
  );
}

function renderGridItem(onOpen: (t: Template) => void): ListRenderItem<Template> {
  return ({ item }) => <TemplateCard template={item} onPress={() => onOpen(item)} />;
}
