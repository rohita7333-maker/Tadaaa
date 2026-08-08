import { useEffect, useState } from "react";
import { AccessibilityInfo, Alert, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import Animated, { FadeIn, SlideInRight, SlideInLeft } from "react-native-reanimated";
import { ArrowLeft } from "lucide-react-native";
import { Button, Screen, Txt, colors, spacing } from "@/components/ui";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import StepIndicator from "@/components/create/StepIndicator";
import OccasionStep from "@/components/create/OccasionStep";
import TemplateSummaryChip from "@/components/create/TemplateSummaryChip";
import PhotoUploader, { type DraftPhoto } from "@/components/create/PhotoUploader";
import MessageEditor from "@/components/create/MessageEditor";
import RevealSettings from "@/components/create/RevealSettings";
import EventsEditor from "@/components/create/EventsEditor";
import QuestionBuilder, { type DraftQuestion } from "@/components/create/QuestionBuilder";
import PreviewPublish from "@/components/create/PreviewPublish";
import { useAuth } from "@/providers/AuthProvider";
import { getActiveTier, canCreateInvite, canUsePremiumTheme } from "@/lib/tier";
import { canPublishTheme } from "@/lib/publish-gate";
import { createInviteSchema, eventsSchema, type StoryEventInput } from "@/lib/schemas";
import { addQuestions, createInviteRow, monthlyInviteCount } from "@/lib/db";
import {
  commitPhotos,
  createStripeCheckout,
  hasBackend,
  signedPhotoUploadUrl,
  type AIDraft,
} from "@/lib/api";
import { getTemplate, type Template } from "@/lib/templates";
import { getThemeById } from "@/lib/themes";

const TOTAL_STEPS = 4;

export default function CreateWizard() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const { template: templateId } = useLocalSearchParams<{ template?: string }>();
  const [reduced, setReduced] = useState(false);
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
  }, []);

  // Step 1 — occasion & theme
  const [occasionType, setOccasionType] = useState("custom");
  const [selectedTheme, setSelectedTheme] = useState("warm-embrace");

  // Step 2 — photos, message, reveal
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [titleError, setTitleError] = useState("");
  const [messageError, setMessageError] = useState("");
  const [revealType, setRevealType] = useState<"tap" | "countdown" | "scroll_story">("tap");
  const [events, setEvents] = useState<StoryEventInput[]>([]);
  const [countdownDate, setCountdownDate] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [hasExpiry, setHasExpiry] = useState(false);
  const [acceptContributions, setAcceptContributions] = useState(false);
  const [enableDodgeNo, setEnableDodgeNo] = useState(true);

  // Step 3 — questions
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);

  // Publish
  const [publishing, setPublishing] = useState(false);

  const tier = getActiveTier(profile);
  const premiumUnlocked = canUsePremiumTheme(tier, false) || tier === "unlimited";

  // Hydrate a template preset from ?template=<id> (pushed by /templates).
  // The template decided the occasion, theme and reveal style, so all three
  // apply verbatim — premium themes included. Picking is free; entitlement is
  // settled once at the publish gate below. Runs once per template id so it
  // never clobbers later user edits.
  const [hydratedTemplateId, setHydratedTemplateId] = useState<string | null>(null);
  // Non-null while the wizard is driven by a template: step 1 collapses to a
  // summary chip instead of re-asking what the template already decided.
  const [templateMode, setTemplateMode] = useState<Template | null>(null);
  useEffect(() => {
    if (!templateId || templateId === hydratedTemplateId) return;
    setHydratedTemplateId(templateId);
    const template = getTemplate(templateId);
    if (!template) return;
    setTemplateMode(template);
    setOccasionType(template.occasionId);
    setRevealType(template.revealType);
    const templateTheme = getThemeById(template.themeId);
    if (templateTheme) setSelectedTheme(templateTheme.id);
  }, [templateId, hydratedTemplateId]);

  // Themes unlocked by a one-off checkout during this app session. The Stripe
  // webhook fulfils server-side; this is the local optimistic mirror.
  const [sessionUnlocked, setSessionUnlocked] = useState<string[]>([]);
  const themeMeta = getThemeById(selectedTheme);
  const publishGate = canPublishTheme({
    isPremium: !!themeMeta?.isPremium,
    sessionUnlocked: sessionUnlocked.includes(selectedTheme),
    tier,
  });

  async function unlockSelectedTheme() {
    if (!hasBackend) {
      Alert.alert(
        "Backend not connected",
        "Unlocking opens a secure Stripe checkout hosted by the TaDaaaa web app. Connect EXPO_PUBLIC_API_BASE_URL to enable this."
      );
      return;
    }
    try {
      const { url, error } = await createStripeCheckout({ mode: "plus", themeId: selectedTheme });
      if (error || !url) {
        Alert.alert("Couldn't start checkout", error || "Please try again in a moment.");
        return;
      }
      await WebBrowser.openBrowserAsync(url);
      await refreshProfile();
      setSessionUnlocked((prev) =>
        prev.includes(selectedTheme) ? prev : [...prev, selectedTheme]
      );
    } catch (e) {
      Alert.alert("Couldn't start checkout", e instanceof Error ? e.message : "Please try again.");
    }
  }

  /** The wizard's single price moment — shown only at publish. */
  function promptPremiumGate() {
    Alert.alert(
      "Premium surprise",
      publishGate.reason ?? "This theme is premium.",
      [
        { text: "Not now", style: "cancel" },
        { text: "Go Unlimited", onPress: () => router.push("/pricing") },
        { text: "Unlock", onPress: () => void unlockSelectedTheme() },
      ]
    );
  }

  function applyDraft(d: AIDraft) {
    setTitle(d.title);
    setMessage(d.message);
    setSelectedTheme(d.themeId);
    setQuestions(
      d.questions.map((q) => ({
        text: q.text,
        yesLabel: q.yesLabel || "Yes",
        noLabel: q.noLabel || "No",
        requireAnswer: false,
      }))
    );
    setDirection(1);
    setStep(2);
  }

  function goNext() {
    if (step === 1) {
      setDirection(1);
      setStep(2);
      return;
    }
    if (step === 2) {
      let valid = true;
      if (!title.trim()) {
        setTitleError("Title is required");
        valid = false;
      } else setTitleError("");
      if (message.trim().length < 10) {
        setMessageError("Message must be at least 10 characters");
        valid = false;
      } else setMessageError("");
      if (revealType === "countdown" && !countdownDate) {
        Alert.alert("Set a reveal date", "Pick when this surprise should unlock.");
        valid = false;
      }
      if (!valid) return;
      setDirection(1);
      setStep(3);
      return;
    }
    if (step === 3) {
      setDirection(1);
      setStep(4);
    }
  }

  function goBack() {
    setDirection(-1);
    setStep((s) => Math.max(1, s - 1));
  }

  async function handlePublish(): Promise<{ slug: string } | null> {
    if (!user) {
      Alert.alert("Sign in required", "Please sign in to publish a surprise.");
      return null;
    }

    // Entitlement is settled here and nowhere else in the wizard.
    if (!publishGate.allowed) {
      promptPremiumGate();
      return null;
    }

    const parsed = createInviteSchema.safeParse({
      title,
      theme: selectedTheme,
      message,
      revealType,
      countdownDate: revealType === "countdown" && countdownDate ? countdownDate : null,
      expiresAt: hasExpiry && expiresAt ? expiresAt : null,
    });
    if (!parsed.success) {
      Alert.alert("Check your surprise", parsed.error.issues[0]?.message ?? "Some fields need attention.");
      return null;
    }

    // Scroll Story plaques ("the plan"). Drop fully-empty rows first, then
    // validate the rest with the same schema the DB layer enforces. Since mobile
    // writes straight to Supabase with no server step, this is the gate. Every
    // other reveal type always stores []. On failure, name the offending plaque.
    let cleanEvents: StoryEventInput[] = [];
    if (revealType === "scroll_story") {
      const nonEmpty = events.filter(
        (e) =>
          e.label.trim() ||
          e.title.trim() ||
          (e.detail ?? "").trim() ||
          (e.mapsQuery ?? "").trim()
      );
      const eventsParsed = eventsSchema.safeParse(
        nonEmpty.map((e) => ({
          label: e.label.trim(),
          title: e.title.trim(),
          detail: (e.detail ?? "").trim() || undefined,
          mapsQuery: (e.mapsQuery ?? "").trim() || undefined,
        }))
      );
      if (!eventsParsed.success) {
        const issue = eventsParsed.error.issues[0];
        const idx = typeof issue?.path?.[0] === "number" ? issue.path[0] : null;
        const where = idx !== null ? `Plaque ${idx + 1}: ` : "";
        Alert.alert(
          "Check your plan",
          `${where}${issue?.message ?? "Give each plaque a label and a title, or remove it."}`
        );
        return null;
      }
      cleanEvents = eventsParsed.data;
    }

    setPublishing(true);
    try {
      const count = await monthlyInviteCount(user.id);
      const gate = canCreateInvite(tier, count);
      if (!gate.allowed) {
        Alert.alert("Monthly limit reached", gate.reason ?? "Upgrade to create more surprises.", [
          { text: "Not now", style: "cancel" },
          { text: "See Pricing", onPress: () => router.push("/pricing") },
        ]);
        return null;
      }

      const { id, slug } = await createInviteRow({
        title: parsed.data.title,
        theme: parsed.data.theme,
        message: parsed.data.message,
        occasionType,
        revealType: parsed.data.revealType,
        countdownDate: parsed.data.countdownDate ?? null,
        expiresAt: parsed.data.expiresAt ?? null,
        events: cleanEvents,
        acceptContributions,
        enableDodgeNo,
        isPaid: false,
      });

      // Photos: only attempt binary upload when a backend is configured. If
      // not, publish still succeeds — just without photo rows (honest degrade,
      // matches how the reveal screen already renders a graceful placeholder
      // when photo binaries are unavailable).
      if (photos.length > 0 && hasBackend) {
        // Phase 1: PUT each photo to its signed pending URL.
        const pending: { path: string; caption: string; rotationDeg: number }[] = [];
        let uploadFailed = false;
        for (let i = 0; i < photos.length; i++) {
          const p = photos[i];
          try {
            const { path, signedUrl } = await signedPhotoUploadUrl({ inviteId: id, index: i, ext: p.ext });
            const res = await fetch(p.uri);
            const blob = await res.blob();
            const putRes = await fetch(signedUrl, {
              method: "PUT",
              headers: { "Content-Type": p.mimeType },
              body: blob,
            });
            if (!putRes.ok) throw new Error("upload failed");
            pending.push({ path, caption: p.caption, rotationDeg: p.rotationDeg });
          } catch {
            uploadFailed = true;
          }
        }
        // Phase 2: commit — server moderates, moves pending→canonical, inserts rows.
        if (pending.length > 0) {
          try {
            await commitPhotos({ inviteId: id, photos: pending });
          } catch (e) {
            Alert.alert(
              "Photo issue",
              e instanceof Error
                ? e.message
                : "Some photos couldn't be added. Your surprise was published — add photos later from the dashboard."
            );
          }
        }
        if (uploadFailed) {
          Alert.alert("Some photos didn't upload", "Your surprise was published — you can add photos later from the dashboard.");
        }
      } else if (photos.length > 0 && !hasBackend) {
        Alert.alert(
          "Photos need a backend connection",
          "Your surprise was published without photos. Connect the TaDaaaa backend to enable photo uploads."
        );
      }

      if (questions.length > 0) {
        await addQuestions(
          id,
          questions
            .filter((q) => q.text.trim())
            .map((q) => ({
              text: q.text.trim(),
              yesLabel: q.yesLabel || "Yes",
              noLabel: q.noLabel || "No",
              requireAnswer: q.requireAnswer,
              attachedPhotoIndex: null,
            }))
        );
      }

      return { slug };
    } catch (e) {
      Alert.alert("Couldn't publish", e instanceof Error ? e.message : "Please try again.");
      return null;
    } finally {
      setPublishing(false);
    }
  }

  const entering = reduced ? FadeIn.duration(150) : direction > 0 ? SlideInRight.duration(280) : SlideInLeft.duration(280);

  return (
    <Screen bg={colors.cream} scroll contentStyle={{ paddingTop: spacing.sm }}>
      <View style={{ gap: spacing.lg }}>
        <ScreenHeader variant="close" title="New surprise" subtitle={`Step ${step} of ${TOTAL_STEPS}`} />

        <StepIndicator currentStep={step} />

        <Animated.View key={step} entering={entering}>
          {step === 1 && templateMode && (
            <TemplateSummaryChip
              template={templateMode}
              onChange={() => setTemplateMode(null)}
            />
          )}

          {step === 1 && !templateMode && (
            <OccasionStep
              occasionType={occasionType}
              onOccasionChange={setOccasionType}
              title={title}
              onTitleChange={setTitle}
              selectedTheme={selectedTheme}
              onThemeChange={setSelectedTheme}
              premiumUnlocked={premiumUnlocked}
              onDraftApplied={applyDraft}
            />
          )}

          {step === 2 && (
            <View style={{ gap: spacing.xxl }}>
              <PhotoUploader photos={photos} onPhotosChange={setPhotos} />
              <MessageEditor
                title={title}
                message={message}
                onTitleChange={setTitle}
                onMessageChange={setMessage}
                titleError={titleError}
                messageError={messageError}
              />
              <RevealSettings
                revealType={revealType}
                countdownDate={countdownDate}
                expiresAt={expiresAt}
                hasExpiry={hasExpiry}
                acceptContributions={acceptContributions}
                enableDodgeNo={enableDodgeNo}
                onRevealTypeChange={setRevealType}
                onCountdownDateChange={setCountdownDate}
                onExpiresAtChange={setExpiresAt}
                onHasExpiryChange={setHasExpiry}
                onAcceptContributionsChange={setAcceptContributions}
                onEnableDodgeNoChange={setEnableDodgeNo}
              />
              {revealType === "scroll_story" && (
                <EventsEditor events={events} onEventsChange={setEvents} />
              )}
            </View>
          )}

          {step === 3 && <QuestionBuilder questions={questions} onQuestionsChange={setQuestions} />}

          {step === 4 && (
            <PreviewPublish
              title={title}
              message={message}
              themeId={selectedTheme}
              revealType={revealType}
              photoCount={photos.length}
              questionCount={questions.length}
              tier={tier}
              publishing={publishing}
              onPublish={handlePublish}
            />
          )}
        </Animated.View>

        {step < 4 && (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.sm }}>
            {step > 1 ? (
              <Button title="Back" variant="outline" small left={<ArrowLeft size={15} color={colors.charcoal} />} onPress={goBack} />
            ) : (
              <View />
            )}
            <Button title={step === 3 ? "Preview" : "Next"} onPress={goNext} />
          </View>
        )}

        {step === 4 && (
          <View style={{ marginTop: spacing.sm }}>
            <Button title="Back to edit" variant="outline" small left={<ArrowLeft size={15} color={colors.charcoal} />} onPress={goBack} />
          </View>
        )}
      </View>
    </Screen>
  );
}
