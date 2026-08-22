"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { StoryConfig } from "@/lib/scroll-story/config";
import { getVisitorToken, postRsvp } from "@/lib/rsvp-client";
import SkyHero from "./SkyHero";
import MessageScene from "./MessageScene";
import PlanScene from "./PlanScene";
import PolaroidScene from "./PolaroidScene";
import RsvpScene from "./RsvpScene";
import FinaleScene from "./FinaleScene";
import { FINALE_NIGHT, FOCUS_RING_CLASS } from "./shared";

// Soft arpeggio — C5 E5 G5 B5 sine chimes.
const NOTE_FREQS = [523.25, 659.25, 783.99, 987.77] as const;
const ARPEGGIO_STEP_MS = 450;
const MASTER_GAIN = 0.05;
const NOTE_ATTACK_S = 0.02;
const NOTE_RELEASE_S = 1.1;

interface AudioHandle {
  ctx: AudioContext;
  timer: number;
}

interface ScrollStoryRevealProps {
  config: StoryConfig;
  /** Real invite id — when present the reveal records RSVPs to the API. */
  inviteId?: string;
  /**
   * Explicit RSVP handler. Takes precedence over `inviteId`; the demo passes
   * neither, so RsvpScene fires local confetti only. `name` is whatever the
   * guest typed into the optional name field (undefined when skipped).
   */
  onRsvp?: (name?: string) => Promise<void>;
}

/**
 * Scroll Story reveal — six scrollytelling scenes in order, a music toggle
 * (WebAudio starts ONLY after a user tap) and a free-tier attribution pill.
 */
export default function ScrollStoryReveal({
  config,
  inviteId,
  onRsvp,
}: ScrollStoryRevealProps) {
  const [isMusicOn, setIsMusicOn] = useState(false);
  const audioRef = useRef<AudioHandle | null>(null);

  // When a real invite id is present but no explicit handler was given, build
  // the RSVP handler from the shared visitor-token + retry path (same as the
  // tap/countdown reveals). Throws on failure so RsvpScene can re-arm its
  // button and show the retry message.
  const effectiveOnRsvp = useMemo<((name?: string) => Promise<void>) | undefined>(() => {
    if (onRsvp) return onRsvp;
    if (!inviteId) return undefined;
    return async (name?: string) => {
      const token = getVisitorToken();
      const ok = await postRsvp(inviteId, token, name);
      if (!ok) throw new Error("RSVP failed");
    };
  }, [onRsvp, inviteId]);

  function stopMusic() {
    const handle = audioRef.current;
    if (!handle) return;
    window.clearInterval(handle.timer);
    void handle.ctx.close();
    audioRef.current = null;
  }

  function startMusic() {
    const ctx = new AudioContext();
    void ctx.resume();
    const master = ctx.createGain();
    master.gain.value = MASTER_GAIN;
    master.connect(ctx.destination);

    let step = 0;
    const playNote = () => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = NOTE_FREQS[step % NOTE_FREQS.length];
      const envelope = ctx.createGain();
      envelope.gain.setValueAtTime(0, ctx.currentTime);
      envelope.gain.linearRampToValueAtTime(1, ctx.currentTime + NOTE_ATTACK_S);
      envelope.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + NOTE_RELEASE_S
      );
      osc.connect(envelope);
      envelope.connect(master);
      osc.start();
      osc.stop(ctx.currentTime + NOTE_RELEASE_S + 0.1);
      step += 1;
    };

    playNote();
    const timer = window.setInterval(playNote, ARPEGGIO_STEP_MS);
    audioRef.current = { ctx, timer };
  }

  function handleMusicToggle() {
    if (isMusicOn) {
      stopMusic();
      setIsMusicOn(false);
    } else {
      startMusic();
      setIsMusicOn(true);
    }
  }

  // Stop audio on unmount.
  useEffect(() => {
    return () => {
      const handle = audioRef.current;
      if (!handle) return;
      window.clearInterval(handle.timer);
      void handle.ctx.close();
      audioRef.current = null;
    };
  }, []);

  return (
    <div className="relative" style={{ backgroundColor: FINALE_NIGHT }}>
      <button
        type="button"
        onClick={handleMusicToggle}
        aria-pressed={isMusicOn}
        aria-label={isMusicOn ? "Pause music" : "Play music"}
        className={`fixed right-5 top-[14px] z-50 flex h-11 w-11 items-center justify-center rounded-full text-[15px] backdrop-blur-[6px] transition-transform duration-200 hover:scale-105 active:scale-95 ${FOCUS_RING_CLASS}`}
        style={{
          backgroundColor: "rgba(255,254,253,0.14)",
          color: "var(--paper)",
        }}
      >
        {isMusicOn ? "❚❚" : "♪"}
      </button>

      <SkyHero config={config} />
      <MessageScene config={config} />
      <PlanScene config={config} />
      <PolaroidScene config={config} />
      <RsvpScene config={config} onRsvp={effectiveOnRsvp} />
      <FinaleScene config={config} />

      {config.tier === "free" && (
        <Link
          href="/templates"
          className={`fixed bottom-4 left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-2 text-[11px] backdrop-blur-[8px] ${FOCUS_RING_CLASS}`}
          style={{
            backgroundColor: "rgba(26,26,26,0.65)",
            color: "rgba(255,254,253,0.75)",
          }}
        >
          Made with TaDaaaa · <span style={{ color: "var(--sand)" }}>Create your own →</span>
        </Link>
      )}
    </div>
  );
}
