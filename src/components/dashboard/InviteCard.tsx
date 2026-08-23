"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, Trash2, ExternalLink, MessageCircleQuestion, Share2, Heart, MessageCircle, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { durations, easings, makeReducedMotionTransition } from "@/lib/motion";
import { formatDistanceToNow } from "date-fns";
import { formatViewCount, isExpired } from "@/lib/utils";
import { getThemeById } from "@/lib/themes";
import { toast } from "sonner";
import { deleteInvite } from "@/actions/invite";
import { APP_URL } from "@/lib/constants";
import ResponsesModal from "@/components/dashboard/ResponsesModal";
import ShareButtons from "@/components/dashboard/ShareButtons";
import DeleteConfirmModal from "@/components/dashboard/DeleteConfirmModal";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { DesignerArtButton } from "@/components/surprise/DesignerArtButton";
import { canUseDesignerArt, type StyleVariant, STYLE_VARIANTS } from "@/lib/designer-art";

interface InviteCardProps {
  invite: {
    id: string;
    slug: string;
    title: string;
    theme: string;
    view_count: number;
    response_count: number;
    rsvp_count?: number;
    is_active: boolean;
    expires_at: string | null;
    created_at: string;
    reveal_type: "tap" | "countdown";
    accept_contributions?: boolean;
    revealed_at?: string | null;
  };
  creatorName?: string;
  /** Viewer's active tier — gates whether a live surprise can be deleted. */
  tier?: "free" | "plus" | "unlimited";
  /** Called after successful delete so parent can animate removal. */
  onDelete?: () => void;
}

export default function InviteCard({ invite, creatorName, tier = "free", onDelete }: InviteCardProps) {
  const shouldReduce = useReducedMotion();
  const [deleting, setDeleting] = useState(false);
  const [style, setStyle] = useState<StyleVariant>("classic");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [responsesOpen, setResponsesOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const theme = getThemeById(invite.theme);
  const expired = isExpired(invite.expires_at);
  const link = `${APP_URL}/surprise/${invite.slug}`;

  // Free tier can only delete once a surprise has expired (28 days post-reveal)
  // or been deactivated. Paid tiers delete anytime. Mirrors the server gate in
  // deleteInvite() so the UI never offers an action the action would reject.
  const isPaid = tier === "plus" || tier === "unlimited";
  const deleteLocked = !isPaid && !(expired || !invite.is_active);
  // Revealed (free) surprises carry an expires_at we can count down to.
  const countdownTo =
    deleteLocked && invite.expires_at && !expired ? invite.expires_at : null;

  async function doDelete() {
    setDeleting(true);
    const result = await deleteInvite(invite.id);
    if (result?.error) {
      toast.error(result.error);
      setDeleting(false);
      setConfirmOpen(false);
    } else {
      setConfirmOpen(false);
      onDelete?.();
    }
  }

  // Badge on "See responses" — how much there actually is to look at.
  const engagementCount = (invite.rsvp_count ?? 0) + (invite.response_count ?? 0);

  const status = !invite.is_active
    ? "inactive"
    : expired
    ? "expired"
    : "active";

  return (
    <SpotlightCard bare className="bg-white rounded-3xl border border-[#E9E6DF]/20 overflow-hidden group">
      {/* Thumbnail preview — click opens preview */}
      <Link
        href={`/surprise/${invite.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${invite.title} preview`}
        className="block h-28 relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#3E6B5C]/40"
        style={{
          background: theme?.colors.background
            ? `linear-gradient(135deg, ${theme.colors.background} 0%, ${theme.colors.accent}22 100%)`
            : "linear-gradient(135deg, #FFF0E8 0%, #F5E6E0 100%)",
        }}
      >
        <div className="flex items-center justify-center gap-3 w-full h-full">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300"
            style={{ background: theme?.colors.accent || "#3E6B5C" }}
          >
            <Heart className="w-7 h-7 fill-white text-white" />
          </div>
        </div>
        <div
          className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-semibold pointer-events-none"
          style={{ background: `${theme?.colors.accent || "#3E6B5C"}20`, color: theme?.colors.accent || "#3E6B5C" }}
          title={invite.reveal_type === "tap" ? "Recipient taps to reveal" : "Counts down to reveal time"}
        >
          {invite.reveal_type === "tap" ? "✨ Tap to reveal" : "⏱ Countdown"}
        </div>
      </Link>

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <Link
              href={`/surprise/${invite.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block focus:outline-none focus:underline"
            >
              <h3 className="font-heading text-lg text-[#1A1B18] truncate group-hover:text-[#3E6B5C] transition-colors">
                {invite.title}
              </h3>
            </Link>
            <p className="text-[#6F6E68] text-xs mt-0.5">
              {theme?.name || invite.theme}
            </p>
          </div>
          <Badge
            className={`ml-2 shrink-0 text-xs rounded-full px-2.5 ${
              status === "active"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-[#E9E6DF]/40 text-[#6F6E68] border-[#E9E6DF]"
            }`}
            variant="outline"
          >
            {status}
          </Badge>
        </div>

        {/* Stats */}
        <div className="mb-1 bg-[#FAF9F6] rounded-xl px-3 py-2">
          <div className="flex items-center gap-3 text-sm text-[#6F6E68]">
            <span
              className="flex items-center gap-1.5"
              title="How many times this surprise page was opened (creator previews don't count)"
            >
              <Eye className="w-3.5 h-3.5 text-[#3E6B5C]" />
              <span className="font-semibold text-[#1A1B18]">{formatViewCount(invite.view_count)}</span>
              <span className="text-xs">views</span>
            </span>
            <div className="w-px h-3.5 bg-[#E9E6DF]" />
            <span
              className="flex items-center gap-1.5"
              title="Guests who tapped “I'm in!” to confirm they're coming"
            >
              <Heart className="w-3.5 h-3.5 text-[#3E6B5C]" />
              <span className="font-semibold text-[#1A1B18]">{invite.rsvp_count ?? 0}</span>
              <span className="text-xs">RSVPs</span>
            </span>
            <div className="w-px h-3.5 bg-[#E9E6DF]" />
            <span
              className="flex items-center gap-1.5"
              title="Answers guests gave to the yes/no questions you added"
            >
              <MessageCircle className="w-3.5 h-3.5 text-[#8A6F35]" />
              <span className="font-semibold text-[#1A1B18]">{invite.response_count ?? 0}</span>
              <span className="text-xs">responses</span>
            </span>
          </div>
          <p className="text-[11px] text-[#9B8E87] mt-1.5">
            {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
            {invite.revealed_at && (
              <span title="When this surprise was first opened — the 28-day clock starts here">
                {" · "}
                <span className="text-[#3E6B5C] font-medium">
                  Opened {formatDistanceToNow(new Date(invite.revealed_at), { addSuffix: true })}
                </span>
              </span>
            )}
          </p>
        </div>
        <div className="mb-3" />

        {/* Actions — "See responses" is the primary affordance: the card's
            numbers are the hook, this is where the "who" lives. */}
        <div className="flex gap-2">
          <Button
            onClick={() => setResponsesOpen(true)}
            size="sm"
            title="See who opened, who RSVP'd, and what they answered"
            className="flex-1 h-9 rounded-full text-xs font-semibold bg-[#FFF0EE] text-[#3E6B5C] border border-[#3E6B5C]/40 shadow-none hover:bg-[#FFE4E1] hover:border-[#3E6B5C] transition-all duration-300"
          >
            <MessageCircleQuestion className="w-3.5 h-3.5 mr-1" />
            See responses
            {engagementCount > 0 && (
              <span className="ml-1.5 rounded-full bg-[#3E6B5C] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                {engagementCount}
              </span>
            )}
          </Button>
          <Button
            onClick={() => setShareOpen((v) => !v)}
            variant="outline"
            size="sm"
            className={`h-9 px-3 rounded-full text-xs transition-all duration-300 ${
              shareOpen
                ? "bg-[#FFF0EE] border-[#3E6B5C] text-[#3E6B5C]"
                : "border-[#E9E6DF] text-[#1A1B18] hover:bg-[#FAF9F6]"
            }`}
          >
            <Share2 className="w-3.5 h-3.5 mr-1" />
            Share
          </Button>
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open live preview of ${invite.title}`}
            title="Open live preview"
            className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-[#E9E6DF] text-[#1A1B18] hover:bg-[#FAF9F6] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E6B5C] focus-visible:ring-offset-2"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <Button
            onClick={() => (deleteLocked ? undefined : setConfirmOpen(true))}
            disabled={deleting || deleteLocked}
            aria-disabled={deleteLocked}
            aria-label={deleteLocked ? "Delete locked until this surprise expires" : `Delete ${invite.title}`}
            variant="outline"
            size="sm"
            title={
              deleteLocked
                ? countdownTo
                  ? `Free surprises can be deleted after they expire — ${formatDistanceToNow(new Date(countdownTo))} left`
                  : "Free surprises can be deleted once they've expired (28 days after they're opened)"
                : "Delete surprise"
            }
            className={
              deleteLocked
                ? "h-9 w-9 rounded-full border-[#E9E6DF]/60 text-[#C0B5AD] bg-[#F7F2EC] p-0 cursor-not-allowed"
                : "h-9 w-9 rounded-full border-[#E9E6DF] text-[#3E6B5C] hover:bg-[#FFF0EE] p-0 transition-all duration-300"
            }
          >
            {deleteLocked ? <Lock className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
          </Button>
        </div>

        {/* D5 style picker — paid only, free sees locked buttons below */}
        {canUseDesignerArt(tier) && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-[11px] text-[#9B8E87] shrink-0">Style:</span>
            {STYLE_VARIANTS.map((v) => (
              <button
                key={v}
                onClick={() => setStyle(v)}
                className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition capitalize ${
                  style === v
                    ? "bg-[#3E6B5C] text-white border-[#3E6B5C]"
                    : "bg-white text-[#6F6E68] border-[#E9E6DF] hover:border-[#3E6B5C]"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        )}

        {/* Designer art (D1) + Story export (D3) + Collage (D4) — paid: download, free: locked upsell */}
        <div className="mt-1.5 flex flex-col gap-1.5 [&>a]:w-full">
          <DesignerArtButton slug={invite.slug} canUse={canUseDesignerArt(tier)} variant="compact" type="art" style={style} />
          <DesignerArtButton slug={invite.slug} canUse={canUseDesignerArt(tier)} variant="compact" type="story" style={style} />
          <DesignerArtButton slug={invite.slug} canUse={canUseDesignerArt(tier)} variant="compact" type="collage" style={style} />
        </div>

        {/* Free-tier delete lock — countdown to deletable */}
        {deleteLocked && (
          <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-[#9B8E87]">
            <Lock className="w-3 h-3 shrink-0" />
            {countdownTo ? (
              <span>
                Deletable in{" "}
                <span className="font-medium text-[#6F6E68]">
                  {formatDistanceToNow(new Date(countdownTo))}
                </span>{" "}
                · or{" "}
                <Link href="/pricing" className="text-[#3E6B5C] hover:underline">
                  upgrade
                </Link>{" "}
                to delete now
              </span>
            ) : (
              <span>
                Deletable 28 days after it&apos;s opened ·{" "}
                <Link href="/pricing" className="text-[#3E6B5C] hover:underline">
                  upgrade
                </Link>{" "}
                to delete anytime
              </span>
            )}
          </p>
        )}

        {/* Inline share panel */}
        <AnimatePresence>
          {shareOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={makeReducedMotionTransition(shouldReduce, {
                duration: durations.quick,
                ease: easings.entrance,
              })}
              className="overflow-hidden"
            >
              <div className="pt-4 border-t border-[#E9E6DF]/40 mt-4">
                <ShareButtons
                  slug={invite.slug}
                  title={invite.title}
                  inviteId={invite.id}
                  creatorName={creatorName}
                  acceptContributions={invite.accept_contributions ?? false}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ResponsesModal
        inviteId={invite.id}
        open={responsesOpen}
        onClose={() => setResponsesOpen(false)}
      />

      <DeleteConfirmModal
        open={confirmOpen}
        title={invite.title}
        deleting={deleting}
        onConfirm={doDelete}
        onClose={() => !deleting && setConfirmOpen(false)}
      />
    </SpotlightCard>
  );
}
