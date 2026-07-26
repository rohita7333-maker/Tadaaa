import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Heart } from "lucide-react-native";
import { Button, Field, Screen, Txt, colors, gradients, radii } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { signUpSchema } from "@/lib/schemas";
import { GoogleButton } from "@/components/auth/GoogleButton";

export default function SignUp() {
  const { signUpWithPassword } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ fullName?: string; email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  async function submit() {
    const parsed = signUpSchema.safeParse({ fullName, email, password });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({ fullName: f.fullName?.[0], email: f.email?.[0], password: f.password?.[0] });
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
      Alert.alert("Couldn't create account", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen bg={colors.cream} scroll contentStyle={{ gap: 18, paddingTop: 40 }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ gap: 18 }}>
        <View style={{ alignItems: "center", gap: 10, marginBottom: 8 }}>
          <LinearGradient
            colors={gradients.rose}
            style={{ width: 56, height: 56, borderRadius: radii.lg, alignItems: "center", justifyContent: "center" }}
          >
            <Heart size={26} color="#fff" fill="#fff" />
          </LinearGradient>
          <Txt variant="eyebrow">let's make magic</Txt>
          <Txt variant="h1">Create account</Txt>
        </View>

        <Field label="Your name" value={fullName} onChangeText={setFullName} error={errors.fullName} placeholder="Alex Rivera" />
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
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          secureTextEntry
          placeholder="At least 8 characters"
        />

        <Button title="Create account" loading={loading} onPress={submit} />

        <GoogleButton />

        <View style={{ flexDirection: "row", justifyContent: "center", gap: 5, marginTop: 4 }}>
          <Txt variant="body" muted>Already have an account?</Txt>
          <Link href="/(auth)/sign-in" asChild>
            <Pressable>
              <Txt variant="body" style={{ color: colors.rose, fontFamily: "DMSans_700Bold" }}>Sign in</Txt>
            </Pressable>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
