"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Check, ExternalLink } from "lucide-react";
import { getThemeById } from "@/lib/themes";
import { canPublishTheme } from "@/lib/publish-gate";
import { APP_URL, PREMIUM_THEME_PRICE } from "@/lib/constants";
import { springs, durations, makeReducedMotionTransition } from "@/lib/motion";
import type { PhotoFile } from "./PhotoUploader";
import { REVEAL_STYLE_LABELS, type RevealStyle } from "@/lib/templates";
import ShareButtons from "@/components/dashboard/ShareButtons";
import InviteQr from "@/components/dashboard/InviteQr";
import VideoGenerator from "./VideoGenerator";
import { SUMCARD, SUMROW, SUMROW_K, SUMROW_V, PAYWALL, WIZ_H2, WIZ_SUB } from "./editorial";

interface PreviewPublishProps {
  title: string;
  message: string;
  theme: string;
  revealType: RevealStyle;
  photos: PhotoFile[];
  tier?: string;
  acceptContributions?: boolean;
  /** Selected theme was unlocked by a one-off checkout earlier this session. */
  sessionUnlocked?: boolean;
  /** Starts the $4.99 one-off checkout for the selected premium theme. */
  onUnlockTheme?: () => void;
  onPublish: () => Promise<{ slug: string; inviteId: string } | null>;
}

/**
 * Final wizard step — mockup `w6` (L1208): a `.sumcard` of what is about to
 * ship, the `.paywall` when the theme is premium, and a coral block CTA.
 *
 * The old titanium phone shell is gone: re-drawn device chrome is banned by
 * the editorial identity, and the mockup previews with the flat `.mini` card
 * instead. The publish gate, Stripe session verification and the free-tier
 * expiry notice are unchanged.
 */
export default function PreviewPublish({
  title,
  message,
  theme,
  revealType,
  photos,
  tier = "free",
  acceptContributions = false,
  sessionUnlocked = false,
  onUnlockTheme,
  onPublish,
}: PreviewPublishProps) {
  const [publishing, setPublishing] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [publishedInviteId, setPublishedInviteId] = useState<string | null>(null);
  const shouldReduce = useReducedMotion();

  const themeData = getThemeById(theme);
  const firstPhoto = photos[0];
  const link = publishedSlug ? `${APP_URL}/surprise/${publishedSlug}` : "";

  // The wizard's only price moment. Everything upstream is free to choose;
  // entitlement is settled here, once, right before publishing.
  const gate = canPublishTheme({
    isPremium: !!themeData?.isPremium,
    sessionUnlocked,
    tier,
  });

  async function handlePublish() {
    setPublishing(true);
    try {
      const result = await onPublish();
      if (result) {
        setPublishedSlug(result.slug);
        setPublishedInviteId(result.inviteId);
      }
    } finally {
      setPublishing(false);
    }
  }

  return (
    <AnimatePresence mode="wait">
      {publishedSlug ? (
        <motion.div
          key="success"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={makeReducedMotionTransition(shouldReduce, { duration: durations.quick })}
          className="py-8 text-center"
        >
          {/* Coral disc — the payoff moment, in the palette's one accent. */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={makeReducedMotionTransition(shouldReduce, springs.weighty)}
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-coral"
          >
            <Check className="h-8 w-8 text-white" strokeWidth={1.8} />
          </motion.div>

          <h2 className="mb-2 font-heading text-[30px] text-ink">Your surprise is live.</h2>
          <p className="mx-auto mb-8 max-w-xs text-sm text-stone">
            Send the link. They will have no idea what is waiting.
          </p>

          {/* Link plaque — mockup `.copyrow` input styling. */}
          <div className="mx-auto mb-6 max-w-sm rounded-[var(--r-md)] border border-mist bg-pebble p-4 text-left">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone">
              Shareable link
            </p>
            <p className="break-all text-[13px] text-ink">{link}</p>
          </div>

          {/* Mockup `.qrbox` sits between the copy row and the share targets
              (L1474). Shown outright here — at publish the QR is the artefact
              you print into a card, not a thing to go hunting for. */}
          <div className="mb-6">
            <InviteQr
              value={link}
              caption="Print it, tuck it into a card."
              fileName={`tadaaaa-${publishedSlug}`}
            />
          </div>

          <div className="mx-auto mb-4 max-w-sm">
            <ShareButtons
              slug={publishedSlug}
              title={title}
              inviteId={publishedInviteId ?? undefined}
              acceptContributions={acceptContributions}
              hideQr
            />
          </div>

          {publishedInviteId && (
            <div className="mx-auto mb-4 max-w-sm">
              <VideoGenerator inviteId={publishedInviteId} tier={tier} />
            </div>
          )}

          <div className="mt-2 flex justify-center gap-3">
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="ed-btn ed-btn-line"
            >
              <ExternalLink className="h-4 w-4" />
              Preview
            </a>
          </div>

          {tier === "free" && (
            <p className="mt-5 px-4 text-[13px] text-stone">
              This surprise stays live for 28 days after it is opened.{" "}
              <a href="/pricing" className="ed-tlink">
                Upgrade
              </a>{" "}
              to keep it forever.
            </p>
          )}

          <a
            href="/dashboard"
            className="mt-3 block text-center text-[13px] text-stone transition-colors hover:text-ink"
          >
            Back to dashboard
          </a>
        </motion.div>
      ) : (
        <motion.div
          key="form"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={makeReducedMotionTransition(shouldReduce, { duration: durations.quick })}
        >
          <h2 className={WIZ_H2}>Preview &amp; finalize</h2>
          <p className={WIZ_SUB}>See it exactly as they will. Then decide.</p>

          {/* Mockup `.mini` — a flat 9:16 card, no re-drawn device chrome.
              Below 961px this is the only preview, since the hub's live
              preview column is hidden there. */}
          <div className="mb-6 flex justify-center min-[961px]:hidden">
            <div className="w-[200px] rounded-[18px] border border-mist bg-paper p-2">
              <div className="relative flex aspect-[9/16] flex-col items-center justify-center overflow-hidden rounded-xl bg-ink p-[18px] text-center">
                {firstPhoto ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={firstPhoto.preview}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full object-cover opacity-[0.35]"
                    />
                  </>
                ) : (
                  themeData && (
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 opacity-[0.22]"
                      style={{ background: themeData.colors.background }}
                    />
                  )
                )}
                <p className="relative text-[8px] uppercase tracking-[0.14em] text-sand">
                  {REVEAL_STYLE_LABELS[revealType]}
                </p>
                <p className="relative my-1.5 break-words font-heading text-base text-white">
                  {title || "Their name"}
                </p>
                <p className="relative max-h-11 overflow-hidden break-words text-[9px] leading-relaxed text-white/75">
                  {message || "Your message will appear here."}
                </p>
              </div>
            </div>
          </div>

          {/* Mockup `.sumcard` */}
          <div className={SUMCARD}>
            <div className={SUMROW}>
              <span className={SUMROW_K}>Title</span>
              <span className={SUMROW_V}>{title || "Untitled"}</span>
            </div>
            <div className={SUMROW}>
              <span className={SUMROW_K}>Theme</span>
              <span className={SUMROW_V}>{themeData?.name ?? "Not set"}</span>
            </div>
            <div className={SUMROW}>
              <span className={SUMROW_K}>Reveal</span>
              <span className={SUMROW_V}>{REVEAL_STYLE_LABELS[revealType]}</span>
            </div>
            <div className={SUMROW}>
              <span className={SUMROW_K}>Photos</span>
              <span className={SUMROW_V}>{photos.length}</span>
            </div>
            <div className={SUMROW}>
              <span className={SUMROW_K}>Contributions</span>
              <span className={SUMROW_V}>{acceptContributions ? "On" : "Off"}</span>
            </div>
          </div>

          {tier === "free" && (
            <p className="mb-[18px] rounded-[var(--r-sm)] border border-mist bg-pebble px-4 py-3 text-[13px] text-stone">
              Free surprises stay live for{" "}
              <strong className="font-semibold text-ink">28 days after they are opened</strong>.
              After that the link expires.{" "}
              <a href="/pricing" className="ed-tlink">
                Upgrade
              </a>{" "}
              to keep yours forever.
            </p>
          )}

          {/* Premium gate — the one place a price appears in the wizard.
              Cross-fades with the publish CTA so an entitlement change
              (e.g. unlocking a theme mid-step) never pops in raw. */}
          <AnimatePresence mode="wait" initial={false}>
            {!gate.allowed ? (
              <motion.div
                key="gate"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={makeReducedMotionTransition(shouldReduce, { duration: durations.quick })}
                className={PAYWALL}
              >
                <h3 className="mb-1.5 font-heading text-xl text-ink">
                  This theme is premium.
                </h3>
                <p className="mb-[18px] text-sm text-stone">
                  <span className="font-semibold text-ink">{themeData?.name}</span> unlocks for $
                  {PREMIUM_THEME_PRICE.toFixed(2)}, or go Unlimited and never think about it again.
                </p>
                <div className="flex flex-col justify-center gap-2.5 sm:flex-row">
                  <button
                    type="button"
                    onClick={onUnlockTheme}
                    disabled={!onUnlockTheme}
                    className="ed-btn ed-btn-coral"
                  >
                    Unlock for ${PREMIUM_THEME_PRICE.toFixed(2)}
                  </button>
                  <a href="/pricing" className="ed-btn ed-btn-line">
                    Go Unlimited
                  </a>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="cta"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={makeReducedMotionTransition(shouldReduce, { duration: durations.quick })}
              >
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={publishing}
                  className="ed-btn ed-btn-coral ed-btn-block"
                >
                  {publishing ? "Publishing…" : "Publish your surprise"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
