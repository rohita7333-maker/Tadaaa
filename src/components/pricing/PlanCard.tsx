import type { ReactNode } from "react";
import { View } from "react-native";
import { Check } from "lucide-react-native";
import { Button, Card, Chip, Txt, colors, spacing } from "@/components/ui";

export interface PlanCardProps {
  name: string;
  price: string;
  priceNote?: string;
  features: string[];
  isCurrent: boolean;
  cta?: ReactNode;
  highlight?: boolean;
}

/** One pricing tier card — used for Free / Plus / Unlimited on the pricing screen. */
export function PlanCard({ name, price, priceNote, features, isCurrent, cta, highlight }: PlanCardProps) {
  return (
    <Card
      style={{
        gap: spacing.md,
        borderColor: highlight ? colors.rose : colors.hair,
        borderWidth: highlight ? 1.5 : 1,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Txt variant="h3">{name}</Txt>
        {isCurrent ? <Chip label="Current plan" tone="green" /> : null}
      </View>

      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
        <Txt variant="h1">{price}</Txt>
        {priceNote ? <Txt variant="body" muted style={{ paddingBottom: 4 }}>{priceNote}</Txt> : null}
      </View>

      <View style={{ gap: 8 }}>
        {features.map((f) => (
          <View key={f} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
            <Check size={16} color={colors.rose} style={{ marginTop: 2 }} />
            <Txt variant="body" style={{ flex: 1 }}>{f}</Txt>
          </View>
        ))}
      </View>

      {cta}
    </Card>
  );
}
