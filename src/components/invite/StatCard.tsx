import { View } from "react-native";
import type { ReactNode } from "react";
import { Txt, colors, radii, spacing } from "@/components/ui";

/** Small metric tile used in the invite detail stats row. */
export function StatCard({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        gap: 6,
        paddingVertical: spacing.lg,
        backgroundColor: colors.white,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.hair,
      }}
    >
      {icon}
      <Txt variant="h3">{value}</Txt>
      <Txt variant="label" muted style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.6 }}>
        {label}
      </Txt>
    </View>
  );
}
