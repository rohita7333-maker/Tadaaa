/**
 * "Continue with Google" — reused on sign-in and sign-up. Drives
 * useAuth().signInWithGoogle (native OAuth reusing the web app's Google creds).
 * Includes the "or" divider so both screens stay consistent.
 */
import { useState } from "react";
import { Alert, View } from "react-native";
import { Button, Txt, colors, fonts } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";

export function GoogleButton() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  async function onPress() {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      Alert.alert("Google sign-in failed", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.hair }} />
        <Txt variant="body" muted style={{ fontSize: 12 }}>or</Txt>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.hair }} />
      </View>
      <Button
        title="Continue with Google"
        variant="outline"
        loading={loading}
        onPress={onPress}
        left={
          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.hair, alignItems: "center", justifyContent: "center" }}>
            <Txt style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: "#4285F4" }}>G</Txt>
          </View>
        }
      />
    </View>
  );
}
