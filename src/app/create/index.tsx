import { useEffect, useState } from "react";
import { AccessibilityInfo, Alert, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeIn, SlideInRight, SlideInLeft } from "react-native-reanimated";
import { ArrowLeft } from "lucide-react-native";
import { Button, Screen, Txt, colors, spacing } from "@/components/ui";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import StepIndicator from "@/components/create/StepIndicator";
import OccasionStep from "@/components/create/OccasionStep";
import PhotoUploader, { type DraftPhoto } from "@/components/create/PhotoUploader";
import MessageEditor from "@/components/create/MessageEditor";
import RevealSettings from "@/components/create/RevealSettings";
import QuestionBuilder, { type DraftQuestion } from "@/components/create/QuestionBuilder";
import PreviewPublish from "@/components/create/PreviewPublish";
import { useAuth } from "@/providers/AuthProvider";
import { getActiveTier, canCreateInvite, canUsePremiumTheme } from "@/lib/tier";
import { createInviteSchema } from "@/lib/schemas";
import { addQuestions, createInviteRow, monthlyInviteCount } from "@/lib/db";
import { commitPhotos, hasBackend, signedPhotoUploadUrl, type AIDraft } from "@/lib/api";

const TOTAL_STEPS = 4;

export default function CreateWizard() {
  const router = useRouter();
  const { user, profile } = useAuth();
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
  const [revealType, setRevealType] = useState<"tap" | "countdown">("tap");
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
          {step === 1 && (
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
