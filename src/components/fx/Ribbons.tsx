"use client";

import { useEffect, useRef } from "react";

const COLS = ["#3E6B5C", "#A8C3B4", "#8A6F35", "#E8D9BD", "#2E5145", "#FFFFFF"];

/**
 * Ambient falling ribbons — a fixed full-screen layer of ~26 small colored
 * rectangles drifting down and rotating. Present on every screen.
 * Ported verbatim from tadaaaa-app-animated_1.html (spawnRibbons + .ribbons CSS).
 * Disabled under prefers-reduced-motion.
 */
export function Ribbons() {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (box.childElementCount > 0) return;

    for (let i = 0; i < 26; i++) {
      const s = document.createElement("i");
      const w = 6 + Math.random() * 9;
      s.style.cssText =
        `left:${Math.random() * 100}vw;width:${w}px;height:${w * 0.55}px;` +
        `background:${COLS[i % COLS.length]};` +
        `animation-duration:${8 + Math.random() * 9}s;` +
        `animation-delay:-${Math.random() * 12}s;`;
      box.appendChild(s);
    }
  }, []);

  return <div ref={boxRef} className="ribbons" aria-hidden="true" />;
}
