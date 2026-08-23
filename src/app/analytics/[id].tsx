/**
 * B5 — Analytics for one surprise.
 *
 * Frame anatomy: a 40px `‹` / uppercase surprise title / 40px `↑` header row ·
 * 2-up stat tiles · three bordered panels (7-day bar chart, funnel, rows) ·
 * on the free tier the three panels are replaced by a blurred placeholder
 * stack with one "Unlock full analytics" row over it.
 *
 * WIRING — one call, `get_invite_analytics(p_invite_id)`, a SECURITY DEFINER
 * aggregate added for this screen. It was not a convenience: `invite_answers`
 * has no `invite_id` (it joins through `invite_questions`), a client-side
 * 7-day histogram would need every view row and PostgREST truncates silently
 * at max-rows, and the handoff requires the TIER GATE to be server-side. A
 * free-tier caller never receives the panel data — the blur covers empty
 * placeholders, not withheld numbers.
 *
 * Verified live over PostgREST before this screen existed: anon → forbidden;
 * owner + paid surprise → full payload; owner + free surprise → totals with
 * empty panels; another creator's id and a nonexistent id → the same
 * `forbidden`, so the function is not an id oracle.
 *
 * DEVIATIONS from the frame, all forced by the schema and all listed in
 * `lib/analytics.ts`: tile 2 is "This week", not "Avg time" (no duration is
 * recorded anywhere); panel 3 is "What they opened it on", not "Where from"
 * (there is no IP, region or country column — only `user_agent`); the funnel
 * is three rows, not four ("Scrolled" and "Saw photos" need the handoff's
 * `reveal_events` table, which does not exist).
 */
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { ChevronLeft, Share as ShareIcon } from "lucide-react-native";
import { EdToast, palette } from "@/components/editorial";
import { StatTile } from "@/components/handoff";
import {
  AnalyticsPanel,
  DeviceRows,
  FunnelBars,
  LockedPanels,
  ViewsBarChart,
} from "@/components/handoff/AnalyticsPanels";
import { SkeletonPanel } from "@/components/handoff/EdgeStates";
import {
  analyticsReportHtml,
  buildBars,
  buildFunnel,
  parseAnalytics,
  type InviteAnalytics,
} from "@/lib/analytics";
import { supabase } from "@/lib/supabase";
import { ENV } from "@/lib/env";
import { screenPadding, space, touch, type } from "@/theme/tokens";

/** Frame B5's header buttons are 40px squares. */
const NAV = 40;

interface Loaded {
  readonly title: string;
  readonly slug: string;
  readonly data: InviteAnalytics;
}

type Screen =
  | { readonly kind: "loading" }
  | { readonly kind: "ready"; readonly loaded: Loaded }
  | { readonly kind: "denied" };

async function loadAnalytics(id: string): Promise<Screen> {
  // The title is read separately and NOT folded into the RPC: `invites` already
  // has an owner-scoped policy, and putting user-authored text inside a
  // SECURITY DEFINER return is how a definer function grows a leak.
  const [{ data: invite }, { data: raw }] = await Promise.all([
    supabase.from("invites").select("title, slug").eq("id", id).is("deleted_at", null).maybeSingle(),
    supabase.rpc("get_invite_analytics", { p_invite_id: id }),
  ]);

  const parsed = parseAnalytics(raw);
  if (!parsed.ok || !invite) return { kind: "denied" };
  return { kind: "ready", loaded: { title: invite.title, slug: invite.slug, data: parsed.data } };
}

export default function Analytics() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>({ kind: "loading" });
  const [toast, setToast] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setScreen(await loadAnalytics(id));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const loaded = screen.kind === "ready" ? screen.loaded : null;

  async function onExport() {
    if (!loaded || exporting) return;
    setExporting(true);
    try {
      const { uri } = await Print.printToFileAsync({
        html: analyticsReportHtml({
          title: loaded.title,
          url: `${ENV.siteUrl}/surprise/${loaded.slug}`,
          generatedAt: new Date(),
          data: loaded.data,
        }),
      });
      // Sharing, not RN's Share: `Share.share({ url })` carries a local file on
      // iOS and silently drops it on Android. This is the one API that hands a
      // generated PDF to the system sheet on both.
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
      } else {
        await Print.printAsync({ uri });
      }
    } catch {
      setToast("Could not build that report. Try again in a moment.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: palette.paper }}>
      {/* Header — 40px chevron, uppercase title, 40px export. */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 6,
          paddingHorizontal: 16,
          paddingBottom: space.x3,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          // Drawn at the frame's 40, padded out with hitSlop to clear the 44
          // floor. Growing the circle instead would move the title off centre.
          hitSlop={(touch.min - NAV) / 2}
          style={({ pressed }) => ({
            width: NAV,
            height: NAV,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.5 : 1,
          })}
        >
          <ChevronLeft size={24} color={palette.ink} strokeWidth={1.4} />
        </Pressable>
        <Text numberOfLines={1} style={{ ...type.sectionLabel, letterSpacing: 11 * 0.1, flex: 1, textAlign: "center" }}>
          {loaded?.title ?? "Analytics"}
        </Text>
        <Pressable
          onPress={onExport}
          disabled={!loaded || exporting}
          accessibilityRole="button"
          accessibilityLabel="Export a PDF report"
          hitSlop={(touch.min - NAV) / 2}
          style={({ pressed }) => ({
            width: NAV,
            height: NAV,
            alignItems: "center",
            justifyContent: "center",
            opacity: loaded && !exporting ? (pressed ? 0.5 : 1) : 0.4,
          })}
        >
          <ShareIcon size={17} color={palette.ink} strokeWidth={1.4} />
        </Pressable>
      </View>

      {screen.kind === "loading" ? (
        // Frame F3: never a spinner. Skeletons at the real panel dimensions,
        // so nothing shifts when the numbers land.
        <View
          style={{ paddingHorizontal: screenPadding.default, gap: space.x4, marginTop: space.x1 }}
        >
          <View style={{ flexDirection: "row", gap: space.x3 }}>
            <View style={{ flex: 1 }}>
              <SkeletonPanel height={30} index={0} />
            </View>
            <View style={{ flex: 1 }}>
              <SkeletonPanel height={30} index={1} />
            </View>
          </View>
          <SkeletonPanel height={110} index={2} />
          <SkeletonPanel height={84} index={3} />
        </View>
      ) : screen.kind === "denied" ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: screenPadding.centered, gap: space.x3 }}
        >
          <Text style={{ ...type.screenTitle, fontSize: 22, textAlign: "center" }}>
            These numbers aren&apos;t yours
          </Text>
          <Text style={{ ...type.bodySecondary, textAlign: "center" }}>
            Only the person who made a surprise can see how it did.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: screenPadding.default, paddingBottom: space.x9 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flexDirection: "row", gap: space.x3, marginBottom: 18 }}>
            <StatTile variant="wide" value={String(screen.loaded.data.views)} label="Views" />
            <StatTile variant="wide" value={String(screen.loaded.data.weekViews)} label="This week" />
          </View>

          {screen.loaded.data.full ? (
            <View style={{ gap: space.x4 }}>
              <AnalyticsPanel title="Views, last 7 days" headingGap={16}>
                <ViewsBarChart bars={buildBars(screen.loaded.data.days)} />
                {screen.loaded.data.loggedViews < screen.loaded.data.views ? (
                  // Never let the chart silently disagree with the tile above
                  // it. Opens recorded before per-open logging existed bumped
                  // the counter without leaving a dated row.
                  <Text style={{ ...type.bodySecondary, fontSize: 12, marginTop: space.x3 }}>
                    {screen.loaded.data.views - screen.loaded.data.loggedViews} earlier opens
                    aren&apos;t dated, so they aren&apos;t on this chart.
                  </Text>
                ) : null}
              </AnalyticsPanel>

              <AnalyticsPanel title="How far they got" headingGap={14}>
                <FunnelBars rows={buildFunnel(screen.loaded.data)} />
              </AnalyticsPanel>

              <AnalyticsPanel title="What they opened it on" headingGap={12}>
                {screen.loaded.data.devices.length > 0 ? (
                  <DeviceRows devices={screen.loaded.data.devices} />
                ) : (
                  <Text style={type.bodySecondary}>Nobody has opened it yet.</Text>
                )}
                <Text style={{ ...type.bodySecondary, fontSize: 12, marginTop: space.x3 }}>
                  Read from the browser each visitor used. An iPad in desktop mode reports as a Mac.
                </Text>
              </AnalyticsPanel>
            </View>
          ) : (
            <LockedPanels onUnlock={() => router.push("/pricing")} />
          )}
        </ScrollView>
      )}

      {toast ? <EdToast message={toast} onDismiss={() => setToast(null)} /> : null}
    </SafeAreaView>
  );
}
