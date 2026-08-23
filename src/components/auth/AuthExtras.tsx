/**
 * A2's block below the primary button: "Email me a magic link instead →", a
 * "Forgot password? Reset it" line, the `or` divider, and the Apple / Google
 * pills SIDE BY SIDE.
 *
 * Split out rather than pasted into both routes so the two cannot drift, which
 * is what happened to the sign-in and sign-up screens the first time.
 *
 * DEVIATION — the Apple pill is rendered DISABLED with a reason rather than
 * hidden, unlike A1 where it is omitted entirely. The frame draws two pills
 * side by side and a single lonely Google pill at half width reads as a layout
 * bug; a greyed pill that says why reads as a fact. `appleSignInAvailable()`
 * is the one thing that changes when the developer account exists.
 */
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { EdDivider, derived, palette } from "@/components/editorial";
import { useAuth } from "@/providers/AuthProvider";
import { radii, space, touch, type } from "@/theme/tokens";

/** Same gate as A1 — see `(auth)/welcome.tsx`. */
export function appleSignInAvailable(): boolean {
  return false;
}

export function AuthExtras({
  email,
  mode,
  onNotify,
}: {
  email: string;
  mode: "in" | "up";
  onNotify: (message: string) => void;
}) {
  const { signInWithMagicLink, resetPassword, signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState<null | "magic" | "reset" | "google">(null);

  async function magicLink() {
    if (!email.trim()) {
      onNotify("Add your email first, then I'll send the link.");
      return;
    }
    setBusy("magic");
    try {
      await signInWithMagicLink(email);
      onNotify("Check your email — the link signs you straight in.");
    } catch (e) {
      onNotify((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function forgot() {
    if (!email.trim()) {
      onNotify("Add your email first, then I'll send the reset.");
      return;
    }
    setBusy("reset");
    try {
      await resetPassword(email);
      // Deliberately the same line whether or not the address has an account:
      // a different message here is an account-existence oracle.
      onNotify("If that address has an account, the reset is on its way.");
    } catch (e) {
      onNotify((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <View>
      <View style={{ alignItems: "center", gap: space.x3, marginTop: 20 }}>
        <Pressable
          onPress={magicLink}
          disabled={busy !== null}
          accessibilityRole="button"
          accessibilityLabel="Email me a magic link instead"
          hitSlop={8}
          style={{ minHeight: touch.min, justifyContent: "center" }}
        >
          <Text
            style={{
              ...type.body,
              fontSize: 14,
              fontWeight: "600",
              // coralDeep: plain coral is 3.94:1 on paper and this is 14px.
              color: derived.coralDeep,
              opacity: busy === "magic" ? 0.5 : 1,
            }}
          >
            Email me a magic link instead →
          </Text>
        </Pressable>

        {mode === "in" ? (
          <Pressable
            onPress={forgot}
            disabled={busy !== null}
            accessibilityRole="button"
            accessibilityLabel="Forgot password? Reset it"
            hitSlop={8}
            style={{ minHeight: touch.min, justifyContent: "center" }}
          >
            <Text style={{ ...type.bodySecondary, opacity: busy === "reset" ? 0.5 : 1 }}>
              Forgot password?{" "}
              <Text style={{ fontWeight: "600", color: derived.coralDeep }}>Reset it</Text>
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={{ marginTop: 28, marginBottom: 18 }}>
        <EdDivider label="or" />
      </View>

      <View style={{ flexDirection: "row", gap: space.x3 }}>
        <ProviderPill
          label="Apple"
          disabled
          hint="Apple sign-in isn't set up yet"
          onPress={() => onNotify("Apple sign-in isn't configured for this build yet.")}
        />
        <ProviderPill
          label="Google"
          busy={busy === "google"}
          onPress={async () => {
            setBusy("google");
            try {
              await signInWithGoogle();
            } catch (e) {
              onNotify((e as Error).message || "Google sign-in failed. Try again.");
            } finally {
              setBusy(null);
            }
          }}
        />
      </View>
    </View>
  );
}

function ProviderPill({
  label,
  onPress,
  disabled,
  busy,
  hint,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  hint?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={hint ? `${label}. ${hint}.` : `Continue with ${label}`}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: touch.control,
        borderWidth: 1,
        borderColor: palette.mist,
        borderRadius: radii.pill,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.45 : busy ? 0.6 : pressed ? 0.7 : 1,
      })}
    >
      <Text
        style={{
          ...type.buttonLabel,
          fontSize: 13,
          letterSpacing: 13 * 0.04,
          textTransform: "none",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
