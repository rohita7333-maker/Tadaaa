"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Check, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getThemeById } from "@/lib/themes";
import { canPublishTheme } from "@/lib/publish-gate";
import { APP_URL, PREMIUM_THEME_PRICE } from "@/lib/constants";
import { springs, durations, makeReducedMotionTransition } from "@/lib/motion";
import type { PhotoFile } from "./PhotoUploader";
import { REVEAL_STYLE_LABELS, type RevealStyle } from "@/lib/templates";
import ShareButtons from "@/components/dashboard/ShareButtons";
import VideoGenerator from "./VideoGenerator";

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
          className="text-center py-8"
        >
          {/* Check circle — the payoff moment. springs.weighty gives it landed weight. */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={makeReducedMotionTransition(shouldReduce, springs.weighty)}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-[#6B8F71] to-[#4a6b50] flex items-center justify-center mx-auto mb-6 shadow-[0_4px_24px_rgba(107,143,113,0.3)]"
          >
            <Check className="w-10 h-10 text-white" />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={makeReducedMotionTransition(shouldReduce, {
              duration: durations.base,
              delay: shouldReduce ? 0 : durations.instant,
            })}
            className="font-heading text-3xl text-[#1A1B18] mb-2"
          >
            Your surprise is ready! ✨
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={makeReducedMotionTransition(shouldReduce, {
              duration: durations.base,
              delay: shouldReduce ? 0 : durations.quick,
            })}
            className="text-[#6F6E68] mb-8 max-w-xs mx-auto"
          >
            Share this link with the lucky person. They&apos;ll have no idea what&apos;s waiting for them!
          </motion.p>

          {/* Link box */}
          <div className="bg-[#FAF9F6] border border-[#E9E6DF]/60 rounded-2xl p-4 mb-6 max-w-sm mx-auto">
            <p className="text-[#6F6E68] text-xs mb-2 font-medium uppercase tracking-wider">
              Shareable link
            </p>
            <p className="text-[#1A1B18] text-sm font-medium break-all">{link}</p>
          </div>

          <div className="max-w-sm mx-auto mb-4">
            <ShareButtons
              slug={publishedSlug!}
              title={title}
              inviteId={publishedInviteId ?? undefined}
              acceptContributions={acceptContributions}
            />
          </div>

          {publishedInviteId && (
            <div className="max-w-sm mx-auto mb-4">
              <VideoGenerator inviteId={publishedInviteId} tier={tier} />
            </div>
          )}

          <div className="flex justify-center gap-3 mt-2">
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center h-10 px-5 rounded-full border border-[#E9E6DF] text-[#1A1B18] hover:bg-[#FAF9F6] transition-all duration-300 text-sm font-medium"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Preview
            </a>
          </div>

          {tier === "free" && (
            <p className="text-xs text-[#9B8E87] mt-5 px-4">
              ⏳ This surprise stays live for 28 days after it&apos;s opened.{" "}
              <a href="/pricing" className="text-[#3E6B5C] hover:underline">Upgrade</a> to keep it forever.
            </p>
          )}

          <a
            href="/dashboard"
            className="block mt-3 text-[#6F6E68] hover:text-[#1A1B18] text-sm text-center transition-colors"
          >
            ← Back to dashboard
          </a>
        </motion.div>
      ) : (
        <motion.div
          key="form"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={makeReducedMotionTransition(shouldReduce, { duration: durations.quick })}
        >
          <h2 className="font-heading text-2xl text-[#1A1B18] mb-2">Preview & Publish</h2>
          <p className="text-[#6F6E68] mb-8">
            Here&apos;s how your surprise will look. Ready to share?
          </p>

          {/* Phone preview */}
          <div className="flex justify-center mb-8">
            <div className="relative w-[230px]">
              {/* Side power button */}
              <div className="absolute -right-[3px] top-[80px] w-[3px] h-10 bg-[#c0c0c0] rounded-r-sm" />
              {/* Volume buttons (left) */}
              <div className="absolute -left-[3px] top-[70px] w-[3px] h-6 bg-[#c0c0c0] rounded-l-sm" />
              <div className="absolute -left-[3px] top-[102px] w-[3px] h-6 bg-[#c0c0c0] rounded-l-sm" />
              {/* Device shell — titanium-ish gradient */}
              <div
                className="rounded-[44px] p-2 shadow-[0_32px_80px_rgba(26, 27, 24,0.28)]"
                style={{
                  background: "linear-gradient(to bottom, #e8e8e8, #d0d0d0, #b8b8b8)",
                }}
              >
                {/* Inner screen */}
                <div className="relative rounded-[36px] overflow-hidden aspect-[9/19]"
                  style={{ background: themeData?.colors.background }}
                >
                  {/* Dynamic island */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-10" />

                  {firstPhoto ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={firstPhoto.preview}
                        alt="Preview"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      {/* CSS gradient scrim — photo shows through but text stays legible */}
                      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
                    </>
                  ) : null}

                  <div className="relative z-10 text-center px-4 absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl mb-3 block">
                      {themeData?.revealIcon === "envelope"
                        ? "✉️"
                        : themeData?.revealIcon === "gift"
                        ? "🎁"
                        : themeData?.revealIcon === "heart"
                        ? "❤️"
                        : themeData?.revealIcon === "star"
                        ? "⭐"
                        : "🎈"}
                    </span>
                    <p
                      className="text-sm font-medium mb-1 leading-tight"
                      style={{ color: themeData?.colors.text || "#fff" }}
                    >
                      {title || "Your surprise title"}
                    </p>
                    <p
                      className="text-xs opacity-70"
                      style={{ color: themeData?.colors.text || "#fff" }}
                    >
                      {revealType === "tap"
                        ? "Tap to open ✨"
                        : revealType === "scroll_story"
                          ? "Scroll story 🌙"
                          : "Countdown reveal ⏱"}
                    </p>
                  </div>

                  {/* Home indicator bar */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-16 h-1 bg-white/40 rounded-full z-10" />
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-[#FAF9F6] rounded-2xl p-5 mb-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#6F6E68]">Theme</span>
              <span className="text-[#1A1B18] font-medium">{themeData?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6F6E68]">Photos</span>
              <span className="text-[#1A1B18] font-medium">{photos.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6F6E68]">Reveal</span>
              <span className="text-[#1A1B18] font-medium">{REVEAL_STYLE_LABELS[revealType]}</span>
            </div>
          </div>

          {/* Free-tier expiry notice */}
          {tier === "free" && (
            <div className="flex items-start gap-2 bg-[#FFF0E8] border border-[#E9E6DF]/50 rounded-xl px-4 py-3 mb-5 text-xs text-[#6F6E68]">
              <span className="text-base leading-none mt-0.5">⏳</span>
              <span>
                Free surprises stay live for <strong className="text-[#1A1B18]">28 days after they&apos;re opened</strong>. After that, the link expires.{" "}
                <a href="/pricing" className="text-[#3E6B5C] font-medium hover:underline">Upgrade</a> to keep yours forever.
              </span>
            </div>
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
                className="rounded-2xl border border-[#8A6F35]/40 bg-gradient-to-br from-[#FAF9F6] to-[#FDF1E3] p-5"
              >
                <div className="flex items-start gap-3">
                  <span className="shrink-0 grid place-items-center w-10 h-10 rounded-xl bg-white/70 border border-[#8A6F35]/25">
                    <Sparkles className="w-5 h-5 text-[#8A6F35]" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-heading text-lg text-[#1A1B18] leading-tight">
                      Premium surprise — ${PREMIUM_THEME_PRICE.toFixed(2)}
                    </p>
                    <p className="mt-1 text-sm text-[#6F6E68] leading-snug">
                      <span className="font-medium text-[#1A1B18]">
                        {themeData?.name}
                      </span>{" "}
                      is a premium theme. Unlock it once, or get every premium
                      theme with Unlimited.
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={onUnlockTheme}
                    disabled={!onUnlockTheme}
                    className="flex-1 h-12 rounded-full bg-gradient-to-r from-[#3E6B5C] to-[#2E5145] hover:from-[#2E5145] hover:to-[#3E6B5C] text-white font-medium transition-colors shadow-md"
                  >
                    Unlock for ${PREMIUM_THEME_PRICE.toFixed(2)}
                  </Button>
                  <a
                    href="/pricing"
                    className="flex-1 inline-flex items-center justify-center h-12 rounded-full border border-[#8A6F35]/50 text-[#8A6F35] hover:bg-[#8A6F35]/10 transition-colors text-sm font-medium focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#3E6B5C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF9F6]"
                  >
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
                {/* Publish CTA — whileTap spring replaces CSS hover:scale */}
                <motion.div
                  whileTap={shouldReduce ? {} : { scale: 0.97 }}
                  transition={springs.soft}
                  className="w-full"
                >
                  <Button
                    onClick={handlePublish}
                    disabled={publishing}
                    className="w-full h-14 rounded-full bg-gradient-to-r from-[#3E6B5C] to-[#2E5145] hover:from-[#2E5145] hover:to-[#3E6B5C] text-white text-base font-medium transition-colors shadow-lg pulse-glow"
                  >
                    {publishing ? (
                      <span className="flex items-center gap-2">
                        <motion.span
                          animate={shouldReduce ? {} : { scale: [1, 1.15, 1], opacity: [1, 0.7, 1] }}
                          transition={{ repeat: Infinity, duration: durations.base }}
                          style={{ display: "inline-flex" }}
                        >
                          ✨
                        </motion.span>
                        Publishing…
                      </span>
                    ) : (
                      <>✨ Publish Your Surprise</>
                    )}
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
