import { Stack } from "expo-router";
import { palette } from "@/theme/tokens";

/**
 * A3–A4. Its own group so the root gate can send a signed-in user with no
 * `welcomed_at` here instead of into the tabs, and so Skip can leave at any
 * point without unwinding the auth stack.
 */
export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        contentStyle: { backgroundColor: palette.paper },
      }}
    />
  );
}
