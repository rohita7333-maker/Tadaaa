import type { ReactNode } from "react";
import { View } from "react-native";
import { Body, EdCard, Heading, Label } from "@/components/editorial";
import { palette, derived } from "@/theme/tokens";
import { formatPlanPrice, planPeriodLabel, type ClientPlan } from "@/lib/pricing";

export interface PlanCardProps {
  plan: ClientPlan;
  /** Mirrors web's cadence state. Mobile pins it to yearly — see pricing.tsx. */
  isYearly: boolean;
  cta?: ReactNode;
}

/**
 * One pricing tier. A 1:1 mirror of web's card in
 * `surprise-invite/src/components/pricing/PricingTiers.tsx`:
 *
 *   paper ground · `--r-md` · 2px coral border when highlighted else 1px mist
 *   px-7/py-8 (28/32) · `.label` badge eyebrow (coral-deep when highlighted,
 *   stone otherwise, blank space when the plan has no badge so every card's
 *   baseline lines up) · 19px name · 38px headline-face price · 13px period ·
 *   14px feature rows on pebble hairlines · CTA last.
 *
 * Web renders `plan.description` nowhere, so neither does this. Every figure
 * comes from `src/lib/pricing.ts`; no price literal is written into this markup.
 */
export function PlanCard({ plan, isYearly, cta }: PlanCardProps) {
  const price = (isYearly ? plan.yearlyPrice ?? plan.monthlyPrice : plan.monthlyPrice) ?? 0;

  return (
    <EdCard accent={plan.highlight} style={{ paddingVertical: 32, paddingHorizontal: 28 }}>
      <Label
        style={{
          color: plan.highlight ? derived.coralDeep : palette.stone,
          marginBottom: 8,
        }}
      >
        {plan.badge ?? " "}
      </Label>

      <Heading size={19} accessibilityRole="header">
        {plan.name}
      </Heading>

      <Heading size={38} style={{ marginTop: 10, marginBottom: 2 }}>
        {formatPlanPrice(price)}
      </Heading>
      <Body size={13} style={{ marginBottom: 18 }}>
        {planPeriodLabel(plan, isYearly)}
      </Body>

      <View style={{ marginBottom: 22 }}>
        {plan.features.map((f) => (
          <View
            key={f}
            style={{
              paddingVertical: 6,
              borderBottomWidth: 1,
              borderBottomColor: palette.pebble,
            }}
          >
            <Body size={14}>{f}</Body>
          </View>
        ))}
      </View>

      {cta}
    </EdCard>
  );
}
