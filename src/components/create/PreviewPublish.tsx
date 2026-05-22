"use client";

import { useState } from "react";
import { Check, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getThemeById } from "@/lib/themes";
import { APP_URL } from "@/lib/constants";
import type { PhotoFile } from "./PhotoUploader";
import ShareButtons from "@/components/dashboard/ShareButtons";
import VideoGenerator from "./VideoGenerator";

interface PreviewPublishProps {
  title: string;
  message: string;
  theme: string;
  revealType: "tap" | "countdown";
  photos: PhotoFile[];
  tier?: string;
  acceptContributions?: boolean;
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
  onPublish,
}: PreviewPublishProps) {
  const [publishing, setPublishing] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [publishedInviteId, setPublishedInviteId] = useState<string | null>(null);

  const themeData = getThemeById(theme);
  const firstPhoto = photos[0];
  const link = publishedSlug ? `${APP_URL}/surprise/${publishedSlug}` : "";

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

  if (publishedSlug) {
    return (
      <div className="text-center py-8">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#6B8F71] to-[#4a6b50] flex items-center justify-center mx-auto mb-6 shadow-[0_4px_24px_rgba(107,143,113,0.3)]">
          <Check className="w-10 h-10 text-white" />
        </div>
        <h2 className="font-heading text-3xl text-[#2D2926] mb-2">
          Your surprise is ready! ✨
        </h2>
        <p className="text-[#6B5E57] mb-8 max-w-xs mx-auto">
          Share this link with the lucky person. They&apos;ll have no idea what&apos;s waiting for them!
        </p>

        {/* Link box */}
        <div className="bg-[#FFF8F0] border border-[#D4CBC3]/60 rounded-2xl p-4 mb-6 max-w-sm mx-auto">
          <p className="text-[#6B5E57] text-xs mb-2 font-medium uppercase tracking-wider">
            Shareable link
          </p>
          <p className="text-[#2D2926] text-sm font-medium break-all">{link}</p>
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
            className="inline-flex items-center h-10 px-5 rounded-full border border-[#D4CBC3] text-[#2D2926] hover:bg-[#FFF8F0] transition-all duration-300 text-sm font-medium"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Preview
          </a>
        </div>

        <a
          href="/dashboard"
          className="block mt-5 text-[#6B5E57] hover:text-[#2D2926] text-sm text-center transition-colors"
        >
          ← Back to dashboard
        </a>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-heading text-2xl text-[#2D2926] mb-2">Preview & Publish</h2>
      <p className="text-[#6B5E57] mb-8">
        Here&apos;s how your surprise will look. Ready to share?
      </p>

      {/* Phone preview */}
      <div className="flex justify-center mb-8">
        <div className="relative w-[200px] h-[400px] bg-[#1a1a1a] rounded-[32px] shadow-[0_24px_60px_rgba(45,41,38,0.2)] overflow-hidden border-4 border-[#2D2926]/20">
          <div
            className="w-full h-full flex flex-col items-center justify-center relative"
            style={{ background: themeData?.colors.background }}
          >
            {firstPhoto ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={firstPhoto.preview}
                  alt="Preview"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div
                  className="absolute inset-0"
                  style={{ background: themeData?.colors.overlay }}
                />
              </>
            ) : null}
            <div className="relative z-10 text-center px-4">
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
                {revealType === "tap" ? "Tap to open ✨" : "Countdown reveal ⏱"}
              </p>
            </div>
          </div>
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-16 h-4 bg-[#2D2926]/20 rounded-full" />
        </div>
      </div>

      {/* Summary */}
      <div className="bg-[#FFF8F0] rounded-2xl p-5 mb-6 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[#6B5E57]">Theme</span>
          <span className="text-[#2D2926] font-medium">{themeData?.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#6B5E57]">Photos</span>
          <span className="text-[#2D2926] font-medium">{photos.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#6B5E57]">Reveal</span>
          <span className="text-[#2D2926] font-medium capitalize">{revealType}</span>
        </div>
      </div>

      <Button
        onClick={handlePublish}
        disabled={publishing}
        className="w-full h-14 rounded-full bg-gradient-to-r from-[#C4686D] to-[#9B3D42] hover:from-[#9B3D42] hover:to-[#C4686D] text-white text-base font-medium transition-all duration-300 hover:scale-[1.02] shadow-lg pulse-glow"
      >
        {publishing ? (
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
        ) : (
          "✨ "
        )}
        {publishing ? "Publishing…" : "Publish Your Surprise"}
      </Button>
    </div>
  );
}
