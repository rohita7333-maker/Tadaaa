"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Clock, Hand, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { springs, durations, easings, makeReducedMotionTransition } from "@/lib/motion";
import type { RevealStyle } from "@/lib/templates";

interface RevealSettingsProps {
  revealType: RevealStyle;
  countdownDate: string;
  expiresAt: string;
  hasExpiry: boolean;
  acceptContributions: boolean;
  onRevealTypeChange: (v: RevealStyle) => void;
  onCountdownDateChange: (v: string) => void;
  onExpiresAtChange: (v: string) => void;
  onHasExpiryChange: (v: boolean) => void;
  onAcceptContributionsChange: (v: boolean) => void;
}

const conditionalFieldTransition = (shouldReduce: boolean | null | undefined) =>
  makeReducedMotionTransition(shouldReduce, { duration: durations.quick, ease: easings.entrance });

export default function RevealSettings({
  revealType,
  countdownDate,
  expiresAt,
  hasExpiry,
  acceptContributions,
  onRevealTypeChange,
  onCountdownDateChange,
  onExpiresAtChange,
  onHasExpiryChange,
  onAcceptContributionsChange,
}: RevealSettingsProps) {
  const shouldReduce = useReducedMotion();
  const minDate = new Date();
  minDate.setMinutes(minDate.getMinutes() + 5);
  const minDateStr = minDate.toISOString().slice(0, 16);

  return (
    <div className="space-y-5">
      {/* Reveal type */}
      <div>
        <Label className="text-[#1A1B18] font-medium text-sm mb-3 block">
          Reveal mechanic
        </Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <motion.button
            type="button"
            onClick={() => onRevealTypeChange("tap")}
            initial={false}
            animate={{ scale: revealType === "tap" ? 1.02 : 1 }}
            whileTap={shouldReduce ? {} : { scale: 0.96 }}
            transition={makeReducedMotionTransition(shouldReduce, springs.soft)}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-colors",
              revealType === "tap"
                ? "border-[#3E6B5C] bg-[#FFF0EE] shadow-[0_0_0_4px_rgba(62, 107, 92,0.1)]"
                : "border-[#E9E6DF] bg-white hover:border-[#3E6B5C]/40"
            )}
          >
            <Hand
              className={`w-6 h-6 ${revealType === "tap" ? "text-[#3E6B5C]" : "text-[#6F6E68]"}`}
            />
            <div>
              <p
                className={`font-medium text-sm ${revealType === "tap" ? "text-[#3E6B5C]" : "text-[#1A1B18]"}`}
              >
                Tap to Reveal
              </p>
              <p className="text-[#6F6E68] text-xs mt-0.5">They tap to open</p>
            </div>
          </motion.button>

          <motion.button
            type="button"
            onClick={() => onRevealTypeChange("countdown")}
            initial={false}
            animate={{ scale: revealType === "countdown" ? 1.02 : 1 }}
            whileTap={shouldReduce ? {} : { scale: 0.96 }}
            transition={makeReducedMotionTransition(shouldReduce, springs.soft)}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-colors",
              revealType === "countdown"
                ? "border-[#3E6B5C] bg-[#FFF0EE] shadow-[0_0_0_4px_rgba(62, 107, 92,0.1)]"
                : "border-[#E9E6DF] bg-white hover:border-[#3E6B5C]/40"
            )}
          >
            <Clock
              className={`w-6 h-6 ${revealType === "countdown" ? "text-[#3E6B5C]" : "text-[#6F6E68]"}`}
            />
            <div>
              <p
                className={`font-medium text-sm ${revealType === "countdown" ? "text-[#3E6B5C]" : "text-[#1A1B18]"}`}
              >
                Countdown
              </p>
              <p className="text-[#6F6E68] text-xs mt-0.5">Build anticipation</p>
            </div>
          </motion.button>

          <motion.button
            type="button"
            onClick={() => onRevealTypeChange("scroll_story")}
            initial={false}
            animate={{ scale: revealType === "scroll_story" ? 1.02 : 1 }}
            whileTap={shouldReduce ? {} : { scale: 0.96 }}
            transition={makeReducedMotionTransition(shouldReduce, springs.soft)}
            className={cn(
              "relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-colors",
              revealType === "scroll_story"
                ? "border-[#3E6B5C] bg-[#FFF0EE] shadow-[0_0_0_4px_rgba(62, 107, 92,0.1)]"
                : "border-[#E9E6DF] bg-white hover:border-[#3E6B5C]/40"
            )}
          >
            <span className="absolute right-2 top-2 rounded-full bg-[#3E6B5C] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              New
            </span>
            <Moon
              className={`w-6 h-6 ${revealType === "scroll_story" ? "text-[#3E6B5C]" : "text-[#6F6E68]"}`}
            />
            <div>
              <p
                className={`font-medium text-sm ${revealType === "scroll_story" ? "text-[#3E6B5C]" : "text-[#1A1B18]"}`}
              >
                Scroll Story
              </p>
              <p className="text-[#6F6E68] text-xs mt-0.5">A cinematic scroll</p>
            </div>
          </motion.button>
        </div>
      </div>

      {/* Reveal date picker — slides in for countdown AND scroll story.
          Countdown gates the whole reveal on the date; scroll story uses it
          to power the finale countdown at the end of the cinematic scroll. */}
      <AnimatePresence>
        {(revealType === "countdown" || revealType === "scroll_story") && (
          <motion.div
            key="countdown-date"
            initial={{ opacity: 0, y: shouldReduce ? 0 : -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: shouldReduce ? 0 : -6 }}
            transition={conditionalFieldTransition(shouldReduce)}
          >
            <Label className="text-[#1A1B18] font-medium text-sm mb-1.5 block">
              Reveal date &amp; time
            </Label>
            <input
              type="datetime-local"
              value={countdownDate}
              min={minDateStr}
              onChange={(e) => onCountdownDateChange(e.target.value)}
              className="w-full h-12 rounded-xl border border-[#E9E6DF] px-3 text-[#1A1B18] text-sm bg-white focus:outline-none focus:border-[#3E6B5C] focus:ring-1 focus:ring-[#3E6B5C] transition-colors"
            />
            {revealType === "scroll_story" && (
              <p className="text-[#6F6E68] text-xs mt-1.5">
                The big day — powers the finale countdown ✨
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expiry toggle */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-[#FAF9F6] border border-[#E9E6DF]/40">
        <div>
          <p className="text-[#1A1B18] font-medium text-sm">Set expiry date</p>
          <p className="text-[#6F6E68] text-xs mt-0.5">
            Surprise auto-expires on this date
          </p>
        </div>
        <Switch
          checked={hasExpiry}
          onCheckedChange={onHasExpiryChange}
          className="data-[state=checked]:bg-[#3E6B5C]"
        />
      </div>

      {/* Expiry date field — slides in when toggle is on */}
      <AnimatePresence>
        {hasExpiry && (
          <motion.div
            key="expiry-date"
            initial={{ opacity: 0, y: shouldReduce ? 0 : -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: shouldReduce ? 0 : -6 }}
            transition={conditionalFieldTransition(shouldReduce)}
          >
            <Label className="text-[#1A1B18] font-medium text-sm mb-1.5 block">
              Expiry date
            </Label>
            <input
              type="datetime-local"
              value={expiresAt}
              min={minDateStr}
              onChange={(e) => onExpiresAtChange(e.target.value)}
              className="w-full h-12 rounded-xl border border-[#E9E6DF] px-3 text-[#1A1B18] text-sm bg-white focus:outline-none focus:border-[#3E6B5C] focus:ring-1 focus:ring-[#3E6B5C] transition-colors"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contributions toggle — collaborative memory invites (Task B2). When
          on, the dashboard exposes a /contribute/<slug> link and family
          members can drop a photo + note before the reveal. */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-[#FAF9F6] border border-[#E9E6DF]/40">
        <div className="pr-3">
          <p className="text-[#1A1B18] font-medium text-sm">
            Let family contribute photos/messages
          </p>
          <p className="text-[#6F6E68] text-xs mt-0.5">
            Get a second link to send to people who want to add memories
          </p>
        </div>
        <Switch
          checked={acceptContributions}
          onCheckedChange={onAcceptContributionsChange}
          className="data-[state=checked]:bg-[#3E6B5C]"
        />
      </div>
    </div>
  );
}
