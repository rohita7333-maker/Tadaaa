"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Clock, Hand } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { springs, durations, easings, makeReducedMotionTransition } from "@/lib/motion";

interface RevealSettingsProps {
  revealType: "tap" | "countdown";
  countdownDate: string;
  expiresAt: string;
  hasExpiry: boolean;
  acceptContributions: boolean;
  onRevealTypeChange: (v: "tap" | "countdown") => void;
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
        <Label className="text-[#2D2926] font-medium text-sm mb-3 block">
          Reveal mechanic
        </Label>
        <div className="grid grid-cols-2 gap-3">
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
                ? "border-[#C4686D] bg-[#FFF0EE] shadow-[0_0_0_4px_rgba(196,104,109,0.1)]"
                : "border-[#D4CBC3] bg-white hover:border-[#C4686D]/40"
            )}
          >
            <Hand
              className={`w-6 h-6 ${revealType === "tap" ? "text-[#C4686D]" : "text-[#6B5E57]"}`}
            />
            <div>
              <p
                className={`font-medium text-sm ${revealType === "tap" ? "text-[#C4686D]" : "text-[#2D2926]"}`}
              >
                Tap to Reveal
              </p>
              <p className="text-[#6B5E57] text-xs mt-0.5">They tap to open</p>
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
                ? "border-[#C4686D] bg-[#FFF0EE] shadow-[0_0_0_4px_rgba(196,104,109,0.1)]"
                : "border-[#D4CBC3] bg-white hover:border-[#C4686D]/40"
            )}
          >
            <Clock
              className={`w-6 h-6 ${revealType === "countdown" ? "text-[#C4686D]" : "text-[#6B5E57]"}`}
            />
            <div>
              <p
                className={`font-medium text-sm ${revealType === "countdown" ? "text-[#C4686D]" : "text-[#2D2926]"}`}
              >
                Countdown
              </p>
              <p className="text-[#6B5E57] text-xs mt-0.5">Build anticipation</p>
            </div>
          </motion.button>
        </div>
      </div>

      {/* Countdown date picker — slides in when selected */}
      <AnimatePresence>
        {revealType === "countdown" && (
          <motion.div
            key="countdown-date"
            initial={{ opacity: 0, y: shouldReduce ? 0 : -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: shouldReduce ? 0 : -6 }}
            transition={conditionalFieldTransition(shouldReduce)}
          >
            <Label className="text-[#2D2926] font-medium text-sm mb-1.5 block">
              Reveal date & time
            </Label>
            <input
              type="datetime-local"
              value={countdownDate}
              min={minDateStr}
              onChange={(e) => onCountdownDateChange(e.target.value)}
              className="w-full h-12 rounded-xl border border-[#D4CBC3] px-3 text-[#2D2926] text-sm bg-white focus:outline-none focus:border-[#C4686D] focus:ring-1 focus:ring-[#C4686D] transition-colors"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expiry toggle */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-[#FFF8F0] border border-[#D4CBC3]/40">
        <div>
          <p className="text-[#2D2926] font-medium text-sm">Set expiry date</p>
          <p className="text-[#6B5E57] text-xs mt-0.5">
            Surprise auto-expires on this date
          </p>
        </div>
        <Switch
          checked={hasExpiry}
          onCheckedChange={onHasExpiryChange}
          className="data-[state=checked]:bg-[#C4686D]"
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
            <Label className="text-[#2D2926] font-medium text-sm mb-1.5 block">
              Expiry date
            </Label>
            <input
              type="datetime-local"
              value={expiresAt}
              min={minDateStr}
              onChange={(e) => onExpiresAtChange(e.target.value)}
              className="w-full h-12 rounded-xl border border-[#D4CBC3] px-3 text-[#2D2926] text-sm bg-white focus:outline-none focus:border-[#C4686D] focus:ring-1 focus:ring-[#C4686D] transition-colors"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contributions toggle — collaborative memory invites (Task B2). When
          on, the dashboard exposes a /contribute/<slug> link and family
          members can drop a photo + note before the reveal. */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-[#FFF8F0] border border-[#D4CBC3]/40">
        <div className="pr-3">
          <p className="text-[#2D2926] font-medium text-sm">
            Let family contribute photos/messages
          </p>
          <p className="text-[#6B5E57] text-xs mt-0.5">
            Get a second link to send to people who want to add memories
          </p>
        </div>
        <Switch
          checked={acceptContributions}
          onCheckedChange={onAcceptContributionsChange}
          className="data-[state=checked]:bg-[#C4686D]"
        />
      </div>
    </div>
  );
}
