"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#C4686D", "#E8A5A8", "#C9A96E", "#E8D5A8", "#9B3D42", "#fff"];
const EMOJI = ["🎉", "✨", "🎊", "🥳"];

type Part = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  r: number;
  vr: number;
  life: number;
  color: string;
};

/**
 * Full-screen confetti engine — ported verbatim from
 * tadaaaa-app-animated_1.html (burst + tick + popCelebrate).
 * Fires popCelebrate on any `.btn-pri` click anywhere in the app.
 * Disabled under prefers-reduced-motion.
 */
export function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduced) return;

    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const parts: Part[] = [];

    function resize() {
      if (!cv) return;
      cv.width = window.innerWidth;
      cv.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    function burst(x: number, y: number, n: number, up: boolean) {
      for (let i = 0; i < n; i++) {
        const angle = up
          ? -Math.PI / 2 + (Math.random() - 0.5) * 1.8
          : Math.random() * Math.PI * 2;
        const speed = 4 + Math.random() * 7;
        parts.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (up ? 5 : 3),
          w: 5 + Math.random() * 6,
          h: 3 + Math.random() * 5,
          r: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.4,
          life: 1,
          color: COLORS[(Math.random() * COLORS.length) | 0],
        });
      }
    }

    function tick() {
      if (!cv || !ctx) return;
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        if (p.life <= 0) {
          parts.splice(i, 1);
          continue;
        }
        p.vy += 0.17;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.99;
        p.r += p.vr;
        p.life -= 0.0075;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    function popCelebrate(x: number, y: number) {
      burst(x, y, 48, true);
      for (let i = 0; i < 10; i++) {
        const d = document.createElement("div");
        d.textContent = EMOJI[(Math.random() * EMOJI.length) | 0];
        d.style.cssText =
          `position:fixed;left:${x}px;top:${y}px;font-size:${18 + Math.random() * 16}px;` +
          `pointer-events:none;z-index:9999;will-change:transform,opacity;`;
        document.body.appendChild(d);
        const dx = (Math.random() - 0.5) * 220;
        const dy = -80 - Math.random() * 160;
        d.animate(
          [
            { transform: "translate(0,0) scale(1)", opacity: 1 },
            {
              transform: `translate(${dx}px,${dy}px) scale(1.4)`,
              opacity: 0,
            },
          ],
          { duration: 900, easing: "cubic-bezier(.2,.7,.3,1)" }
        );
        setTimeout(() => d.remove(), 950);
      }
    }

    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      const b = target?.closest<HTMLElement>(".btn-pri");
      if (!b) return;
      const r = b.getBoundingClientRect();
      popCelebrate(r.left + r.width / 2, r.top + r.height / 2);
    }
    document.body.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.body.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 9998,
      }}
    />
  );
}
