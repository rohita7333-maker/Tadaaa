import { useState } from "react";
import { Alert, View } from "react-native";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Button, Chip, Screen, Txt, colors, spacing } from "@/components/ui";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { PlanCard } from "@/components/pricing/PlanCard";
import { useAuth } from "@/providers/AuthProvider";
import { getActiveTier } from "@/lib/tier";
import { createStripeCheckout, hasBackend, BackendUnavailableError } from "@/lib/api";
import { PREMIUM_THEME_PRICE, FREE_INVITE_MONTHLY_LIMIT } from "@/lib/constants";

type CheckoutMode = "plus" | "unlimited";

export default function Pricing() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const tier = getActiveTier(profile);
  const [loadingMode, setLoadingMode] = useState<CheckoutMode | null>(null);

  async function upgrade(mode: CheckoutMode) {
    if (!hasBackend) {
      Alert.alert(
        "Backend not connected",
        "Upgrades open a secure Stripe checkout hosted by the TaDaaaa web app. Connect EXPO_PUBLIC_API_BASE_URL to enable this."
      );
      return;
    }
    setLoadingMode(mode);
    try {
      const { url, error } = await createStripeCheckout({ mode });
      if (error || !url) {
        Alert.alert("Couldn't start checkout", error || "Please try again in a moment.");
        return;
      }
      await WebBrowser.openBrowserAsync(url);
      // The Stripe webhook updates the subscription server-side; pull the latest tier.
      await refreshProfile();
    } catch (e) {
      if (e instanceof BackendUnavailableError) {
        Alert.alert("Backend not connected", e.message);
      } else {
        Alert.alert("Couldn't start checkout", (e as Error).message);
      }
    } finally {
      setLoadingMode(null);
    }
  }

  return (
    <Screen bg={colors.cream} scroll contentStyle={{ paddingTop: spacing.sm }}>
      <ScreenHeader />
      <View style={{ gap: 4 }}>
        <Txt variant="eyebrow">upgrade</Txt>
        <Txt variant="h1">Plans</Txt>
        <Txt variant="body" muted>
          Free, Plus, and Unlimited — checkout opens in a secure browser, no in-app purchase.
        </Txt>
      </View>

      {!hasBackend && (
        <View
          style={{
            backgroundColor: colors.goldChipBg,
            borderColor: colors.goldChipBorder,
            borderWidth: 1,
            borderRadius: 14,
            padding: spacing.md,
          }}
        >
          <Txt variant="body" style={{ color: colors.goldChipText }}>
            Upgrades need the TaDaaaa backend connected. Set EXPO_PUBLIC_API_BASE_URL to enable checkout.
          </Txt>
        </View>
      )}

      <View style={{ gap: spacing.lg }}>
        <PlanCard
          name="Free"
          price="$0"
          priceNote="/ forever"
          isCurrent={tier === "free"}
          features={[
            `${FREE_INVITE_MONTHLY_LIMIT} surprises a month`,
            "3 free themes",
            "Standard reveal links",
            `Unlock any premium theme à la carte for $${PREMIUM_THEME_PRICE.toFixed(2)}`,
          ]}
          cta={
            tier === "free" ? (
              <Chip label="You're here" />
            ) : undefined
          }
        />

        <PlanCard
          name="Plus"
          price="See price at checkout"
          isCurrent={tier === "plus"}
          highlight={tier !== "unlimited"}
          features={[
            "Unlimited surprises",
            "All premium themes included",
            "Video reveals",
            "Priority support",
          ]}
          cta={
            tier === "plus" ? undefined : (
              <Button
                title="Unlock themes in Create"
                variant="outline"
                onPress={() => router.push("/create")}
              />
            )
          }
        />

        <PlanCard
          name="Unlimited"
          price="See price at checkout"
          isCurrent={tier === "unlimited"}
          features={[
            "Everything in Plus",
            "Highest-quality signed media links",
            "Early access to new themes",
            "Best for frequent surprise-makers",
          ]}
          cta={
            tier === "unlimited" ? undefined : (
              <Button
                title="Upgrade to Unlimited"
                variant="dark"
                onPress={() => upgrade("unlimited")}
                loading={loadingMode === "unlimited"}
                disabled={!hasBackend || loadingMode !== null}
              />
            )
          }
        />
      </View>
    </Screen>
  );
}
