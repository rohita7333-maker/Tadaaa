import { useCallback, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/ui";
import { EdButton, EdField, EdToast, useReducedMotion } from "@/components/editorial";
import { palette } from "@/theme/tokens";
import { useAuth } from "@/providers/AuthProvider";
import { signUpSchema } from "@/lib/schemas";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthExtras } from "@/components/auth/AuthExtras";
import { PasswordField } from "@/components/auth/PasswordField";
import { TermsConsent } from "@/components/auth/TermsConsent";
import { confirmPasswordError } from "@/components/auth/password-match";

export default function SignUp() {
  const { signUpWithPassword } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  /**
   * One toast host per screen, in `Screen`'s `overlay` slot — children render
   * inside the ScrollView, where an absolute toast scrolls away with content.
   */
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = useCallback((m: string) => setToastMsg(m), []);
  const reducedMotion = useReducedMotion();


  /**
   * Once the confirm field has content it owns its own message, so a match
   * clears the error the moment the user fixes it instead of waiting for the
   * next submit. While it is empty there is nothing live to say, so the
   * submit-time message stands.
   */
  const confirmFieldError = confirmPassword
    ? confirmPasswordError(password, confirmPassword)
    : errors.confirmPassword;

  async function submit() {
    // Client-side gates first; `signUpSchema` and the Supabase payload below
    // are untouched — confirmation and consent never leave this screen.
    const confirmError = confirmPasswordError(password, confirmPassword);
    const parsed = signUpSchema.safeParse({ fullName, email, password });
    if (!parsed.success || confirmError) {
      const f = parsed.success ? {} : parsed.error.flatten().fieldErrors;
      setErrors({
        fullName: f.fullName?.[0],
        email: f.email?.[0],
        password: f.password?.[0],
        confirmPassword: confirmError,
      });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const { needsConfirmation } = await signUpWithPassword(email, password, fullName);
      if (needsConfirmation) {
        Alert.alert(
          "Almost there!",
          "We sent a confirmation link to your email. Confirm it, then sign in.",
          [{ text: "OK", onPress: () => router.replace("/(auth)/sign-in") }]
        );
      }
      // else onAuthStateChange redirects into the app automatically.
    } catch (e) {
      showToast((e as Error).message || "Could not create account. Please try again.");
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
        <AuthShell active="up">

          <EdField
            label="Full name"
            value={fullName}
            onChangeText={setFullName}
            error={errors.fullName}
            autoComplete="name"
            textContentType="name"
            maxLength={100}
            placeholder="Your name"
          />
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
            meter
            autoComplete="new-password"
            textContentType="newPassword"
            placeholder="8+ chars, mixed case, number, symbol"
          />
          <PasswordField
            label="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={confirmFieldError}
            autoComplete="new-password"
            textContentType="newPassword"
            placeholder="Re-enter your password"
          />

          <TermsConsent accepted={acceptedTerms} onChange={setAcceptedTerms} onNotify={showToast} />

          <EdButton
            title="Create account"
            variant="coral"
            loading={loading}
            disabled={!acceptedTerms}
            onPress={submit}
          />

          {/* Frame A2: the magic-link line and the provider pills sit below the
              primary button on BOTH tabs. Sign-up drops "Forgot password?" —
              there is nothing to forget yet. */}
          <AuthExtras email={email} mode="up" onNotify={showToast} />
        </AuthShell>
      </KeyboardAvoidingView>
    </Screen>
  );
}
