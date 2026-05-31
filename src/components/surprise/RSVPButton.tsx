"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type Theme } from "@/lib/themes";
import { Heart } from "lucide-react";
import Link from "next/link";
import FloatingPhotos from "./FloatingPhotos";

interface RSVPButtonProps {
  theme: Theme;
  title: string;
  photos?: { url: string; caption?: string; rotation_deg?: number }[];
  inviteId?: string;
}

const VISITOR_TOKEN_KEY = "tadaaaa.visitor_token";

function getVisitorToken(): string {
  if (typeof window === "undefined") return "";
  try {
    let token = window.localStorage.getItem(VISITOR_TOKEN_KEY);
    if (!token) {
      token =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem(VISITOR_TOKEN_KEY, token);
    }
    return token;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

async function postRsvp(
  inviteId: string,
  visitorToken: string,
  name?: string,
  attempts = 3
): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch("/api/invite/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId, visitorToken, name }),
      });
      if (res.ok) return true;
      if (res.status >= 400 && res.status < 500 && res.status !== 429) return false;
    } catch {
      // network — retry
    }
    await new Promise((r) => setTimeout(r, 400 * (i + 1)));
  }
  return false;
}

export default function RSVPButton({ theme, title, photos = [], inviteId }: RSVPButtonProps) {
  const [tapped, setTapped] = useState(false);
  const [name, setName] = useState("");
  const firedRef = useRef(false);
  void title;

  async function fireConfetti() {
    const confetti = (await import("canvas-confetti")).default;

    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
      colors: [theme.colors.accent, theme.colors.accentLight, "#ffffff", "#FFD700"],
    });

    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: [theme.colors.accent, theme.colors.accentLight, "#ffffff"],
      });
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: [theme.colors.accent, theme.colors.accentLight, "#ffffff"],
      });
    }, 200);
  }

  function handleTap() {
    if (firedRef.current) return;
    firedRef.current = true;

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([50, 30, 80, 30, 100]);
    }
    setTapped(true);
    fireConfetti();

    if (inviteId) {
      const token = getVisitorToken();
      const trimmed = name.trim();
      void postRsvp(inviteId, token, trimmed || undefined);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-8 relative overflow-hidden"
      style={{ background: theme.colors.background }}
    >
      <FloatingPhotos photos={photos} screenIndex={200} />

      <div className="relative text-center" style={{ zIndex: 20 }}>
        <motion.div
          animate={tapped ? { scale: [1, 1.4, 1], rotate: [0, -15, 15, 0] } : {}}
          transition={{ duration: 0.6 }}
        >
          <Heart
            className="w-16 h-16 mx-auto mb-6"
            style={{
              fill: tapped ? theme.colors.accent : "transparent",
              color: theme.colors.accent,
            }}
          />
        </motion.div>

        <AnimatePresence mode="wait">
          {tapped ? (
            <motion.div
              key="tapped"
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <h2
                className="font-heading text-3xl mb-3"
                style={{ color: theme.colors.text }}
              >
                Can&apos;t wait! 🎉
              </h2>
              <p className="opacity-60 text-sm" style={{ color: theme.colors.text }}>
                Get ready for something special
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="pre"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <h2
                className="font-heading text-3xl mb-3"
                style={{ color: theme.colors.text }}
              >
                Let&apos;s celebrate together!
              </h2>
              <p
                className="opacity-60 text-sm mb-8"
                style={{ color: theme.colors.text }}
              >
                Tap below to confirm you&apos;re in
              </p>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder="Your name (optional)"
                aria-label="Your name (optional)"
                className="w-56 max-w-full mx-auto mb-5 block h-11 px-4 rounded-full text-center text-sm bg-white/70 backdrop-blur-sm border outline-none transition-all duration-300 focus:bg-white focus:scale-[1.02]"
                style={{
                  color: theme.colors.text,
                  borderColor: `${theme.colors.accent}40`,
                }}
              />
              <motion.button
                onClick={handleTap}
                className="h-14 px-10 rounded-full text-white text-base font-medium shadow-lg pulse-glow"
                style={{ background: theme.colors.accent }}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
              >
                I&apos;m in! 🎊
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className="fixed bottom-6 left-0 right-0 flex flex-col items-center gap-2"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.5 }}
        >
          <p className="text-xs opacity-40" style={{ color: theme.colors.text }}>
            Want to surprise someone you love?
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full border transition-all duration-300 hover:scale-105"
            style={{
              color: theme.colors.accent,
              borderColor: `${theme.colors.accent}40`,
              background: `${theme.colors.accent}10`,
            }}
          >
            <Heart className="w-3 h-3 fill-current" />
            Create your own with TaDaaaa — free
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
