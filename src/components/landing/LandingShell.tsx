"use client";

import { useState, useEffect, useCallback } from "react";
import CraftingIntro from "./CraftingIntro";

const STORAGE_KEY = "tadaaaa_intro_seen";

export default function LandingShell({ children }: { children: React.ReactNode }) {
  // SSR + first client render = same output (no intro). After mount, read
  // sessionStorage and conditionally show. Two-render pattern avoids
  // hydration mismatch.
  const [showIntro, setShowIntro] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);

  useEffect(() => {
    // External-state sync from sessionStorage. setState-in-effect is correct
    // here — pre-mount render must match SSR (false/false) to avoid the
    // hydration mismatch we hit when reading storage in the useState
    // initializer. ESLint rule disabled with this rationale documented.
    try {
      if (!sessionStorage.getItem(STORAGE_KEY)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShowIntro(true);
      } else {
        setIntroComplete(true);
      }
    } catch {
      setIntroComplete(true);
    }
  }, []);

  const handleComplete = useCallback(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setIntroComplete(true);
  }, []);

  return (
    <main>
      {showIntro && !introComplete && <CraftingIntro onComplete={handleComplete} />}
      {children}
    </main>
  );
}
