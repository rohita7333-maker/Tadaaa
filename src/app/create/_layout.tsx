import { Stack } from "expo-router";
import { palette } from "@/theme/tokens";

export default function CreateLayout() {
  return (
    // `--pebble` is the app-chrome ground the wizard sits on; panels inside it
    // are `--paper`. Matching the stack background stops a paper flash on push.
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.pebble } }} />
  );
}
