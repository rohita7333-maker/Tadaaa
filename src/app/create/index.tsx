/**
 * C1–C6 — the create wizard.
 *
 * Six steps behind one piece of shared chrome (`WizardChrome`), as the handoff
 * specifies. The pre-handoff wizard was four steps with its validation inlined;
 * the rules now live in `lib/wizard.ts` where they are tested, and the publish
 * path below is the same one that was already shipping — extended, not
 * replaced, because it is the only code in the app that writes a row nothing
 * else can repair.
 *
 * The slug is generated when the wizard opens rather than at insert, so C3 can
 * show the real contribution link before the row exists. `createInviteRow`
 * honours it on the first attempt and falls back to a fresh one on collision.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Alert, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Calendar from "expo-calendar";
import { EdToast, palette } from "@/components/editorial";
import { WizardChrome } from "@/components/create/WizardChrome";
import { Sheet } from "@/components/handoff/Sheet";
import { ActionSheet } from "@/components/handoff/Sheet";
import { OccasionPicker } from "@/components/create/steps/OccasionPicker";
import { RevealPreview } from "@/components/create/RevealPreview";
import { ThemeSheet } from "@/components/create/ThemeSheet";
import { ContentStep } from "@/components/create/steps/ContentStep";
import { ContributorsStep } from "@/components/create/steps/ContributorsStep";
import { RevealStyleStep } from "@/components/create/steps/RevealStyleStep";
import { ScheduleLockStep } from "@/components/create/steps/ScheduleLockStep";
import { PreviewPublishStep } from "@/components/create/steps/PreviewPublishStep";
import { useAuth } from "@/providers/AuthProvider";
import { getActiveTier, canCreateInvite } from "@/lib/tier";
import { canPublishTheme } from "@/lib/publish-gate";
import {
  TOTAL_STEPS,
  WIZARD_STEPS,
  emptyWizardDraft,
  hydrateWizard,
  photoLimit,
  publishOccasionType,
  selectTheme,
  validateStep,
  type WizardDraft,
} from "@/lib/wizard";
import { linkLifeDays, summaryRows } from "@/lib/publish-summary";
import { toRevealType } from "@/lib/schema-adapter";
import {
  addQuestions,
  applyQuestionPlan,
  createInviteRow,
  getInviteForEdit,
  monthlyInviteCount,
  setInvitePin,
  updateInviteRow,
} from "@/lib/db";
import {
  inviteToDraft,
  inviteUpdatePatch,
  questionPlan,
  type EditableQuestion,
} from "@/lib/invite-edit";
import { clearDraft, readDraft, writeDraft } from "@/lib/draft";
import { enqueueUploads, type QueuedUpload } from "@/lib/upload-queue";
import {
  commitPhotos,
  createStripeCheckout,
  hasBackend,
  signedPhotoUploadUrl,
} from "@/lib/api";
import { generateSlug } from "@/lib/slug";
import { getThemeById, themes } from "@/lib/themes";
import { ENV } from "@/lib/env";
import { space, type } from "@/theme/tokens";

const AUTOSAVE_MS = 500;
const SAVED_FLASH_MS = 1200;

/**
 * What actually goes to disk.
 *
 * Photos are stripped. `draft.ts` states photos are deliberately not stored —
 * "file URIs on iOS point into a container that can be reaped between launches,
 * so a persisted photo list resurrects as broken references" — but the wizard
 * was spreading the whole draft in, photos and all, so the module's guarantee
 * was documentation only.
 */
function draftPayload(draft: WizardDraft, slug: string): Record<string, unknown> {
  return { ...draft, photos: [], slug };
}

/**
 * The comparison key for "has anything worth saving changed?".
 *
 * Photos are excluded on purpose: they are not persisted, so adding one must
 * not flash "Saved" for something that was not.
 */
function draftSnapshot(draft: WizardDraft, step: number, slug: string): string {
  return JSON.stringify({ step, payload: draftPayload(draft, slug) });
}

export default function CreateWizard() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const params = useLocalSearchParams<{
    template?: string;
    occasion?: string;
    reveal?: string;
    theme?: string;
    /**
     * Set by the pencil on `invite/[id]`. Nothing read it until now: the wizard
     * opened blank and `publish()` always inserted, so Edit created a DUPLICATE
     * surprise and spent another of the month's allowance.
     */
    editId?: string;
  }>();
  const editId = params.editId ?? null;
  const isEditing = editId !== null;

  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<WizardDraft>(emptyWizardDraft());
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [customOccasionError, setCustomOccasionError] = useState<string | null>(null);
  /** Edit mode only: the question rows already on the invite, for reconciliation. */
  const [existingQuestions, setExistingQuestions] = useState<EditableQuestion[]>([]);
  /** Edit mode only: true when the live row already carries a PIN hash. */
  const [hadPin, setHadPin] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [peekOpen, setPeekOpen] = useState(false);
  /** C4 tile tap and C6 "Play full preview" both land here. */
  const [previewOpen, setPreviewOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  /** C4 "Change" — opens IN the wizard; it used to navigate to the themes tab. */
  const [themeSheetOpen, setThemeSheetOpen] = useState(false);
  const [publishProgress, setPublishProgress] = useState<number | null>(null);
  const [sessionUnlocked, setSessionUnlocked] = useState<string[]>([]);

  /**
   * C3 prints this before the row exists, so it is generated up front — but it
   * is STATE, not a ref pinned at mount. A resumed draft brings its own slug
   * back, and minting a fresh one would orphan any contribute link already
   * shared with the people being asked to add to the surprise.
   */
  const [slug, setSlug] = useState(() => generateSlug());
  /** False until the stored draft has been read. Nothing may autosave before. */
  const [hydrated, setHydrated] = useState(false);
  /** Last snapshot committed to disk, so an unchanged draft never rewrites. */
  const lastWritten = useRef<string | null>(null);

  const tier = getActiveTier(profile);
  const theme = getThemeById(draft.themeId) ?? themes[0];
  const publishGate = canPublishTheme({
    isPremium: !!theme.isPremium,
    sessionUnlocked: sessionUnlocked.includes(draft.themeId),
    tier,
  });

  // The reveal components all honour reduce-motion; the wizard has to ask.
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion).catch(() => {});
  }, []);

  const patch = useCallback((next: Partial<WizardDraft>) => {
    setDraft((d) => ({ ...d, ...next }));
  }, []);

  /**
   * Hydrate ONCE, from the stored draft first and the route params second.
   *
   * This used to read the params alone. `readDraft()` was written and imported
   * by exactly one file — Home, to DRAW the resume card — so the wizard always
   * booted empty at step 1 and the autosave below then overwrote the stored
   * draft with that empty record. Pressing "Resume" destroyed the draft it
   * offered to resume; a step-3 draft titled "Rohit device repro" came back as
   * `{"title":"","step":1,"occasion":""}`. The same gap is why C4's "Change"
   * lost the wizard: `theme/[id]` pushes a SECOND `/create`, and the second
   * instance had no memory of the first. Params LAYER ON TOP of the draft.
   */
  const hydrating = useRef(false);
  useEffect(() => {
    if (hydrating.current) return;
    hydrating.current = true;
    let active = true;
    (async () => {
      // Editing loads the LIVE ROW, never the local draft — the draft belongs
      // to a different, unpublished surprise and must survive the detour.
      if (editId) {
        const loaded = await getInviteForEdit(editId);
        if (!active) return;
        if (!loaded) {
          setToast("That surprise couldn't be opened for editing.");
          setHydrated(true);
          return;
        }
        const { draft: fromRow, step: landing } = inviteToDraft(loaded.invite, loaded.questions);
        setDraft(fromRow);
        setStep(landing);
        setSlug(loaded.invite.slug);
        setExistingQuestions(loaded.questions);
        setHadPin(!!loaded.invite.pin_hash);
        // Never autosave an edit over the local draft.
        lastWritten.current = null;
        setHydrated(true);
        return;
      }

      const stored = await readDraft();
      if (!active) return;
      const next = hydrateWizard({
        stored: stored ? { step: stored.step, payload: stored.payload } : null,
        params: {
          template: params.template,
          occasion: params.occasion,
          reveal: params.reveal,
          theme: params.theme,
        },
        newSlug: slug,
      });
      setDraft(next.draft);
      setStep(next.step);
      setSlug(next.slug);
      // The snapshot is seeded here so a wizard nobody has touched writes
      // nothing at all — merely OPENING it used to leave a phantom
      // "Half-finished surprise" card on Home forever.
      lastWritten.current = draftSnapshot(next.draft, next.step, next.slug);
      if (next.photosDropped) {
        setToast("Add your photos again — a draft keeps your words, not your files.");
      }
      setHydrated(true);
    })();
    return () => {
      active = false;
    };
    // Mount-only by design: re-running this would clobber live edits with the
    // draft on disk. `hydrating` makes that explicit rather than incidental.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 500ms debounced autosave, then "Saved" for ~1.2s — the handoff's rule.
   *
   * Gated on a snapshot rather than firing on every render. `draft` is in the
   * dependency array, so the old version ran on MOUNT and wrote a draft for a
   * wizard nobody had typed into. It also flashed "Saved" for that non-event.
   */
  useEffect(() => {
    // An edit must never touch the local draft — that draft is a DIFFERENT,
    // unpublished surprise and overwriting it here would lose it.
    if (!hydrated || isEditing) return;
    const snapshot = draftSnapshot(draft, step, slug);
    if (snapshot === lastWritten.current) return;
    const t = setTimeout(async () => {
      lastWritten.current = snapshot;
      await writeDraft({ title: draft.title, step, payload: draftPayload(draft, slug) });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), SAVED_FLASH_MS);
    }, AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [draft, step, slug, hydrated]);

  function goNext() {
    const result = validateStep(step, draft, { hasExistingPin: hadPin });
    if (!result.ok) {
      if (result.field === "title") setTitleError(result.message);
      if (result.field === "customOccasion") setCustomOccasionError(result.message);
      setToast(result.message);
      return;
    }
    setTitleError(null);
    setCustomOccasionError(null);
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
      return;
    }
    void publish();
  }

  async function unlockTheme() {
    if (!hasBackend) {
      setToast("Unlocking opens a Stripe checkout hosted by the TaDaaaa web app.");
      return;
    }
    try {
      const { url, error } = await createStripeCheckout({ mode: "plus", themeId: draft.themeId });
      if (error || !url) {
        setToast(error || "Checkout failed.");
        return;
      }
      await WebBrowser.openBrowserAsync(url);
      await refreshProfile();
      setSessionUnlocked((prev) =>
        prev.includes(draft.themeId) ? prev : [...prev, draft.themeId]
      );
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Could not start checkout.");
    }
  }

  async function publish() {
    if (!user) {
      setToast("Please sign in to publish a surprise.");
      return;
    }
    if (!draft.revealStyle) {
      setToast("Pick how it opens.");
      setStep(4);
      return;
    }
    // Entitlement is settled here and nowhere else in the wizard.
    if (!publishGate.allowed) {
      setToast("Unlock this theme, or pick a free one, before publishing.");
      return;
    }

    // ---- Edit: UPDATE the row that already exists. -----------------------
    // This branch is the whole point. Without it `createInviteRow` ran and the
    // pencil produced a second surprise every time it was used.
    if (editId) {
      setPublishProgress(0.15);
      try {
        await updateInviteRow(editId, inviteUpdatePatch(draft));
        setPublishProgress(0.5);

        await applyQuestionPlan(editId, questionPlan(existingQuestions, draft.question), draft.question);
        setPublishProgress(0.75);

        // An empty field on a surprise that already had a PIN means "leave it".
        // Turning the toggle OFF clears it; four fresh digits replace it.
        if (!draft.pinEnabled && hadPin) {
          await setInvitePin(editId, null, null);
        } else if (draft.pinEnabled && /^[0-9]{4}$/.test(draft.pin)) {
          const res = await setInvitePin(editId, draft.pin, draft.pinHint.trim() || null);
          if (!res.ok) setToast("Saved, but the PIN could not be changed.");
        }

        setPublishProgress(1);
        // The local draft is NOT cleared: it belongs to a different surprise.
        router.replace({ pathname: "/invite/[id]", params: { id: editId } });
      } catch (e) {
        setPublishProgress(null);
        setToast(e instanceof Error ? e.message : "Could not save your changes.");
      }
      return;
    }

    setPublishProgress(0.05);
    try {
      const count = await monthlyInviteCount(user.id);
      const gate = canCreateInvite(tier, count);
      if (!gate.allowed) {
        setPublishProgress(null);
        Alert.alert("Monthly limit reached", gate.reason ?? "Upgrade to create more surprises.", [
          { text: "Not now", style: "cancel" },
          { text: "See Pricing", onPress: () => router.push("/pricing") },
        ]);
        return;
      }

      setPublishProgress(0.2);
      const expiresAt = new Date(
        Date.now() + linkLifeDays(tier) * 86_400_000
      ).toISOString();

      const { id } = await createInviteRow({
        slug,
        title: draft.title.trim(),
        theme: draft.themeId,
        message: draft.message.trim(),
        occasionType: publishOccasionType(draft),
        revealType: toRevealType(draft.revealStyle),
        countdownDate: draft.scheduleMode === "now" ? null : draft.scheduledAt,
        expiresAt,
        displayTimezone: draft.timezone,
        events: [],
        acceptContributions: draft.contributionsOpen,
        enableDodgeNo: draft.dodgingNo,
        isPaid: false,
      });

      setPublishProgress(0.45);

      // PIN is hashed server-side; the device never computes it.
      if (draft.pinEnabled && /^[0-9]{4}$/.test(draft.pin)) {
        const res = await setInvitePin(id, draft.pin, draft.pinHint.trim() || null);
        if (!res.ok) setToast("Published, but the PIN could not be set. Set it from the detail screen.");
      }

      if (draft.question.trim()) {
        await addQuestions(id, [
          {
            text: draft.question.trim(),
            yesLabel: "Yes",
            noLabel: "No",
            requireAnswer: false,
            attachedPhotoIndex: null,
          },
        ]);
      }

      setPublishProgress(0.6);

      if (draft.photos.length > 0 && hasBackend) {
        const pending: { path: string; caption: string; rotationDeg: number }[] = [];
        // Frame F3 — the failed-upload queue. This loop used to set a flag and
        // move on, so a photo that failed to upload was GONE: the toast asked
        // the creator to redo work the app had already done and then discarded.
        // The resized file is kept instead, and B2 offers Retry.
        const failed: QueuedUpload[] = [];
        let uploadFailed = false;
        for (let i = 0; i < draft.photos.length; i++) {
          const p = draft.photos[i];
          try {
            const { path, signedUrl } = await signedPhotoUploadUrl({
              inviteId: id,
              index: i,
              ext: p.ext,
            });
            const blob = await (await fetch(p.uri)).blob();
            const putRes = await fetch(signedUrl, {
              method: "PUT",
              headers: { "Content-Type": p.mimeType },
              body: blob,
            });
            if (!putRes.ok) throw new Error("upload failed");
            pending.push({ path, caption: p.caption, rotationDeg: p.rotationDeg });
          } catch {
            uploadFailed = true;
            failed.push({
              inviteId: id,
              index: i,
              uri: p.uri,
              ext: p.ext,
              mimeType: p.mimeType,
              caption: p.caption,
              rotationDeg: p.rotationDeg,
            });
          }
          setPublishProgress(0.6 + 0.3 * ((i + 1) / draft.photos.length));
        }
        if (pending.length > 0) {
          try {
            await commitPhotos({ inviteId: id, photos: pending });
          } catch {
            uploadFailed = true;
          }
        }
        if (failed.length > 0) await enqueueUploads(failed);
        if (uploadFailed) {
          setToast("Published — some photos didn't upload. Retry them from the detail screen.");
        }
      } else if (draft.photos.length > 0 && !hasBackend) {
        setToast("Published without photos — the TaDaaaa backend isn't connected.");
      }

      if (draft.addToCalendar && draft.scheduledAt) {
        try {
          const cal = await Calendar.getDefaultCalendarAsync();
          const start = new Date(draft.scheduledAt);
          await Calendar.createEventAsync(cal.id, {
            title: `TaDaaaa: ${draft.title.trim()}`,
            startDate: start,
            endDate: new Date(start.getTime() + 30 * 60_000),
            notes: `${ENV.siteUrl}/surprise/${slug}`,
          });
        } catch {
          setToast("Published — the calendar event couldn't be created.");
        }
      }

      setPublishProgress(1);
      await clearDraft();

      const delivery = summaryRows({
        revealStyle: draft.revealStyle,
        scheduleMode: draft.scheduleMode,
        scheduledAt: draft.scheduledAt,
        timezone: draft.timezone,
        approvedContributions: 0,
        contributionsOpen: draft.contributionsOpen,
        tier,
      })[1].value;

      router.replace({
        pathname: "/create/published",
        params: { slug, themeId: draft.themeId, delivery },
      });
    } catch (e) {
      setPublishProgress(null);
      setToast(e instanceof Error ? e.message : "Could not publish. Try again.");
    }
  }

  const meta = WIZARD_STEPS[step - 1];
  const contributeUrl = `${ENV.siteUrl}/contribute/${slug}`;

  /**
   * Nothing renders until the stored draft has been read.
   *
   * Reading it is async, and an interactive wizard during that window loses the
   * interaction: a tap sets `draft`, hydration then calls `setDraft` with what
   * was on disk, and the tap is gone. Caught in a browser — selecting an
   * occasion immediately after the screen appeared left the draft unchanged.
   * The read is a single AsyncStorage key, so this is a frame or two.
   */
  if (!hydrated) {
    return <View style={{ flex: 1, backgroundColor: palette.paper }} />;
  }

  return (
    <>
      <WizardChrome
        step={step}
        // Editing has no draft to save or discard — leaving just leaves.
        onClose={() => (isEditing ? router.back() : setCloseOpen(true))}
        onBack={() => setStep((s) => Math.max(1, s - 1))}
        onSaveDraft={() => {
          if (isEditing) {
            setToast("Changes save when you press Save changes.");
            return;
          }
          lastWritten.current = draftSnapshot(draft, step, slug);
          void writeDraft({ title: draft.title, step, payload: draftPayload(draft, slug) });
          setToast("Draft saved on this phone.");
        }}
        onPeek={() => setPeekOpen(true)}
        onContinue={goNext}
        continueLabel={
          step === TOTAL_STEPS
            ? isEditing
              ? "Save changes"
              : "Publish & get the link"
            : "Continue"
        }
        busy={publishProgress !== null}
        savedFlash={savedFlash}
      >
        <Text style={{ ...type.screenTitle, fontSize: 28, lineHeight: 28 * 1.15, marginBottom: meta.sub ? 6 : 18 }}>
          {meta.heading}
        </Text>
        {meta.sub ? (
          <Text style={{ ...type.body, fontSize: 15, color: palette.stone, marginBottom: 20 }}>
            {meta.sub}
          </Text>
        ) : null}

        {step === 1 && (
          <OccasionPicker
            value={draft.occasion}
            onChange={(occasion) => {
              setCustomOccasionError(null);
              patch({ occasion });
            }}
            customOccasion={draft.customOccasion}
            onCustomOccasionChange={(customOccasion) => {
              setCustomOccasionError(null);
              patch({ customOccasion });
            }}
            customError={customOccasionError}
          />
        )}

        {step === 2 && (
          <ContentStep
            occasion={draft.occasion}
            title={draft.title}
            message={draft.message}
            photos={draft.photos}
            photoLimit={photoLimit(tier)}
            videoUri={videoUri}
            musicEnabled={musicEnabled}
            titleError={titleError}
            onTitleChange={(title) => {
              setTitleError(null);
              patch({ title });
            }}
            onMessageChange={(message) => patch({ message })}
            onPhotosChange={(photos) => patch({ photos })}
            onVideoChange={setVideoUri}
            onMusicChange={setMusicEnabled}
            onNotify={setToast}
          />
        )}

        {step === 3 && (
          <ContributorsStep
            question={draft.question}
            dodgingNo={draft.dodgingNo}
            contributionsOpen={draft.contributionsOpen}
            contributeUrl={contributeUrl}
            // A draft has no id, so it can have no contributions yet. The
            // frame's populated queue is the edit case, which lives on B2.
            pending={[]}
            approvedCount={0}
            onQuestionChange={(question) => patch({ question })}
            onDodgingNoChange={(dodgingNo) => patch({ dodgingNo })}
            onContributionsOpenChange={(contributionsOpen) => patch({ contributionsOpen })}
            onModerate={() => {}}
            onApproveAll={() => {}}
            onNotify={setToast}
          />
        )}

        {step === 4 && (
          <RevealStyleStep
            value={draft.revealStyle}
            themeName={theme.name}
            onChange={(revealStyle) => patch({ revealStyle })}
            onChangeTheme={() => setThemeSheetOpen(true)}
            onPreview={() => setPreviewOpen(true)}
          />
        )}

        {step === 5 && (
          <ScheduleLockStep
            mode={draft.scheduleMode}
            scheduledAt={draft.scheduledAt}
            timezone={draft.timezone}
            addToCalendar={draft.addToCalendar}
            pinEnabled={draft.pinEnabled}
            pin={draft.pin}
            pinHint={draft.pinHint}
            onModeChange={(scheduleMode) => patch({ scheduleMode })}
            onScheduledAtChange={(scheduledAt) => patch({ scheduledAt })}
            onTimezoneChange={(timezone) => patch({ timezone })}
            onAddToCalendarChange={(addToCalendar) => patch({ addToCalendar })}
            onPinEnabledChange={(pinEnabled) => patch({ pinEnabled })}
            onPinChange={(pin) => patch({ pin })}
            onPinHintChange={(pinHint) => patch({ pinHint })}
            onNotify={setToast}
          />
        )}

        {step === 6 && draft.revealStyle && (
          <PreviewPublishStep
            occasion={draft.occasion}
            title={draft.title}
            themeId={draft.themeId}
            revealStyle={draft.revealStyle}
            scheduleMode={draft.scheduleMode}
            scheduledAt={draft.scheduledAt}
            timezone={draft.timezone}
            photos={draft.photos.length}
            approvedContributions={0}
            contributionsOpen={draft.contributionsOpen}
            musicEnabled={musicEnabled}
            pin={draft.pinEnabled ? draft.pin : null}
            tier={tier}
            showPaywall={!publishGate.allowed}
            publishProgress={publishProgress}
            onPlayPreview={() => setPreviewOpen(true)}
            onUnlockTheme={unlockTheme}
            onGoUnlimited={() => router.push("/pricing")}
          />
        )}
      </WizardChrome>

      <ActionSheet
        visible={closeOpen}
        onClose={() => setCloseOpen(false)}
        title="Leave this surprise?"
        actions={[
          {
            label: "Save draft",
            onPress: async () => {
              lastWritten.current = draftSnapshot(draft, step, slug);
              await writeDraft({ title: draft.title, step, payload: draftPayload(draft, slug) });
              router.back();
            },
          },
          {
            label: "Discard",
            destructive: true,
            onPress: async () => {
              await clearDraft();
              router.back();
            },
          },
        ]}
      />

      <ThemeSheet
        visible={themeSheetOpen}
        selectedId={draft.themeId}
        onSelect={(themeId) => setDraft((d) => selectTheme(d, themeId))}
        onClose={() => setThemeSheetOpen(false)}
      />

      <RevealPreview
        visible={previewOpen}
        draft={draft}
        slug={slug}
        reduced={reducedMotion}
        onClose={() => setPreviewOpen(false)}
      />

      <Sheet visible={peekOpen} onClose={() => setPeekOpen(false)} title="Peek">
        <View style={{ alignItems: "center", gap: space.x3 }}>
          <Text style={{ ...type.screenTitle, fontSize: 20, textAlign: "center" }}>
            {draft.title || "Untitled"}
          </Text>
          <Text style={{ ...type.bodySecondary, textAlign: "center" }}>
            {draft.message || "Your message will show here."}
          </Text>
          <Text style={{ ...type.bodySecondary, textAlign: "center", marginTop: space.x3 }}>
            {draft.photos.length} photo{draft.photos.length === 1 ? "" : "s"} ·{" "}
            {theme.name}
          </Text>
        </View>
      </Sheet>

      {toast ? <EdToast message={toast} onDismiss={() => setToast(null)} /> : null}
    </>
  );
}
