import { Stack } from "expo-router";
import { colors } from "@/theme/tokens";

export default function CreateLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }} />
  );
}
