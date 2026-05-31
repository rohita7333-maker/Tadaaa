"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { easings, durations, makeReducedMotionTransition } from "@/lib/motion";
import { ArrowLeft, ArrowRight, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import StepIndicator from "@/components/create/StepIndicator";
import OccasionSelector from "@/components/create/OccasionSelector";
import ThemeSelector from "@/components/create/ThemeSelector";
import PhotoUploader, { type PhotoFile } from "@/components/create/PhotoUploader";
import MessageEditor from "@/components/create/MessageEditor";
import RevealSettings from "@/components/create/RevealSettings";
import QuestionBuilder, { type Question } from "@/components/create/QuestionBuilder";
import PreviewPublish from "@/components/create/PreviewPublish";
import { AIDraftButton } from "@/components/create/AIDraftButton";
import { type Theme } from "@/lib/themes";
import { type Draft } from "@/lib/ai/draft";
import { createInviteShell, finalizeInvite } from "@/actions/invite";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

// direction > 0 = forward, direction < 0 = back
// Outgoing step scales to 0.96 (depth cue) as incoming rises from same depth.
// Reduced-motion: opacity-only instant swap (variants collapse to opacity, no x/scale).
function makeSlideVariants(shouldReduce: boolean | null | undefined) {
  if (shouldReduce) {
    return {
      enter: () => ({ opacity: 0 }),
      center: { opacity: 1 },
      exit: () => ({ opacity: 0 }),
    };
  }
  return {
    enter: (direction: number) => ({ x: direction > 0 ? 60 : -60, opacity: 0, scale: 0.96 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (direction: number) => ({ x: direction > 0 ? -60 : 60, opacity: 0, scale: 0.96 }),
  };
}

function readUnlockedPremium(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(
      sessionStorage.getItem("tadaaaa.unlockedPremium") || "[]"
    );
    return Array.isArray(stored) ? (stored as string[]) : [];
  } catch {
    return [];
  }
}

function readCheckoutReturn(): { theme: string | null; status: "success" | "cancelled" | null } {
  if (typeof window === "undefined") return { theme: null, status: null };
  const params = new URLSearchParams(window.location.search);
  const status = params.get("payment");
  if (status === "success") return { theme: params.get("theme"), status: "success" };
  if (status === "cancelled") return { theme: null, status: "cancelled" };
  return { theme: null, status: null };
}

function readGiftId(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("gift");
}

export default function CreatePage() {
  const shouldReduce = useReducedMotion();
  const slideVariants = makeSlideVariants(shouldReduce);
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [userTier, setUserTier] = useState("free");

  // SSR-safe defaults. Real values get hydrated from sessionStorage/URL in
  // the mount effect below to avoid SSR/CSR hydration mismatches.
  const [unlockedPremium, setUnlockedPremium] = useState<string[]>([]);
  const [giftId, setGiftId] = useState<string | null>(null);

  // Step 2 — Theme, photos, message, reveal
  const [selectedTheme, setSelectedTheme] = useState<string>("warm-embrace");

  useEffect(() => {
    async function fetchTier() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("subscription_tier, subscription_expires_at")
        .eq("id", user.id)
        .single();
      const expired =
        data?.subscription_expires_at &&
        new Date(data.subscription_expires_at) < new Date();
      if (data?.subscription_tier && !expired) {
        setUserTier(data.subscription_tier);
      } else {
        setUserTier("free");
      }
    }
    fetchTier();

    // Hydrate gift ID from URL — passed from /gift/redeem?token=... redirect.
    const gid = readGiftId();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (gid) setGiftId(gid);

    // Hydrate unlocked-premium state from sessionStorage + URL after mount.
    // Doing this in useState() initializer would mismatch SSR (empty array)
    // vs client (possibly non-empty).
    const stored = readUnlockedPremium();
    // External-state sync from sessionStorage + URL. setState-in-effect is
    // required to match SSR (empty array, default theme) on the first paint.
    const ret = readCheckoutReturn();
    if (ret.status === "success" && ret.theme) {
      const next = Array.from(new Set([...stored, ret.theme]));
      try {
        sessionStorage.setItem("tadaaaa.unlockedPremium", JSON.stringify(next));
      } catch {}
      setUnlockedPremium(next);
      setSelectedTheme(ret.theme);
      toast.success("Premium theme unlocked! Finish your surprise to apply it.");
    } else {
      if (stored.length > 0) setUnlockedPremium(stored);
      if (ret.status === "cancelled") {
        toast.info("Checkout cancelled. You can pick a free theme instead.");
      }
    }
  }, []);

  // Step 1 — Occasion
  const [occasionType, setOccasionType] = useState("custom");
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [revealType, setRevealType] = useState<"tap" | "countdown">("tap");
  const [countdownDate, setCountdownDate] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [hasExpiry, setHasExpiry] = useState(false);
  const [acceptContributions, setAcceptContributions] = useState(false);
  const [titleError, setTitleError] = useState("");
  const [messageError, setMessageError] = useState("");

  // Step 3 — Questions
  const [questions, setQuestions] = useState<Question[]>([]);

  function goNext() {
    if (step === 1) {
      setDirection(1);
      setStep(2);
    } else if (step === 2) {
      let valid = true;
      if (!title.trim()) { setTitleError("Title is required"); valid = false; }
      else setTitleError("");
      if (message.trim().length < 10) { setMessageError("Message must be at least 10 characters"); valid = false; }
      else setMessageError("");
      if (photos.length === 0) { toast.error("Please add at least one photo"); valid = false; }
      if (revealType === "countdown" && !countdownDate) { toast.error("Please set a countdown date"); valid = false; }
      if (!valid) return;
      setDirection(1);
      setStep(3);
    } else if (step === 3) {
      setDirection(1);
      setStep(4);
    }
  }

  function goBack() {
    setDirection(-1);
    setStep((s) => Math.max(1, s - 1));
  }

  async function handlePremiumClick(theme: Theme) {
    if (userTier === "unlimited") {
      setSelectedTheme(theme.id);
      return;
    }
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "plus", themeId: theme.id }),
      });
      if (res.status === 401) {
        toast.error("Please sign in to unlock premium themes");
        window.location.href = `/auth/signin?next=/create`;
        return;
      }
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      toast.error(data.error || "Checkout failed");
    } catch {
      toast.error("Could not start checkout — try again");
    }
  }

  async function handlePublish(): Promise<{ slug: string; inviteId: string } | null> {
    // Phase 1: create invite shell (metadata only, no binary files).
    const formData = new FormData();
    formData.append("title", title);
    formData.append("theme", selectedTheme);
    formData.append("message", message);
    formData.append("revealType", revealType);
    formData.append("occasionType", occasionType);
    if (revealType === "countdown" && countdownDate) {
      formData.append("countdownDate", new Date(countdownDate).toISOString());
    }
    if (hasExpiry && expiresAt) {
      formData.append("expiresAt", new Date(expiresAt).toISOString());
    }
    formData.append("acceptContributions", acceptContributions ? "true" : "false");
    formData.append("questions", JSON.stringify(questions));
    if (giftId) formData.append("giftId", giftId);

    const shell = await createInviteShell(formData);
    if (shell?.error) {
      toast.error(shell.error);
      return null;
    }
    if (!shell?.inviteId) return null;

    // Phase 2: upload photos directly to Supabase Storage via signed URLs,
    // bypassing the Server Action body-size limit entirely.
    const photoDescriptors: { path: string; caption: string; rotation_deg: number }[] = [];

    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      const rawExt = (p.file.name.split(".").pop() ?? "jpg").toLowerCase();
      const ext = ["jpg", "jpeg", "png", "webp", "gif"].includes(rawExt) ? rawExt : "jpg";

      // Request a signed upload URL from the server.
      const urlRes = await fetch("/api/photos/signed-upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId: shell.inviteId, index: i, ext }),
      });
      if (!urlRes.ok) {
        toast.error("Failed to prepare photo upload. Please try again.");
        return null;
      }
      const { path, signedUrl } = await urlRes.json() as { path: string; signedUrl: string };

      // Upload the binary directly to Supabase — no Next.js middleware involved.
      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": p.file.type || "image/jpeg" },
        body: p.file,
      });
      if (!uploadRes.ok) {
        toast.error(`Failed to upload photo ${i + 1}. Please try again.`);
        return null;
      }

      photoDescriptors.push({ path, caption: p.caption, rotation_deg: p.rotation_deg });
    }

    // Phase 3: finalize — server runs moderation + inserts invite_photos rows.
    const result = await finalizeInvite(shell.inviteId, photoDescriptors);
    if (result?.error) {
      toast.error(result.error);
      return null;
    }
    if (!result?.slug || !result?.inviteId) return null;
    return { slug: result.slug, inviteId: result.inviteId };
  }

  function applyDraft(d: Draft) {
    setTitle(d.title);
    setMessage(d.message);
    setSelectedTheme(d.themeId);
    setQuestions(
      d.questions.map((q) => ({
        text: q.text,
        yesLabel: q.yesLabel,
        noLabel: q.noLabel,
        requireAnswer: false,
        enableDodge: false,
      }))
    );
    // Move to step 2 so user can see the drafted content and add photos
    setDirection(1);
    setStep(2);
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      {/* Nav */}
      <nav className="bg-white border-b border-[#D4CBC3]/40 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Heart className="w-5 h-5 fill-[#C4686D] text-[#C4686D]" />
            <span className="font-heading text-lg text-[#2D2926]">TaDaaaa</span>
          </Link>
          <span className="text-[#6B5E57] text-sm">Step {step} of 4</span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-8">
          <StepIndicator currentStep={step} />
        </div>

        <div className="relative overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={makeReducedMotionTransition(shouldReduce, {
                duration: durations.base,
                ease: easings.entrance,
              })}
            >
              {step === 1 && (
                <div className="space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-heading text-2xl text-[#2D2926] mb-1">
                        What&apos;s the occasion?
                      </h2>
                      <p className="text-sm text-[#6B5E57]">Pick a type — or let AI draft the whole invite for you</p>
                    </div>
                    <AIDraftButton onDraft={applyDraft} />
                  </div>
                  <OccasionSelector
                    selected={occasionType}
                    onSelect={setOccasionType}
                    onPromptSelect={(prompt) => setTitle(prompt)}
                  />
                  <ThemeSelector
                    selectedTheme={selectedTheme}
                    onSelect={setSelectedTheme}
                    onPremiumClick={handlePremiumClick}
                    unlockedPremiumThemes={
                      userTier === "unlimited"
                        ? undefined
                        : unlockedPremium
                    }
                  />
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
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
                    onRevealTypeChange={setRevealType}
                    onCountdownDateChange={setCountdownDate}
                    onExpiresAtChange={setExpiresAt}
                    onHasExpiryChange={setHasExpiry}
                    onAcceptContributionsChange={setAcceptContributions}
                  />
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-heading text-2xl text-[#2D2926] mb-1">
                      The big question
                    </h2>
                    <p className="text-sm text-[#6B5E57]">Add a YES/NO question with custom labels and a dodging No button</p>
                  </div>
                  <QuestionBuilder questions={questions} onQuestionsChange={setQuestions} />
                </div>
              )}

              {step === 4 && (
                <PreviewPublish
                  title={title}
                  message={message}
                  theme={selectedTheme}
                  revealType={revealType}
                  photos={photos}
                  tier={userTier}
                  acceptContributions={acceptContributions}
                  onPublish={handlePublish}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {step < 4 && (
          <div className="flex items-center justify-between mt-8">
            {step > 1 ? (
              <Button
                onClick={goBack}
                variant="outline"
                className="h-12 px-6 rounded-full border-[#D4CBC3] text-[#2D2926] hover:bg-[#FFF8F0]"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            ) : (
              <div />
            )}
            <Button
              onClick={goNext}
              className="h-12 px-8 rounded-full bg-gradient-to-r from-[#C4686D] to-[#9B3D42] hover:from-[#9B3D42] hover:to-[#C4686D] text-white font-medium transition-all duration-300 shadow-md"
            >
              {step === 3 ? "Preview" : "Next"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
