"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, Share2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { APP_URL } from "@/lib/constants";

interface ShareButtonsProps {
  slug: string;
  title: string;
  inviteId?: string;
}

// Posthog is loaded lazily via the snippet in layout.tsx after cookie consent.
// We probe the global rather than importing posthog-js directly so that the
// capture truly no-ops when the user hasn't accepted cookies (or no key set).
type PosthogGlobal = { capture?: (event: string, props?: Record<string, unknown>) => void };
function capture(event: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const ph = (window as unknown as { posthog?: PosthogGlobal }).posthog;
  if (!ph || typeof ph.capture !== "function") return;
  try {
    ph.capture(event, props);
  } catch {
    // never break the share UX over an analytics failure
  }
}

export default function ShareButtons({ slug, title, inviteId }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const url = `${APP_URL}/surprise/${slug}`;
  const waText = encodeURIComponent(`💌 ${title} — Someone made something special for you! Open this: ${url}`);
  const isMobile = typeof navigator !== "undefined" && /Mobi|Android/i.test(navigator.userAgent);
  const waHref = isMobile
    ? `https://api.whatsapp.com/send?text=${waText}`
    : `https://web.whatsapp.com/send?text=${waText}`;

  function trackShare(channel: string) {
    capture("invite_shared", { channel, inviteId, slug });
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied!");
    trackShare("copy");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
        trackShare("native");
        return;
      } catch {
        // user cancelled — fall through to copy
      }
    }
    handleCopy();
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {/* WhatsApp */}
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackShare("whatsapp")}
          className="flex items-center justify-center gap-2 h-11 rounded-full text-white text-sm font-medium shadow-sm transition-all duration-200 hover:opacity-90 active:scale-95"
          style={{ background: "#25D366" }}
        >
          {/* WhatsApp icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.553 4.103 1.522 5.83L0 24l6.336-1.498A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.003-1.371l-.36-.214-3.727.88.895-3.638-.234-.374A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
          </svg>
          WhatsApp
        </a>

        {/* Native share / copy */}
        <button
          onClick={handleShare}
          className="flex items-center justify-center gap-2 h-11 rounded-full text-white text-sm font-medium shadow-sm transition-all duration-200 hover:opacity-90 active:scale-95"
          style={{ background: "linear-gradient(135deg, #C4686D 0%, #9B3D42 100%)" }}
        >
          <Share2 className="w-4 h-4" />
          Share
        </button>

        {/* Copy link */}
        <Button
          onClick={handleCopy}
          variant="outline"
          className="h-11 rounded-full border-[#D4CBC3] text-[#2D2926] hover:bg-[#FFF8F0] text-sm transition-all duration-200"
        >
          {copied ? <Check className="w-4 h-4 mr-2 text-[#6B8F71]" /> : <Copy className="w-4 h-4 mr-2" />}
          {copied ? "Copied!" : "Copy link"}
        </Button>

        {/* QR toggle */}
        <Button
          onClick={() => setShowQR((v) => !v)}
          variant="outline"
          className={`h-11 rounded-full border-[#D4CBC3] text-sm transition-all duration-200 ${
            showQR ? "bg-[#FFF0EE] border-[#C4686D] text-[#C4686D]" : "text-[#2D2926] hover:bg-[#FFF8F0]"
          }`}
        >
          <QrCode className="w-4 h-4 mr-2" />
          QR Code
        </Button>
      </div>

      {/* QR panel */}
      <AnimatePresence>
        {showQR && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-2 border-dashed border-[#D4CBC3] rounded-2xl p-5 flex flex-col items-center gap-3 bg-white">
              <QRCodeSVG
                value={url}
                size={180}
                bgColor="#ffffff"
                fgColor="#2D2926"
                level="M"
              />
              <p className="text-xs text-[#6B5E57] text-center">
                Scan to open the surprise
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-center text-xs text-[#6B5E57] opacity-70">
        Share via WhatsApp for best results 💚
      </p>
    </div>
  );
}
