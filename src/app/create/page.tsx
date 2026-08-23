"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { easings, durations, makeReducedMotionTransition } from "@/lib/motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import StepIndicator from "@/components/create/StepIndicator";
import OccasionSelector from "@/components/create/OccasionSelector";
import ThemeSelector from "@/components/create/ThemeSelector";
import PhotoUploader, { type PhotoFile } from "@/components/create/PhotoUploader";
import MessageEditor from "@/components/create/MessageEditor";
import RevealSettings from "@/components/create/RevealSettings";
import EventsEditor, { type StoryEventDraft } from "@/components/create/EventsEditor";
import QuestionBuilder, { type Question } from "@/components/create/QuestionBuilder";
import PreviewPublish from "@/components/create/PreviewPublish";
import TemplateSummaryChip from "@/components/create/TemplateSummaryChip";
import MusicPicker from "@/components/create/MusicPicker";
import { LivePreviewPhone, LivePreviewOverlay } from "@/components/create/LivePreview";
import { AIDraftButton } from "@/components/create/AIDraftButton";
import { getThemeById } from "@/lib/themes";
import { getTemplate, type RevealStyle, type Template } from "@/lib/templates";
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

function readCheckoutReturn(): {
  theme: string | null;
  status: "success" | "cancelled" | null;
  sessionId: string | null;
} {
  if (typeof window === "undefined") return { theme: null, status: null, sessionId: null };
  const params = new URLSearchParams(window.location.search);
  const status = params.get("payment");
  if (status === "success") {
    return {
      theme: params.get("theme"),
      status: "success",
      sessionId: params.get("session_id"),
    };
  }
  if (status === "cancelled") return { theme: null, status: "cancelled", sessionId: null };
  return { theme: null, status: null, sessionId: null };
}

function readGiftId(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("gift");
}

/**
 * Wizard draft persisted across the Stripe round-trip. The publish gate sends
 * the user off-site to checkout and Stripe returns to /create fresh, so without
 * this everything typed so far is lost. Photos are `File` objects and cannot be
 * serialized — they are re-added after the return (the restore lands on step 2
 * and says so).
 */
interface CreateDraft {
  occasionType: string;
  selectedTheme: string;
  revealType: RevealStyle;
  title: string;
  message: string;
  countdownDate: string;
  expiresAt: string;
  hasExpiry: boolean;
  acceptContributions: boolean;
  questions: Question[];
  events: StoryEventDraft[];
  templateId: string | null;
  /** Stripe Checkout Session id proving the premium theme was paid for. */
  stripeSessionId: string | null;
  /** Reveal soundtrack track id. Optional so older stored drafts stay valid. */
  musicTrack?: string;
}

const DRAFT_KEY = "tadaaaa.createDraft";

function writeDraft(draft: CreateDraft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {}
}

function readDraft(): CreateDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as CreateDraft;
  } catch {
    return null;
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {}
}

function readTemplateParam(): Template | null {
  if (typeof window === "undefined") return null;
  const id = new URLSearchParams(window.location.search).get("template");
  if (!id) return null;
  // Unknown template ids are ignored — the wizard just starts fresh.
  return getTemplate(id) ?? null;
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

  // Proof of the $4.99 one-off theme purchase, handed back by Stripe on return
  // and passed to createInviteShell so the server can verify it with Stripe.
  const [stripeSessionId, setStripeSessionId] = useState<string | null>(null);

  // Step 2 — Theme, photos, message, reveal
  const [selectedTheme, setSelectedTheme] = useState<string>("warm-embrace");

  // Reveal mechanic. Declared above the mount effect (like occasionType below)
  // because the ?template=<id> hydration sets it from the preset.
  const [revealType, setRevealType] = useState<RevealStyle>("tap");

  // Step 1 — Occasion. Declared above the mount effect because the
  // ?template=<id> hydration below sets it.
  const [occasionType, setOccasionType] = useState("custom");

  // Non-null while the wizard is driven by a template preset: step 1 collapses
  // to a summary chip instead of re-asking what the template already decided.
  // "Change" clears it and reveals the pickers, prefilled.
  const [templateMode, setTemplateMode] = useState<Template | null>(null);

  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  // Reveal soundtrack track id ("" = no music). Persisted server-side once the
  // music_track migration lands; until then it drives preview only.
  const [musicTrack, setMusicTrack] = useState("");
  const [countdownDate, setCountdownDate] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [hasExpiry, setHasExpiry] = useState(false);
  const [acceptContributions, setAcceptContributions] = useState(false);
  const [titleError, setTitleError] = useState("");
  const [messageError, setMessageError] = useState("");

  // Scroll Story timeline plaques ("The plan" scene). Only serialized when the
  // reveal mechanic is scroll_story; empty is fine (PlanScene falls back to a
  // single countdown plaque).
  const [events, setEvents] = useState<StoryEventDraft[]>([]);

  // Step 3 — Questions
  const [questions, setQuestions] = useState<Question[]>([]);

  /**
   * Re-apply a persisted draft to the wizard and consume it. The theme is left
   * to the caller — a checkout return owns it. Photos are `File` handles and
   * cannot survive a round-trip, so we land on step 2 where they're re-added.
   * Declared above the mount effect that calls it.
   */
  function restoreDraft(draft: CreateDraft) {
    setOccasionType(draft.occasionType);
    setRevealType(draft.revealType);
    setTitle(draft.title);
    setMessage(draft.message);
    setCountdownDate(draft.countdownDate);
    setExpiresAt(draft.expiresAt);
    setHasExpiry(draft.hasExpiry);
    setAcceptContributions(draft.acceptContributions);
    setQuestions(draft.questions ?? []);
    setEvents(draft.events ?? []);
    setMusicTrack(draft.musicTrack ?? "");
    const draftTemplate = draft.templateId ? getTemplate(draft.templateId) : null;
    if (draftTemplate) setTemplateMode(draftTemplate);
    clearDraft();
    setStep(2);
  }

  // Mount-time hydration: tier, gift id, checkout return, draft restore and
  // ?template= preset. Declared after every piece of wizard state it writes.
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
    let draftRestored = false;
    if (ret.status === "success" && ret.theme) {
      // Restore everything the wizard held before the checkout redirect, so
      // the user comes back to their surprise instead of a blank wizard.
      const draft = readDraft();
      // Prefer the id Stripe just put on the URL; fall back to the draft copy
      // so an in-wizard reload doesn't drop the proof of purchase.
      setStripeSessionId(ret.sessionId ?? draft?.stripeSessionId ?? null);
      if (draft) {
        restoreDraft(draft);
        draftRestored = true;
        toast.info("Your surprise is back — just re-add your photos.");
      }
      const next = Array.from(new Set([...stored, ret.theme]));
      try {
        sessionStorage.setItem("tadaaaa.unlockedPremium", JSON.stringify(next));
      } catch {}
      setUnlockedPremium(next);
      setSelectedTheme(ret.theme);
      toast.success("Premium theme unlocked! Finish your surprise to apply it.");
    } else {
      if (stored.length > 0) setUnlockedPremium(stored);
      // Same restore for the other round-trips that leave and re-enter the
      // wizard: signing in at the publish gate, or cancelling checkout. Only
      // the checkout-success path owns the theme, so the draft's theme applies
      // here.
      const draft = readDraft();
      if (draft) {
        setStripeSessionId(draft.stripeSessionId ?? null);
        restoreDraft(draft);
        if (draft.selectedTheme) setSelectedTheme(draft.selectedTheme);
        draftRestored = true;
        toast.info("Your surprise is back — just re-add your photos.");
      }
      if (ret.status === "cancelled") {
        toast.info("Checkout cancelled. You can pick a free theme instead.");
      }
    }

    // Hydrate template preset from ?template=<id>. The template decided the
    // occasion, theme and reveal style, so all three apply verbatim — premium
    // themes included. Picking is free; entitlement is settled once at the
    // publish gate (and server-side in createInviteShell).
    // A restored draft is strictly newer than the preset it may have started
    // from (and already carries templateMode), so it wins outright.
    const template = draftRestored ? null : readTemplateParam();
    if (template) {
      setTemplateMode(template);
      setOccasionType(template.occasionId);
      // Apply the preset reveal mechanic (tap / countdown / scroll story) to
      // the live wizard state — this is what drives RevealSettings.
      setRevealType(template.revealType);
      const templateTheme = getThemeById(template.themeId);
      // A checkout-success return already selected the theme the user paid
      // for — never let a template preset override that.
      if (templateTheme && !(ret.status === "success" && ret.theme)) {
        setSelectedTheme(templateTheme.id);
      }
    }
  }, []);

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
      // Scroll Story's finale counts down to the big day, so it needs a
      // future date just like Countdown — but with its own message.
      if (revealType === "scroll_story") {
        if (!countdownDate) {
          toast.error("Please set the date this story counts down to");
          valid = false;
        } else if (new Date(countdownDate).getTime() <= Date.now()) {
          toast.error("The scroll story date must be in the future");
          valid = false;
        }
      }
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

  /**
   * The publish gate's "Unlock" CTA. Saves the wizard draft first — Stripe
   * returns to a fresh /create, so anything not persisted here is lost.
   */
  /** Current wizard state as a persistable draft. */
  function snapshotDraft(): CreateDraft {
    return {
      occasionType,
      selectedTheme,
      revealType,
      title,
      message,
      countdownDate,
      expiresAt,
      hasExpiry,
      acceptContributions,
      questions,
      events,
      templateId: templateMode?.id ?? null,
      stripeSessionId,
      musicTrack,
    };
  }

  async function handleUnlockTheme() {
    writeDraft(snapshotDraft());
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "plus", themeId: selectedTheme }),
      });
      if (res.status === 401) {
        toast.error("Please sign in to unlock premium themes");
        const next = `/create${window.location.search}`;
        window.location.href = `/auth/signin?next=${encodeURIComponent(next)}`;
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
    // Both countdown and scroll story persist the reveal date — countdown
    // gates on it, scroll story feeds its finale countdown.
    if ((revealType === "countdown" || revealType === "scroll_story") && countdownDate) {
      formData.append("countdownDate", new Date(countdownDate).toISOString());
    }
    if (hasExpiry && expiresAt) {
      formData.append("expiresAt", new Date(expiresAt).toISOString());
    }
    formData.append("acceptContributions", acceptContributions ? "true" : "false");
    formData.append("questions", JSON.stringify(questions));
    // Scroll Story timeline plaques — only meaningful for scroll_story reveals.
    // For every other mechanic we send an empty array so the server stores '[]'.
    formData.append(
      "events",
      JSON.stringify(revealType === "scroll_story" ? events : [])
    );
    if (giftId) formData.append("giftId", giftId);
    // Proof of the one-off premium-theme purchase — the server re-verifies it
    // with Stripe before allowing a free-tier user to publish a premium theme.
    if (stripeSessionId) formData.append("stripeSessionId", stripeSessionId);

    const shell = await createInviteShell(formData);
    // The wizard is reachable signed-out by design — publish is where auth is
    // demanded. Persist the draft first so signing in returns to a filled
    // wizard rather than a blank one.
    if (shell?.error === "Not authenticated") {
      writeDraft(snapshotDraft());
      const next = `/create${window.location.search}`;
      window.location.href = `/auth/signin?next=${encodeURIComponent(next)}`;
      return null;
    }
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
    <div className="mx-auto max-w-2xl xl:max-w-5xl px-6 py-8">
     <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-10 xl:items-start">
      <div className="min-w-0">
      {/* Wizard header row. The logo/account bar lives in the layout — this
          keeps only the wizard's own context: an exit and the step count. */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="group inline-flex items-center gap-1.5 text-sm text-[#6F6E68] hover:text-[#3E6B5C] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          Dashboard
        </Link>
        <span className="text-[#6F6E68] text-sm">Step {step} of 4</span>
      </div>

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
                      <h2 className="font-heading text-2xl text-[#1A1B18] mb-1">
                        {templateMode ? "Your template" : "What's the occasion?"}
                      </h2>
                      <p className="text-sm text-[#6F6E68]">
                        {templateMode
                          ? "Occasion, theme and reveal are already set — change them any time."
                          : "Pick a type — or let AI draft the whole invite for you"}
                      </p>
                    </div>
                    <AIDraftButton onDraft={applyDraft} />
                  </div>
                  <AnimatePresence mode="wait" initial={false}>
                    {templateMode ? (
                      <motion.div
                        key="template-chip"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={makeReducedMotionTransition(shouldReduce, { duration: durations.quick })}
                      >
                        <TemplateSummaryChip
                          template={templateMode}
                          onChange={() => setTemplateMode(null)}
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="full-pickers"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={makeReducedMotionTransition(shouldReduce, { duration: durations.quick })}
                        className="space-y-6"
                      >
                        <OccasionSelector
                          selected={occasionType}
                          onSelect={setOccasionType}
                          onPromptSelect={(prompt) => setTitle(prompt)}
                          selectedPrompt={title}
                        />
                        <ThemeSelector
                          selectedTheme={selectedTheme}
                          onSelect={setSelectedTheme}
                          unlockedPremiumThemes={
                            userTier === "unlimited"
                              ? undefined
                              : unlockedPremium
                          }
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
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
                  {revealType === "scroll_story" && (
                    <EventsEditor events={events} onEventsChange={setEvents} />
                  )}
                  <MusicPicker selected={musicTrack} onSelect={setMusicTrack} />
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-heading text-2xl text-[#1A1B18] mb-1">
                      The big question
                    </h2>
                    <p className="text-sm text-[#6F6E68]">Add a YES/NO question with custom labels and a dodging No button</p>
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
                  sessionUnlocked={unlockedPremium.includes(selectedTheme)}
                  onUnlockTheme={handleUnlockTheme}
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
                className="h-12 px-6 rounded-full border-[#E9E6DF] text-[#1A1B18] hover:bg-[#FAF9F6]"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            ) : (
              <div />
            )}
            <Button
              onClick={goNext}
              className="h-12 px-8 rounded-full bg-gradient-to-r from-[#3E6B5C] to-[#2E5145] hover:from-[#2E5145] hover:to-[#3E6B5C] text-white font-medium transition-all duration-300 shadow-md"
            >
              {step === 3 ? "Preview" : "Next"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Preview step keeps a way back to edit before publishing — publish
            itself lives inside PreviewPublish, so we only surface Back here. */}
        {step === 4 && (
          <div className="flex items-center justify-start mt-8">
            <Button
              onClick={goBack}
              variant="outline"
              className="h-12 px-6 rounded-full border-[#E9E6DF] text-[#1A1B18] hover:bg-[#FAF9F6]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to edit
            </Button>
          </div>
        )}
      </div>

      {/* Step 4 is PreviewPublish — its own full preview — so the live phone
          only accompanies the editing steps. */}
      {step < 4 && (
        <div className="hidden xl:block sticky top-24">
          <LivePreviewPhone
            title={title}
            message={message}
            occasionType={occasionType}
            themeId={selectedTheme}
            revealType={revealType}
            photos={photos}
            musicTrack={musicTrack}
          />
        </div>
      )}
     </div>

     {step < 4 && (
       <LivePreviewOverlay
         title={title}
         message={message}
         occasionType={occasionType}
         themeId={selectedTheme}
         revealType={revealType}
         photos={photos}
         musicTrack={musicTrack}
       />
     )}
    </div>
  );
}
