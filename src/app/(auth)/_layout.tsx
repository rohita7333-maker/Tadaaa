import { Stack } from "expo-router";
import { palette } from "@/theme/tokens";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Mockup `body{background:var(--paper)}` — the auth card is paper on
        // paper, separated by its `--mist` hairline.
        contentStyle: { backgroundColor: palette.paper },
      }}
    />
  );
}
