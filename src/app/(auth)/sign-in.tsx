import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Heart } from "lucide-react-native";
import { Button, Field, Screen, Txt, colors, gradients, radii } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { signInSchema, magicLinkSchema } from "@/lib/schemas";
import { GoogleButton } from "@/components/auth/GoogleButton";

export default function SignIn() {
  const { signInWithPassword, signInWithMagicLink } = useAuth();
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

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
      Alert.alert("Couldn't sign in", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function submitMagic() {
    const parsed = magicLinkSchema.safeParse({ email });
    if (!parsed.success) {
      setErrors({ email: parsed.error.flatten().fieldErrors.email?.[0] });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await signInWithMagicLink(email);
      setMagicSent(true);
    } catch (e) {
      Alert.alert("Couldn't send link", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen bg={colors.cream} scroll contentStyle={{ gap: 20, paddingTop: 40 }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ gap: 20 }}>
        <View style={{ alignItems: "center", gap: 10, marginBottom: 8 }}>
          <LinearGradient
            colors={gradients.rose}
            style={{ width: 56, height: 56, borderRadius: radii.lg, alignItems: "center", justifyContent: "center" }}
          >
            <Heart size={26} color="#fff" fill="#fff" />
          </LinearGradient>
          <Txt variant="eyebrow">welcome back</Txt>
          <Txt variant="h1">TaDaaaa</Txt>
          <Txt variant="body" muted style={{ textAlign: "center" }}>
            Sign in to craft and manage your surprises.
          </Txt>
        </View>

        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          placeholder="you@example.com"
        />

        {mode === "password" && (
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            secureTextEntry
            placeholder="••••••••"
          />
        )}

        {magicSent ? (
          <Txt variant="body" style={{ color: colors.roseDeep, textAlign: "center" }}>
            ✨ Check your email for a magic sign-in link.
          </Txt>
        ) : (
          <Button
            title={mode === "password" ? "Sign in" : "Send magic link"}
            loading={loading}
            onPress={mode === "password" ? submitPassword : submitMagic}
          />
        )}

        <GoogleButton />

        <Pressable onPress={() => { setMode(mode === "password" ? "magic" : "password"); setMagicSent(false); }}>
          <Txt variant="body" style={{ color: colors.rose, textAlign: "center" }}>
            {mode === "password" ? "Email me a magic link instead" : "Use a password instead"}
          </Txt>
        </Pressable>

        <View style={{ flexDirection: "row", justifyContent: "center", gap: 5, marginTop: 4 }}>
          <Txt variant="body" muted>New here?</Txt>
          <Link href="/(auth)/sign-up" asChild>
            <Pressable>
              <Txt variant="body" style={{ color: colors.rose, fontFamily: "DMSans_700Bold" }}>
                Create an account
              </Txt>
            </Pressable>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
