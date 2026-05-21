"use client";

import { useState } from "react";
import { Eye, Trash2, ExternalLink, MessageCircleQuestion, Share2, Heart, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { formatViewCount, isExpired } from "@/lib/utils";
import { getThemeById } from "@/lib/themes";
import { toast } from "sonner";
import { deleteInvite } from "@/actions/invite";
import { APP_URL } from "@/lib/constants";
import ResponsesModal from "@/components/dashboard/ResponsesModal";
import ShareButtons from "@/components/dashboard/ShareButtons";

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
  };
}

export default function InviteCard({ invite }: InviteCardProps) {
  const [deleting, setDeleting] = useState(false);
  const [responsesOpen, setResponsesOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const theme = getThemeById(invite.theme);
  const expired = isExpired(invite.expires_at);
  const link = `${APP_URL}/surprise/${invite.slug}`;

  async function handleDelete() {
    if (!confirm("Delete this surprise? This cannot be undone.")) return;
    setDeleting(true);
    const result = await deleteInvite(invite.id);
    if (result?.error) {
      toast.error(result.error);
      setDeleting(false);
    }
  }

  const status = !invite.is_active
    ? "inactive"
    : expired
    ? "expired"
    : "active";

  return (
    <div className="bg-white rounded-3xl shadow-[0_4px_24px_rgba(45,41,38,0.06)] border border-[#D4CBC3]/30 overflow-hidden transition-all duration-300 hover:shadow-[0_12px_40px_rgba(45,41,38,0.12)] hover:-translate-y-1.5 group">
      {/* Thumbnail preview */}
      <div
        className="h-28 flex items-center justify-center relative overflow-hidden"
        style={{
          background: theme?.colors.background
            ? `linear-gradient(135deg, ${theme.colors.background} 0%, ${theme.colors.accent}22 100%)`
            : "linear-gradient(135deg, #FFF0E8 0%, #F5E6E0 100%)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: theme?.colors.accent || "#C4686D" }}
          >
            <Heart className="w-7 h-7 fill-white text-white" />
          </div>
          <div
            className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: `${theme?.colors.accent || "#C4686D"}20`, color: theme?.colors.accent || "#C4686D" }}
          >
            {invite.reveal_type === "tap" ? "✨ Tap reveal" : "⏱ Countdown"}
          </div>
        </div>
      </div>

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-heading text-lg text-[#2D2926] truncate">{invite.title}</h3>
            <p className="text-[#6B5E57] text-xs mt-0.5">
              {theme?.name || invite.theme}
            </p>
          </div>
          <Badge
            className={`ml-2 shrink-0 text-xs rounded-full px-2.5 ${
              status === "active"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-[#D4CBC3]/40 text-[#6B5E57] border-[#D4CBC3]"
            }`}
            variant="outline"
          >
            {status}
          </Badge>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 mb-4 text-sm text-[#6B5E57] bg-[#FFF8F0] rounded-xl px-3 py-2">
          <span className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-[#C4686D]" />
            <span className="font-semibold text-[#2D2926]">{formatViewCount(invite.view_count)}</span>
            <span className="text-xs">views</span>
          </span>
          <div className="w-px h-3.5 bg-[#D4CBC3]" />
          <span className="flex items-center gap-1.5" title="RSVPs">
            <Heart className="w-3.5 h-3.5 text-[#C4686D]" />
            <span className="font-semibold text-[#2D2926]">{invite.rsvp_count ?? 0}</span>
            <span className="text-xs">RSVPs</span>
          </span>
          <div className="w-px h-3.5 bg-[#D4CBC3]" />
          <span className="flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5 text-[#C9A96E]" />
            <span className="font-semibold text-[#2D2926]">{invite.response_count ?? 0}</span>
            <span className="text-xs">responses</span>
          </span>
          <div className="w-px h-3.5 bg-[#D4CBC3]" />
          <span className="text-xs">
            {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={() => setShareOpen((v) => !v)}
            variant="outline"
            size="sm"
            className={`flex-1 h-9 rounded-full text-xs transition-all duration-300 ${
              shareOpen
                ? "bg-[#FFF0EE] border-[#C4686D] text-[#C4686D]"
                : "border-[#D4CBC3] text-[#2D2926] hover:bg-[#FFF8F0]"
            }`}
          >
            <Share2 className="w-3.5 h-3.5 mr-1" />
            Share
          </Button>
          <Button
            onClick={() => setResponsesOpen(true)}
            variant="outline"
            size="sm"
            title="View responses"
            className="h-9 w-9 rounded-full border-[#D4CBC3] text-[#6B5E57] hover:bg-[#FFF8F0] p-0 transition-all duration-300"
          >
            <MessageCircleQuestion className="w-3.5 h-3.5" />
          </Button>
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-[#D4CBC3] text-[#2D2926] hover:bg-[#FFF8F0] transition-all duration-300"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <Button
            onClick={handleDelete}
            disabled={deleting}
            variant="outline"
            size="sm"
            className="h-9 w-9 rounded-full border-[#D4CBC3] text-[#C4686D] hover:bg-[#FFF0EE] p-0 transition-all duration-300"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Inline share panel */}
        <AnimatePresence>
          {shareOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="pt-4 border-t border-[#D4CBC3]/40 mt-4">
                <ShareButtons slug={invite.slug} title={invite.title} inviteId={invite.id} />
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
    </div>
  );
}
