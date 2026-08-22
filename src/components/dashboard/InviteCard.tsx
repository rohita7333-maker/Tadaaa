"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Trash2,
  ArrowUpRight,
  MessageCircleQuestion,
  Share2,
  Lock,
  ChevronDown,
} from "lucide-react";
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
import { DesignerArtButton } from "@/components/surprise/DesignerArtButton";
import { canUseDesignerArt, type StyleVariant, STYLE_VARIANTS } from "@/lib/designer-art";
import { deriveInviteStatus } from "@/lib/invite-status";

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
    countdown_date?: string | null;
  };
  creatorName?: string;
  /** Viewer's active tier — gates whether a live surprise can be deleted. */
  tier?: "free" | "plus" | "unlimited";
  /** Called after successful delete so parent can animate removal. */
  onDelete?: () => void;
}

/**
 * One surprise, as the mockup's `.srow` (tadaaaa-editorial.html:262-274):
 * 60px thumbnail · title · status pill + counts · a strip of 38px icon buttons.
 *
 * The mockup's demo rows carry four static actions. Ours carry the same four
 * shapes (insights · share · open · delete) plus a drawer, because a real
 * surprise has share targets, paid export art and a free-tier delete gate that
 * a static mockup has no equivalent for.
 */
export default function InviteCard({ invite, creatorName, tier = "free", onDelete }: InviteCardProps) {
  const shouldReduce = useReducedMotion();
  const [deleting, setDeleting] = useState(false);
  const [style, setStyle] = useState<StyleVariant>("classic");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [responsesOpen, setResponsesOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
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

  // Badge on the insights action — how much there actually is to look at.
  const engagementCount = (invite.rsvp_count ?? 0) + (invite.response_count ?? 0);

  // Single source of lifecycle truth. `invites.status` does not exist yet;
  // see src/lib/invite-status.ts for the swap-in note.
  const status = deriveInviteStatus({
    expiresAt: invite.expires_at,
    isActive: invite.is_active,
    countdownDate: invite.countdown_date ?? null,
  });

  return (
    <div className="ed-srow">
      {/* Thumbnail — opens the live preview, exactly as the mockup's `.th` does */}
      <Link
        href={`/surprise/${invite.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${invite.title} preview`}
        className="ed-th"
        style={{
          background: theme?.colors.background
            ? `linear-gradient(135deg, ${theme.colors.background} 0%, ${theme.colors.accent}33 100%)`
            : undefined,
        }}
      >
        <span
          className="font-heading text-lg leading-none"
          style={{ color: theme?.colors.accent || "var(--coral)" }}
          aria-hidden="true"
        >
          {invite.title.trim().charAt(0).toUpperCase() || "T"}
        </span>
      </Link>

      <div className="ed-m">
        <Link
          href={`/surprise/${invite.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block focus:outline-none focus:underline"
        >
          <h3 className="truncate">{invite.title}</h3>
        </Link>
        <div className="ed-meta">
          <span className={`ed-pill ed-pill-${status}`}>{status}</span>
          <span title="Times this surprise page was opened — your own previews don't count">
            {formatViewCount(invite.view_count)} views
          </span>
          <span title="Guests who tapped “I'm in!” to confirm">
            {invite.rsvp_count ?? 0} RSVPs
          </span>
          <span title="Answers to the yes/no questions you added">
            {invite.response_count ?? 0} answers
          </span>
          <span className="hidden sm:inline">
            {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>

      <div className="ed-acts">
        <button
          type="button"
          onClick={() => setResponsesOpen(true)}
          className="ed-ib relative"
          title="See who opened, who RSVP'd, and what they answered"
          aria-label={`Insights for ${invite.title}`}
        >
          <MessageCircleQuestion strokeWidth={1.6} />
          {engagementCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] rounded-full bg-coral px-1 text-[10px] font-bold leading-4 text-white">
              {engagementCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setDrawerOpen((v) => !v)}
          className="ed-ib"
          aria-expanded={drawerOpen}
          title="Share, and download art"
          aria-label={`Share ${invite.title}`}
        >
          <Share2 strokeWidth={1.6} />
        </button>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="ed-ib"
          title="Open live preview"
          aria-label={`Open live preview of ${invite.title}`}
        >
          <ArrowUpRight strokeWidth={1.6} />
        </a>
        <button
          type="button"
          onClick={() => (deleteLocked ? undefined : setConfirmOpen(true))}
          disabled={deleting || deleteLocked}
          aria-disabled={deleteLocked}
          className="ed-ib"
          aria-label={
            deleteLocked
              ? "Delete locked until this surprise expires"
              : `Delete ${invite.title}`
          }
          title={
            deleteLocked
              ? countdownTo
                ? `Free surprises can be deleted after they expire — ${formatDistanceToNow(new Date(countdownTo))} left`
                : "Free surprises can be deleted once they've expired (28 days after they're opened)"
              : "Delete surprise"
          }
        >
          {deleteLocked ? <Lock strokeWidth={1.6} /> : <Trash2 strokeWidth={1.6} />}
        </button>
      </div>

      {/* Drawer — share targets, paid export art, and the free-tier delete gate.
          Spans the full row, so it sits outside the flex flow. */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={makeReducedMotionTransition(shouldReduce, {
              duration: durations.quick,
              ease: easings.entrance,
            })}
            className="w-full basis-full overflow-hidden"
          >
            <div className="border-t border-mist pt-4 mt-3 pb-1">
              <ShareButtons
                slug={invite.slug}
                title={invite.title}
                inviteId={invite.id}
                creatorName={creatorName}
                acceptContributions={invite.accept_contributions ?? false}
              />

              {canUseDesignerArt(tier) && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="label text-[11px]">Style</span>
                  {STYLE_VARIANTS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setStyle(v)}
                      className={`ed-chip capitalize !min-h-0 !px-3 !py-1 !text-xs ${
                        style === v ? "ed-chip-on" : ""
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-3 flex flex-col gap-1.5 [&>a]:w-full">
                <DesignerArtButton slug={invite.slug} canUse={canUseDesignerArt(tier)} variant="compact" type="art" style={style} />
                <DesignerArtButton slug={invite.slug} canUse={canUseDesignerArt(tier)} variant="compact" type="story" style={style} />
                <DesignerArtButton slug={invite.slug} canUse={canUseDesignerArt(tier)} variant="compact" type="collage" style={style} />
              </div>

              {deleteLocked && (
                <p className="mt-3 flex items-center gap-1.5 text-[11px] text-stone">
                  <Lock className="w-3 h-3 shrink-0" strokeWidth={1.6} />
                  {countdownTo ? (
                    <span>
                      Deletable in{" "}
                      <span className="font-medium text-ink">
                        {formatDistanceToNow(new Date(countdownTo))}
                      </span>{" "}
                      · or{" "}
                      <Link href="/pricing" className="ed-tlink !text-[11px]">
                        upgrade
                      </Link>{" "}
                      to delete now
                    </span>
                  ) : (
                    <span>
                      Deletable 28 days after it&apos;s opened ·{" "}
                      <Link href="/pricing" className="ed-tlink !text-[11px]">
                        upgrade
                      </Link>{" "}
                      to delete anytime
                    </span>
                  )}
                </p>
              )}

              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-stone hover:text-ink"
              >
                <ChevronDown className="w-3.5 h-3.5 rotate-180" strokeWidth={1.6} />
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
    </div>
  );
}
