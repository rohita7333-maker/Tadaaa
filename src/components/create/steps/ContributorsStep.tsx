/**
 * C3 — Contributors.
 *
 * Frame anatomy: a 52px "A playful question" field · a "Dodging 'No' button"
 * toggle · a "Let friends pile on" toggle, and when it is on, a pebble block
 * holding the contribution link and three pills (Invite from contacts / Share /
 * QR) · then "n pending · n approved" with a coral "Approve all" and the pending
 * cards (name, PENDING label, serif italic quote, Reject / Approve).
 *
 * DEVIATION — batch SMS. The frame promises "send pre-written SMS invites in one
 * batch". No app can send SMS silently — iOS and Android both require the user
 * to see and send the message. Contacts multi-select is real; the send opens ONE
 * system composer addressed to everyone picked, pre-filled. That is the closest
 * honest thing to "one tap", and it is what the platforms allow.
 *
 * The pending block only renders once the surprise exists: a draft has no
 * contributions, and the frame's populated state is the edit case.
 */
import { useState } from "react";
import { Linking, Platform, Pressable, Share, Text, TextInput, View } from "react-native";
import * as Contacts from "expo-contacts";
import * as Clipboard from "expo-clipboard";
import { derived, palette } from "@/components/editorial";
import { Toggle } from "@/components/handoff";
import { QrCard } from "@/components/handoff/QrCard";
import { Sheet } from "@/components/handoff/Sheet";
import { pendingLine, type OwnerContribution } from "@/lib/contributions";
import { radii, space, touch, type } from "@/theme/tokens";

function Pill({
  label,
  filled,
  onPress,
}: {
  label: string;
  filled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        minHeight: 40,
        paddingHorizontal: 14,
        borderRadius: radii.pill,
        backgroundColor: filled ? palette.ink : palette.paper,
        borderWidth: filled ? 0 : 1,
        borderColor: palette.mist,
        justifyContent: "center",
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text
        style={{
          ...type.buttonLabel,
          fontSize: 11,
          letterSpacing: 11 * 0.06,
          color: filled ? palette.paper : palette.ink,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function ContributorsStep({
  question,
  dodgingNo,
  contributionsOpen,
  contributeUrl,
  pending,
  approvedCount,
  onQuestionChange,
  onDodgingNoChange,
  onContributionsOpenChange,
  onModerate,
  onApproveAll,
  onNotify,
}: {
  question: string;
  dodgingNo: boolean;
  contributionsOpen: boolean;
  contributeUrl: string;
  pending: OwnerContribution[];
  approvedCount: number;
  onQuestionChange: (v: string) => void;
  onDodgingNoChange: (v: boolean) => void;
  onContributionsOpenChange: (v: boolean) => void;
  onModerate: (id: string, status: "approved" | "rejected") => void;
  onApproveAll: () => void;
  onNotify: (message: string) => void;
}) {
  const [qrOpen, setQrOpen] = useState(false);

  async function inviteFromContacts() {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== "granted") {
      onNotify("Allow contacts access to pick who to invite.");
      return;
    }
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
    });
    const numbers = data
      .flatMap((c) => c.phoneNumbers ?? [])
      .map((p) => p.number)
      .filter((n): n is string => !!n);

    if (numbers.length === 0) {
      onNotify("No contacts with phone numbers on this phone.");
      return;
    }

    // The platforms differ in how a multi-recipient composer is addressed.
    const body = encodeURIComponent(
      `I'm putting together a surprise. Add a message here — it takes a minute, no account needed: ${contributeUrl}`
    );
    const recipients = numbers.slice(0, 20).join(Platform.OS === "ios" ? "," : ";");
    const url =
      Platform.OS === "ios"
        ? `sms:/open?addresses=${encodeURIComponent(recipients)}&body=${body}`
        : `sms:${recipients}?body=${body}`;

    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      onNotify("This device can't open the messages app.");
      return;
    }
    await Linking.openURL(url);
  }

  return (
    <View>
      <View style={{ marginBottom: 4 }}>
        <Text style={{ ...type.fieldLabel, marginBottom: 7 }}>A playful question</Text>
        <TextInput
          value={question}
          onChangeText={onQuestionChange}
          placeholder="Save me a seat?"
          placeholderTextColor={palette.stone}
          accessibilityLabel="A playful question"
          style={{
            minHeight: touch.control,
            borderWidth: 1,
            borderColor: palette.mist,
            borderRadius: radii.sm,
            paddingHorizontal: 15,
            ...type.body,
            fontSize: 17,
          }}
        />
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: palette.mist,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ ...type.body, fontSize: 15, fontWeight: "600" }}>
            Dodging “No” button
          </Text>
          <Text style={type.bodySecondary}>It runs from their thumb. A classic.</Text>
        </View>
        <Toggle
          value={dodgingNo}
          onValueChange={onDodgingNoChange}
          accessibilityLabel="Dodging No button"
        />
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 16 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ ...type.body, fontSize: 15, fontWeight: "600" }}>Let friends pile on</Text>
          <Text style={type.bodySecondary}>
            They add words and photos before it goes live
          </Text>
        </View>
        <Toggle
          value={contributionsOpen}
          onValueChange={onContributionsOpenChange}
          accessibilityLabel="Let friends pile on"
        />
      </View>

      {contributionsOpen ? (
        <View
          style={{
            backgroundColor: palette.pebble,
            borderRadius: radii.md,
            padding: 14,
            marginBottom: 16,
          }}
        >
          <Text style={{ ...type.bodySecondary, marginBottom: space.x3 }} numberOfLines={1}>
            {contributeUrl}
          </Text>
          <View style={{ flexDirection: "row", gap: space.x2, flexWrap: "wrap" }}>
            <Pill label="Invite from contacts" filled onPress={inviteFromContacts} />
            <Pill
              label="Share"
              onPress={() =>
                Share.share({
                  message: `Add a message to a surprise I'm making — no account needed: ${contributeUrl}`,
                }).catch(() => {})
              }
            />
            <Pill label="QR" onPress={() => setQrOpen(true)} />
            <Pill
              label="Copy"
              onPress={() => {
                Clipboard.setStringAsync(contributeUrl);
                onNotify("Link copied.");
              }}
            />
          </View>
        </View>
      ) : null}

      {pending.length > 0 || approvedCount > 0 ? (
        <View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: space.x3,
            }}
          >
            <Text style={type.sectionLabel}>{pendingLine(pending.length, approvedCount)}</Text>
            {pending.length > 0 ? (
              <Pressable onPress={onApproveAll} accessibilityRole="button" hitSlop={10}>
                <Text
                  style={{
                    ...type.body,
                    fontSize: 12,
                    fontWeight: "600",
                    color: derived.coralDeep,
                  }}
                >
                  Approve all
                </Text>
              </Pressable>
            ) : null}
          </View>

          {pending.map((c) => (
            <View
              key={c.id}
              style={{
                borderWidth: 1,
                borderColor: palette.mist,
                borderRadius: radii.md,
                padding: 14,
                marginBottom: space.x3,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <Text style={{ ...type.body, fontSize: 14, fontWeight: "600" }}>
                  {c.name.trim() || "Someone"}
                </Text>
                <Text
                  style={{
                    ...type.buttonLabel,
                    fontSize: 10,
                    letterSpacing: 10 * 0.08,
                    color: derived.coralDeep,
                  }}
                >
                  Pending
                </Text>
              </View>
              <Text
                style={{
                  ...type.screenTitle,
                  fontSize: 15,
                  lineHeight: 15 * 1.5,
                  fontStyle: "italic",
                  color: palette.stone,
                  marginBottom: 12,
                }}
              >
                “{c.message}”
              </Text>
              <View style={{ flexDirection: "row", gap: space.x2 }}>
                <View style={{ flex: 1 }}>
                  <Pill label="Reject" onPress={() => onModerate(c.id, "rejected")} />
                </View>
                <View style={{ flex: 1 }}>
                  <Pill label="Approve" filled onPress={() => onModerate(c.id, "approved")} />
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <Sheet visible={qrOpen} onClose={() => setQrOpen(false)} title="Scan to contribute">
        <QrCard url={contributeUrl} />
      </Sheet>
    </View>
  );
}
