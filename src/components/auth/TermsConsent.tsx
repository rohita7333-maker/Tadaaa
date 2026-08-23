/**
 * Terms + privacy consent for sign-up — the checkbox the Create account button
 * is gated on, plus the two legal links.
 *
 * Web states the same thing as a sentence under the form ("By creating an
 * account you agree to our Terms and Privacy Policy."); mobile makes it an
 * explicit opt-in because app stores expect an affirmative action.
 */
import { Pressable, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { derived, fonts, palette, radii } from "@/theme/tokens";
import { ENV } from "@/lib/env";

type LegalPath = "/terms" | "/privacy";

const BOX = 22;
const TOUCH = 44;

/** Same destination and same failure message as `settings.tsx`'s `openLegal`. */
function openLegal(path: LegalPath, onNotify?: (message: string) => void) {
  if (!ENV.siteUrl) {
    // A missing config is a notification, not a decision — web toasts these.
    onNotify?.("Legal pages need EXPO_PUBLIC_SITE_URL configured.");
    return;
  }
  WebBrowser.openBrowserAsync(`${ENV.siteUrl}${path}`);
}

function LegalLink({
  title,
  path,
  onNotify,
}: {
  title: string;
  path: LegalPath;
  onNotify?: (message: string) => void;
}) {
  return (
    <Pressable
      onPress={() => openLegal(path, onNotify)}
      hitSlop={8}
      accessibilityRole="link"
      accessibilityHint="Opens in your browser"
      style={{ minHeight: TOUCH, justifyContent: "center" }}
    >
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: 13,
          fontWeight: "600",
          color: derived.coralDeep,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function TermsConsent({
  accepted,
  onChange,
  onNotify,
}: {
  accepted: boolean;
  onChange: (next: boolean) => void;
  /** Transient messages go up to the screen's single toast host. */
  onNotify?: (message: string) => void;
}) {
  return (
    <View>
      <Pressable
        onPress={() => onChange(!accepted)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
        accessibilityLabel="I agree to the Terms of Service and Privacy Policy"
        style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: TOUCH }}
      >
        <View
          style={{
            width: BOX,
            height: BOX,
            borderRadius: radii.sm - 2,
            borderWidth: accepted ? 0 : 1,
            borderColor: palette.mist,
            // coral-deep, not coral: the ✓ below is 13px/700 TEXT, and white on
            // `palette.coral` measures 3.96:1 — under the 4.5:1 AA floor. Same
            // call, same reason, as web's `.ed-btn-coral`, which is grounded in
            // `--coral-deep` (5.47:1) and pinned by `src/app/ed-atoms.test.ts`.
            backgroundColor: accepted ? derived.coralDeep : palette.paper,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {accepted ? (
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 13,
                fontWeight: "700",
                color: derived.white,
                lineHeight: 15,
              }}
            >
              ✓
            </Text>
          ) : null}
        </View>
        <Text
          style={{
            flex: 1,
            fontFamily: fonts.body,
            fontSize: 13,
            lineHeight: 18,
            color: palette.stone,
          }}
        >
          I agree to the Terms of Service and Privacy Policy.
        </Text>
      </Pressable>

      <View
        style={{ flexDirection: "row", alignItems: "center", gap: 18, marginLeft: 32 }}
      >
        <LegalLink title="Terms of Service" path="/terms" onNotify={onNotify} />
        <LegalLink title="Privacy Policy" path="/privacy" onNotify={onNotify} />
      </View>
    </View>
  );
}
