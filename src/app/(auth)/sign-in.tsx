import { useCallback, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, View } from "react-native";
import { Screen } from "@/components/ui";
import { EdButton, EdField, EdToast, useReducedMotion } from "@/components/editorial";
import { palette } from "@/theme/tokens";
import { useAuth } from "@/providers/AuthProvider";
import { signInSchema, magicLinkSchema } from "@/lib/schemas";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthExtras } from "@/components/auth/AuthExtras";
import { PasswordField } from "@/components/auth/PasswordField";

export default function SignIn() {
  const { signInWithPassword, signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  /**
   * One toast host per screen, in `Screen`'s `overlay` slot — children render
   * inside the ScrollView, where an absolute toast scrolls away with content.
   */
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = useCallback((m: string) => setToastMsg(m), []);
  const reducedMotion = useReducedMotion();


  async function submitPassword() {
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({ email: f.email?.[0], password: f.password?.[0] });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await signInWithPassword(email, password);
    } catch (e) {
      showToast((e as Error).message || "Could not sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }


  return (
    <Screen
      overlay={
        toastMsg ? (
          <EdToast
            message={toastMsg}
            reduced={reducedMotion}
            onDismiss={() => setToastMsg(null)}
          />
        ) : null
      }
      bg={palette.paper}
      scroll
      contentStyle={{ paddingHorizontal: 20, paddingTop: 32, paddingBottom: 48, gap: 0 }}
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <AuthShell active="in">
          <EdField
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            placeholder="you@example.com"
          />

          <PasswordField
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            autoComplete="current-password"
            textContentType="password"
            placeholder="Your password"
          />

          <EdButton title="Sign in" variant="ink" loading={loading} onPress={submitPassword} />

          {/* Frame A2 order: primary button, THEN the magic-link and reset
              links, THEN the `or` divider, THEN the two provider pills. The
              shipped screen had Google and the divider ABOVE the fields and a
              magic-link MODE TOGGLE below — a second state to be in rather than
              a second thing to do. */}
          <AuthExtras email={email} mode="in" onNotify={showToast} />
        </AuthShell>
      </KeyboardAvoidingView>
    </Screen>
  );
}
