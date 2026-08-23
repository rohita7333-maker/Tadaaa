/**
 * A2's second-launch sheet: "Use Face ID next time?"
 *
 * Mounted by the tab shell, not by the sign-in screen — the offer belongs to
 * the launch AFTER a sign-in, so a screen that unmounts the moment auth
 * succeeds is the wrong host for it.
 */
import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { EdButton } from "@/components/editorial";
import { Sheet } from "@/components/handoff/Sheet";
import { useAuth } from "@/providers/AuthProvider";
import { authenticate, checkBiometrics } from "@/lib/biometrics";
import {
  hasAskedFaceId,
  markFaceIdAsked,
  recordSignIn,
  shouldOfferFaceId,
} from "@/lib/face-id-offer";
import { supabase } from "@/lib/supabase";
import { space, type } from "@/theme/tokens";

export function FaceIdOfferSheet() {
  const { user, profile, refreshProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("Face ID");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user || !profile) return;
      const [count, asked, bio] = await Promise.all([
        recordSignIn(),
        hasAskedFaceId(),
        checkBiometrics(),
      ]);
      if (!alive) return;
      if (bio.available) setLabel(bio.label);
      if (
        shouldOfferFaceId({
          signInCount: count,
          alreadyAsked: asked,
          alreadyEnabled: !!profile.biometric_lock,
          available: bio.available,
        })
      ) {
        setOpen(true);
      }
    })();
    return () => {
      alive = false;
    };
    // Runs once per mount of the signed-in shell, which IS the launch.
  }, [user, profile]);

  const dismiss = useCallback(async () => {
    setOpen(false);
    await markFaceIdAsked();
  }, []);

  async function enable() {
    if (!user) return;
    setBusy(true);
    try {
      // Prove the sensor works BEFORE persisting, same as B6 — otherwise a
      // failed enrolment locks the app behind something that cannot open it.
      const ok = await authenticate(`Turn on ${label} for TaDaaaa`);
      if (!ok) return;
      await supabase.from("profiles").update({ biometric_lock: true }).eq("id", user.id);
      await refreshProfile();
    } finally {
      setBusy(false);
      await dismiss();
    }
  }

  return (
    <Sheet visible={open} onClose={dismiss} title="Welcome back">
      <Text style={{ ...type.screenTitle, fontSize: 22, marginBottom: space.x2 }}>
        Use {label} next time?
      </Text>
      <Text style={{ ...type.bodySecondary, marginBottom: space.x5 }}>
        Drafts and half-written surprises stay private on a shared phone. You can turn it off in
        You at any time.
      </Text>
      <View style={{ gap: space.x3 }}>
        <EdButton title={`Use ${label}`} loading={busy} onPress={enable} />
        <EdButton title="Not now" variant="line" disabled={busy} onPress={dismiss} />
      </View>
    </Sheet>
  );
}
