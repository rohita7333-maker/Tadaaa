import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Gift, Heart, LogIn } from "lucide-react-native";
import { Button, Card, Screen, Txt, colors, spacing } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { fetchGift, hasBackend, type GiftInfo } from "@/lib/api";

type ScreenState = "loading" | "found" | "not-found" | "no-backend";

/**
 * Gift redeem screen. `gift_purchases` has RLS enabled with no client policies
 * (service-role only), so the lookup goes through the backend BFF route
 * GET /api/mobile/gift/[token]. When no backend is configured we say so
 * honestly rather than showing a false "not found".
 */
export default function GiftRedeem() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [state, setState] = useState<ScreenState>("loading");
  const [gift, setGift] = useState<GiftInfo | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setState("not-found");
      return;
    }
    if (!hasBackend) {
      setState("no-backend");
      return;
    }
    setState("loading");
    const info = await fetchGift(token);
    if (!info) {
      setState("not-found");
      return;
    }
    setGift(info);
    setState("found");
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  if (state === "loading") {
    return (
      <Screen bg={colors.cream}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.rose} />
        </View>
      </Screen>
    );
  }

  if (state === "no-backend") {
    return (
      <Screen bg={colors.cream}>
        <View style={{ flex: 1, justifyContent: "center", gap: 16 }}>
          <Txt variant="eyebrow">gift link</Txt>
          <Txt variant="h1">Gifts need a connection</Txt>
          <Txt variant="body" muted>
            Redeeming a gift needs the TaDaaaa backend connected. Set
            EXPO_PUBLIC_API_BASE_URL, then reopen this link.
          </Txt>
          <Button title="Back" variant="outline" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  if (state === "not-found" || !gift) {
    return (
      <Screen bg={colors.cream}>
        <View style={{ flex: 1, justifyContent: "center", gap: 16 }}>
          <Txt variant="eyebrow">gift link</Txt>
          <Txt variant="h1">We couldn&apos;t find that gift</Txt>
          <Txt variant="body" muted>
            This link may be invalid, already redeemed, or expired.
          </Txt>
          <Button title="Browse plans" onPress={() => router.push("/pricing")} />
          <Button title="Back" variant="outline" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const status = gift.state;
  const isRedeemable = status === "redeemable";

  return (
    <Screen bg={colors.cream}>
      <View style={{ flex: 1, justifyContent: "center", gap: spacing.lg }}>
        <View style={{ gap: 4 }}>
          <Txt variant="eyebrow">you&apos;ve got a gift</Txt>
          <Txt variant="h1">
            {status === "redeemed"
              ? "Already redeemed"
              : status === "expired"
                ? "This gift has expired"
                : "A TaDaaaa gift for you"}
          </Txt>
        </View>

        <Card style={{ gap: 12, alignItems: "center", paddingVertical: 28 }}>
          <Gift size={36} color={colors.rose} />
          {gift.senderName ? (
            <Txt variant="body" style={{ textAlign: "center" }}>
              From <Txt variant="label">{gift.senderName}</Txt>
            </Txt>
          ) : null}
          {gift.giftMessage ? (
            <Txt variant="hand" style={{ textAlign: "center", fontSize: 18 }}>
              &ldquo;{gift.giftMessage}&rdquo;
            </Txt>
          ) : null}
          {!isRedeemable && (
            <Txt variant="body" muted style={{ textAlign: "center" }}>
              {status === "redeemed"
                ? "This gift link has already been used."
                : "This gift link is past its 90-day window."}
            </Txt>
          )}
        </Card>

        {isRedeemable && !user && (
          <Card style={{ gap: 10, alignItems: "center" }}>
            <LogIn size={22} color={colors.charcoal} />
            <Txt variant="body" style={{ textAlign: "center" }}>
              Sign in to redeem this gift and start your surprise.
            </Txt>
            <Button title="Sign in" onPress={() => router.push("/(auth)/sign-in")} />
          </Card>
        )}

        {isRedeemable && user && (
          <Button
            title="Redeem & create a surprise"
            left={<Heart size={18} color="#fff" />}
            onPress={() => router.push("/create")}
          />
        )}

        <Button title="Back" variant="outline" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
