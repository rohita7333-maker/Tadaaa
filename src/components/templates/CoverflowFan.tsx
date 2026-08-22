"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { templates } from "@/lib/templates";
import { getThemeById, occasions } from "@/lib/themes";
import { cssEasings } from "@/lib/motion";
import { fanSlot, wrapOffset } from "./coverflow-math";
import { coverBackground } from "./cover-style";

const FAN_COUNT = 7;
const AUTO_ADVANCE_MS = 3500;
const DRAG_THRESHOLD_PX = 40;
const DEFAULT_TRACK_WIDTH = 1024;

const fanTemplates = templates.slice(0, FAN_COUNT);
const occasionLabelById = new Map(occasions.map((o) => [o.id, o.label]));

export default function CoverflowFan() {
  const reducedMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef<number | null>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [trackWidth, setTrackWidth] = useState(DEFAULT_TRACK_WIDTH);

  const step = useCallback((dir: number) => {
    setActive((a) => (a + dir + FAN_COUNT) % FAN_COUNT);
  }, []);

  // Resize-safe: re-measure the track via ResizeObserver, rAF-throttled.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let raf = 0;
    const observer = new ResizeObserver((entries) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const width = entries[entries.length - 1]?.contentRect.width;
        setTrackWidth(width ?? el.offsetWidth);
      });
    });
    observer.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  // Auto-advance — paused on hover/focus and disabled for reduced motion.
  useEffect(() => {
    if (paused || reducedMotion) return;
    const id = setInterval(() => {
      setActive((a) => (a + 1) % FAN_COUNT);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [paused, reducedMotion]);

  function handlePointerDown(event: React.PointerEvent) {
    dragStartX.current = event.clientX;
  }

  function handlePointerUp(event: React.PointerEvent) {
    if (dragStartX.current === null) return;
    const delta = event.clientX - dragStartX.current;
    dragStartX.current = null;
    if (Math.abs(delta) >= DRAG_THRESHOLD_PX) {
      step(delta < 0 ? 1 : -1);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      step(1);
    }
  }

  const cardTransition = reducedMotion
    ? "transform 150ms ease, opacity 150ms ease, filter 150ms ease"
    : [
        `transform 700ms ${cssEasings.entrance}`,
        `opacity 700ms ${cssEasings.entrance}`,
        `filter 700ms ${cssEasings.entrance}`,
      ].join(", ");

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <div
        ref={trackRef}
        role="region"
        aria-roledescription="carousel"
        aria-label="Featured reveal templates"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          dragStartX.current = null;
        }}
        className="relative mx-auto w-full max-w-[640px] cursor-grab select-none rounded-[var(--r-md)] active:cursor-grabbing"
        style={{
          height: "340px",
          perspective: "1200px",
          perspectiveOrigin: "50% 50%",
          touchAction: "pan-y",
        }}
      >
        {fanTemplates.map((template, index) => {
          const offset = wrapOffset(index, active, FAN_COUNT);
          const slot = fanSlot(offset, trackWidth);
          const theme = getThemeById(template.themeId);
          const occasionLabel = occasionLabelById.get(template.occasionId) ?? "";

          return (
            /* Card chrome matches the mockup `.fan-card`: 190x270, --r-md,
               mist hairline, paper body, --sh-card, art on top and a
               left-aligned `.lbl2` caption block beneath. Geometry comes from
               coverflow-math.ts and is deliberately untouched. */
            <div
              key={template.id}
              aria-hidden={!slot.visible}
              className="absolute left-1/2 top-1/2 flex h-[270px] w-[190px] flex-col overflow-hidden rounded-[var(--r-md)] border border-mist bg-paper shadow-[var(--sh-card)]"
              style={{
                transform: `translate(-50%, -50%) translateX(${slot.x}px) translateZ(${slot.z}px) rotateY(${slot.rotY}deg) scale(${slot.scale})`,
                filter: `brightness(${slot.brightness})`,
                zIndex: slot.zIndex,
                opacity: slot.visible ? 1 : 0,
                transition: cardTransition,
              }}
            >
              <div
                className="relative flex-1 bg-cover bg-center"
                style={{
                  backgroundImage: template.art?.cover
                    ? `url(${template.art.cover})`
                    : undefined,
                  background: !template.art?.cover
                    ? theme
                      ? coverBackground(theme)
                      : "var(--pebble)"
                    : undefined,
                }}
              />
              <div className="px-3 py-2.5 text-left">
                <span className="block font-heading text-[15px] leading-tight text-ink">
                  {template.name}
                </span>
                <span className="block text-[10px] uppercase tracking-[0.08em] text-stone">
                  {occasionLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dot rail */}
      <div
        role="group"
        aria-label="Choose featured template"
        className="mt-6 flex justify-center gap-2"
      >
        {fanTemplates.map((template, index) => {
          const isActive = index === active;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show ${template.name}`}
              aria-current={isActive ? "true" : undefined}
              /* p-2 gives a >=24px hit target (WCAG target-size); the inner span stays a small visual dot */
              className="group/dot rounded-full p-2"
            >
              <span
                aria-hidden="true"
                className={`block h-[7px] transition-all duration-200 ${
                  isActive
                    ? "w-5 rounded-[4px] bg-ink"
                    : "w-[7px] rounded-full bg-mist group-hover/dot:bg-stone"
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
