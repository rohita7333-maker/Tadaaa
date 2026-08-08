"use client";

import { getThemeById } from "@/lib/themes";
import TapToReveal from "@/components/surprise/TapToReveal";
import CountdownReveal from "@/components/surprise/CountdownReveal";
import ScrollStoryReveal from "@/components/surprise/scrollstory/ScrollStoryReveal";
import { demoConfig } from "@/lib/scroll-story/config";
import { useState } from "react";

const MOCK_QUESTIONS = [
  { id: "q1", question_text: "Will you have lunch with me this Sunday?", yes_label: "Yes!", no_label: "No", require_answer: true },
  { id: "q2", question_text: "Should we make this a monthly tradition?", yes_label: "Absolutely!", no_label: "Nah", require_answer: false },
];

const MOCK_PHOTOS = [
  { url: "https://picsum.photos/seed/tadaaa1/800/1200", caption: "Our first memory together ✨", rotation_deg: -2 },
  { url: "https://picsum.photos/seed/tadaaa2/800/1200", caption: "That day I'll never forget", rotation_deg: 2.5 },
  { url: "https://picsum.photos/seed/tadaaa3/800/1200", caption: "So much happiness 💛", rotation_deg: -1.5 },
];

const THEMES = ["warm-embrace", "golden-hour", "midnight-romance", "garden-party", "velvet-night", "cotton-candy"];
const MODES = ["tap", "countdown", "scroll"] as const;

export default function TestSurprisePage() {
  const [themeId, setThemeId] = useState("warm-embrace");
  const [mode, setMode] = useState<(typeof MODES)[number]>("tap");
  const [started, setStarted] = useState(false);
  // Stamped at the moment the user presses Start — keeps Date.now() out of render.
  const [countdownDate, setCountdownDate] = useState("");

  const theme = getThemeById(themeId)!;

  // Scroll story needs window scrolling (parallax), so it renders as a
  // normal document flow instead of inside a fixed viewport.
  if (started && mode === "scroll") {
    return (
      <div className="relative">
        <button
          onClick={() => setStarted(false)}
          className="fixed top-3 left-3 z-50 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full"
        >
          ← back to picker
        </button>
        <ScrollStoryReveal config={demoConfig} />
      </div>
    );
  }

  if (started) {
    return (
      <div className="fixed inset-0">
        <button
          onClick={() => setStarted(false)}
          className="fixed top-3 right-3 z-50 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full"
        >
          ← back to picker
        </button>
        {mode === "countdown" ? (
          <CountdownReveal
            theme={theme}
            photos={MOCK_PHOTOS}
            title="Happy Mother's Day, Mom ❤️"
            message="Every day I am grateful to have you in my life. You are my strength, my inspiration, and my biggest cheerleader. Thank you for everything you do. I love you more than words can say."
            countdownDate={countdownDate}
            questions={MOCK_QUESTIONS}
            inviteId="test"
          />
        ) : (
          <TapToReveal
            theme={theme}
            photos={MOCK_PHOTOS}
            title="Happy Mother's Day, Mom ❤️"
            message="Every day I am grateful to have you in my life. You are my strength, my inspiration, and my biggest cheerleader. Thank you for everything you do. I love you more than words can say."
            questions={MOCK_QUESTIONS}
            inviteId="test"
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex flex-col items-center justify-center p-8">
      <h1 className="font-heading text-3xl text-[#2D2926] mb-2">Surprise Page — Test</h1>
      <p className="text-[#6B5E57] mb-8 text-sm">Pick theme + mode, then preview the full experience</p>

      <div className="bg-white rounded-3xl shadow-[0_4px_24px_rgba(45,41,38,0.08)] p-8 w-full max-w-md space-y-6">
        {/* Theme picker */}
        <div>
          <p className="text-[#2D2926] font-medium text-sm mb-3">Theme</p>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map((id) => {
              const t = getThemeById(id)!;
              return (
                <button
                  key={id}
                  onClick={() => setThemeId(id)}
                  className={`rounded-xl overflow-hidden border-2 transition-all ${
                    themeId === id ? "border-[#C4686D]" : "border-transparent"
                  }`}
                >
                  <div className="h-10" style={{ background: t.colors.background }} />
                  <p className="text-[10px] text-[#6B5E57] py-1 px-1 truncate bg-white">{t.name}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mode picker */}
        <div>
          <p className="text-[#2D2926] font-medium text-sm mb-3">Reveal mode</p>
          <div className="grid grid-cols-2 gap-3">
            {MODES.map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`py-3 rounded-xl border-2 text-sm font-medium transition-all capitalize ${
                  mode === m
                    ? "border-[#C4686D] bg-[#FFF0EE] text-[#C4686D]"
                    : "border-[#D4CBC3] text-[#6B5E57]"
                }`}
              >
                {m === "tap" ? "👆 Tap to reveal" : m === "countdown" ? "⏱ Countdown (30s)" : "📜 Scroll story"}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            setCountdownDate(new Date(Date.now() + 30 * 1000).toISOString());
            setStarted(true);
          }}
          className="w-full h-12 rounded-full bg-gradient-to-r from-[#C4686D] to-[#9B3D42] text-white font-medium text-sm hover:opacity-90 transition-opacity"
        >
          Preview Surprise ✨
        </button>
      </div>
    </div>
  );
}
