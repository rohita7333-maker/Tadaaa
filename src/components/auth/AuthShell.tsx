/**
 * `.auth` card + `.authtabs` from the editorial mockup.
 *
 * Two divergences, both platform:
 * - The mockup swaps the two forms inside one screen; the real app has two
 *   routes (`/(auth)/sign-in`, `/(auth)/sign-up`), so the inactive tab
 *   navigates instead of re-rendering in place. Rendered result matches.
 * - The mockup's auth screen sits under a persistent `.topnav` carrying the
 *   `.logo` wordmark. Mobile has no such chrome on the auth stack, so the
 *   wordmark is rendered above the card using the mockup's own `.logo` /
 *   `.logo i` treatment. The card itself carries no `h2`, exactly as the
 *   mockup's `authBody` does not.
 */
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Body, Heading, useReducedMotion } from "@/components/editorial";
import { fonts, palette, radii, shadows } from "@/theme/tokens";

const TABS = [
  { key: "in", label: "Sign in", href: "/(auth)/sign-in" },
  { key: "up", label: "Sign up", href: "/(auth)/sign-up" },
] as const;

const LOGO_SIZE = 20;

export function AuthShell({ active, children }: { active: "in" | "up"; children: ReactNode }) {
  const router = useRouter();
  const reduced = useReducedMotion();

  return (
    <View style={{ gap: 24 }}>
      {/* Frame A2's header row: a back chevron to A1, the "ACCOUNT" micro-label
          centred, and a matching-width spacer so the label stays centred. */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 44,
        }}
      >
        <Pressable
          onPress={() => router.replace("/(auth)/welcome")}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}
          style={({ pressed }) => ({ paddingHorizontal: 8, opacity: pressed ? 0.5 : 1 })}
        >
          <Text style={{ fontSize: 26, color: palette.ink }}>‹</Text>
        </Pressable>
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: 11,
            fontWeight: "600",
            letterSpacing: 11 * 0.1,
            textTransform: "uppercase",
            color: palette.stone,
          }}
        >
          Account
        </Text>
        <View style={{ width: 34 }} />
      </View>

      <Text
        accessibilityRole="header"
        style={{
          fontFamily: fonts.heading,
          fontWeight: "400",
          fontSize: LOGO_SIZE,
          letterSpacing: LOGO_SIZE * -0.01,
          color: palette.ink,
          textAlign: "center",
        }}
      >
        TaDaaaa<Text style={{ color: palette.coral }}>.</Text>
      </Text>

      <View
        style={{
          width: "100%",
          maxWidth: 400,
          alignSelf: "center",
          backgroundColor: palette.paper,
          borderWidth: 1,
          borderColor: palette.mist,
          borderRadius: radii.md,
          paddingVertical: 32,
          paddingHorizontal: 24,
        }}
      >
        <View
          accessibilityRole="tablist"
          style={{
            flexDirection: "row",
            gap: 6,
            backgroundColor: palette.pebble,
            borderRadius: radii.md,
            padding: 5,
            marginBottom: 22,
          }}
        >
          {TABS.map((tab) => {
            const on = tab.key === active;
            return (
              <Pressable
                key={tab.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => {
                  if (!on) router.replace(tab.href);
                }}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    minHeight: 44,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 10,
                    borderRadius: 9,
                    backgroundColor: on ? palette.paper : "transparent",
                    transform: [{ scale: pressed && !on && !reduced ? 0.98 : 1 }],
                  },
                  on && shadows.base,
                ]}
              >
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 14,
                    fontWeight: "600",
                    color: on ? palette.ink : palette.stone,
                  }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Web's auth card headline + sub (`components/auth/AuthForm.tsx:218-223`).
            Mobile opened straight onto a bare tab strip with neither. */}
        <View style={{ gap: 4, marginBottom: 4 }}>
          <Heading size={26} accessibilityRole="header">
            {active === "up" ? "Create your account" : "Welcome back"}
          </Heading>
          <Body size={14}>
            {active === "up"
              ? "It takes about a minute. No card needed."
              : "Pick up where you left off."}
          </Body>
        </View>

        <View style={{ gap: 16 }}>{children}</View>
      </View>
    </View>
  );
}
