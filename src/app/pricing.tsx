import { useCallback, useState } from "react";
import { Alert, Linking, View } from "react-native";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Screen } from "@/components/ui";
import { Body, EdButton, EdToast, Heading, TextLink, useReducedMotion } from "@/components/editorial";
import { palette, radii } from "@/theme/tokens";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { PlanCard } from "@/components/pricing/PlanCard";
import { PricingFAQ } from "@/components/pricing/PricingFAQ";
import { useAuth } from "@/providers/AuthProvider";
import { getActiveTier } from "@/lib/tier";
import { createStripeCheckout, hasBackend, BackendUnavailableError } from "@/lib/api";
import { ENV } from "@/lib/env";
import { pricingPlans, type ClientPlan } from "@/lib/pricing";

/**
 * Pricing — mirrors web `src/app/pricing/page.tsx` + `PricingTiers.tsx`.
 * Headline, sub, plan table, per-plan CTA labels, button variants and the
 * support line are all web's. Plans come from `src/lib/pricing.ts`, which is a
 * 1:1 port of web's module and is diffed against it by the web parity suite.
 *
 * TWO DISCLOSED DELTAS, both backend limits rather than design choices:
 *
 * 1. No Monthly/Yearly cadence toggle. Web sends `cadence` to
 *    `/api/stripe/checkout`; the mobile BFF hard-codes the yearly price and
 *    accepts no cadence at all (`surprise-invite/src/app/api/mobile/stripe/
 *    checkout/route.ts:16` `UNLIMITED_PRICE_YEARLY`, and mobile's own
 *    `src/lib/api.ts` `createStripeCheckout` takes only `{ mode, themeId }`).
 *    Rendering a toggle that cannot change what Stripe charges would be a
 *    lying control, so the screen pins yearly — the cadence mobile bills.
 *
 * 2. The Gift CTA opens web checkout in the in-app browser instead of starting
 *    a native session. The mobile BFF explicitly does not mirror gift checkout
 *    ("Gift purchase checkout is intentionally not mirrored here", same file,
 *    line 14). Every other paid path on mobile already completes in a hosted
 *    browser page, so this is the same flow, not a downgrade — and the tier
 *    still appears in the table exactly as it does on web.
 */

/** Mobile bills Unlimited yearly only. See delta 1 above. */
const IS_YEARLY = true;

export default function Pricing() {
  const router = useRouter();
  const { session, profile, refreshProfile } = useAuth();
  const isAuthed = !!session;
  const tier = getActiveTier(profile);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  /**
   * One toast host per screen, in `Screen`'s `overlay` slot — children render
   * inside the ScrollView, where an absolute toast scrolls away with content.
   */
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = useCallback((m: string) => setToastMsg(m), []);
  const reducedMotion = useReducedMotion();


  async function startUnlimitedCheckout() {
    if (!hasBackend) {
      showToast(
        "Upgrades open a secure Stripe checkout hosted by the TaDaaaa web app. Connect EXPO_PUBLIC_API_BASE_URL to enable this."
      );
      return;
    }
    setLoadingKey("unlimited");
    try {
      const { url, error } = await createStripeCheckout({ mode: "unlimited" });
      if (error || !url) {
        showToast(error || "Checkout failed");
        return;
      }
      await WebBrowser.openBrowserAsync(url);
      // The Stripe webhook updates the subscription server-side; pull the latest tier.
      await refreshProfile();
    } catch (e) {
      showToast(
        e instanceof BackendUnavailableError
          ? e.message
          : (e as Error).message || "Could not start checkout. Try again."
      );
    } finally {
      setLoadingKey(null);
    }
  }

  async function openGiftCheckout() {
    if (!ENV.siteUrl) {
      showToast(
        "Buying a gift opens the TaDaaaa web checkout. Connect EXPO_PUBLIC_SITE_URL to enable this."
      );
      return;
    }
    await WebBrowser.openBrowserAsync(`${ENV.siteUrl}/pricing`);
  }

  /**
   * Web's `PlanCTA`, same routes and same button variants: the highlighted
   * tier gets `.btn-coral`, everything else gets `.btn-line`.
   */
  function ctaFor(plan: ClientPlan) {
    const variant = plan.highlight ? "coral" : "line";

    // `getActiveTier(null)` is "free", so this must also require a session —
    // otherwise a signed-out visitor is told Free is already their plan.
    if (isAuthed && plan.planKey === tier) {
      // Mobile knows the signed-in visitor's tier; web's pricing page does not.
      // Rather than add an eyebrow web lacks, the state lives in the CTA slot.
      return <EdButton title="Current plan" variant={variant} disabled onPress={() => {}} />;
    }

    const onPress = () => {
      switch (plan.planKey) {
        case "free":
          router.push(isAuthed ? "/(tabs)" : "/(auth)/sign-up");
          return;
        case "plus":
          router.push(isAuthed ? "/create" : "/(auth)/sign-up");
          return;
        case "gift":
          void openGiftCheckout();
          return;
        case "unlimited":
          if (!isAuthed) {
            router.push("/(auth)/sign-up");
            return;
          }
          void startUnlimitedCheckout();
      }
    };

    return (
      <EdButton
        title={plan.cta}
        variant={variant}
        onPress={onPress}
        loading={loadingKey === plan.planKey}
      />
    );
  }

  return (
    <Screen
      overlay={
        toastMsg ? (
          <EdToast
            message={toastMsg}
            reduced={reducedMotion}
            onDismiss={() => setToastMsg(null)}
          />
        ) : null
      }
      bg={palette.paper}
      scroll
      contentStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 56, gap: 0 }}
    >
      <ScreenHeader />

      {/* Web pricing head — centred, 34px serif, 15px sub capped at 520px. */}
      <View style={{ alignItems: "center", marginTop: 24, marginBottom: 48 }}>
        <Heading size={34} accessibilityRole="header" style={{ textAlign: "center" }}>
          Simple, honest pricing
        </Heading>
        <Body size={15} style={{ textAlign: "center", maxWidth: 520, marginTop: 12 }}>
          Start free. Upgrade when you want to do more. No subscriptions unless you want them.
        </Body>
      </View>

      {!hasBackend && (
        <View
          style={{
            backgroundColor: palette.pebble,
            borderColor: palette.mist,
            borderWidth: 1,
            borderRadius: radii.sm,
            padding: 14,
            marginBottom: 24,
          }}
        >
          <Body size={14}>
            Upgrades need the TaDaaaa backend connected. Set EXPO_PUBLIC_API_BASE_URL to enable
            checkout.
          </Body>
        </View>
      )}

      <View style={{ gap: 18 }}>
        {pricingPlans.map((plan) => (
          <PlanCard key={plan.name} plan={plan} isYearly={IS_YEARLY} cta={ctaFor(plan)} />
        ))}
      </View>

      <PricingFAQ />

      <View style={{ marginTop: 40, alignItems: "center" }}>
        <Body size={14} style={{ textAlign: "center" }}>
          Still stuck?
        </Body>
        <TextLink
          title="hello@tadaaaa.app"
          onPress={() => void Linking.openURL("mailto:hello@tadaaaa.app")}
        />
      </View>
    </Screen>
  );
}
