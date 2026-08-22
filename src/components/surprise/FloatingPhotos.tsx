"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { getReducedMotionTransition } from "@/lib/a11y";

interface FloatingPhotosProps {
  photos: { url: string; caption?: string }[];
  screenIndex: number;
}

interface PhotoPosition {
  topPct: number;
  leftPct: number;
  rotation: number;
}

const FRAME_PADDING_PCT = 1.5; // visual breathing room between rects (in % of container)

// Seeded pseudo-random [0, 1] — stable across renders
function sr(seed: number): number {
  const x = Math.sin(seed + 1.618) * 99991;
  return x - Math.floor(x);
}

// Frame size grows on bigger screens. Mobile-first caps tied to container width.
function getPhotoSize(count: number, containerW: number) {
  // Hard cap: a single polaroid should never take >40% of container width on desktop.
  const isWide = containerW >= 768;

  if (count <= 2) {
    return isWide
      ? { frameW: 340, frameH: 430, imgW: 320, imgH: 360 }
      : { frameW: 280, frameH: 360, imgW: 260, imgH: 302 };
  }
  if (count <= 3) {
    return isWide
      ? { frameW: 300, frameH: 390, imgW: 280, imgH: 320 }
      : { frameW: 240, frameH: 320, imgW: 220, imgH: 262 };
  }
  if (count <= 5) {
    return isWide
      ? { frameW: 260, frameH: 350, imgW: 240, imgH: 282 }
      : { frameW: 200, frameH: 280, imgW: 180, imgH: 222 };
  }
  if (count <= 8) {
    return isWide
      ? { frameW: 220, frameH: 300, imgW: 200, imgH: 232 }
      : { frameW: 165, frameH: 240, imgW: 145, imgH: 182 };
  }
  return isWide
    ? { frameW: 180, frameH: 250, imgW: 160, imgH: 182 }
    : { frameW: 140, frameH: 200, imgW: 120, imgH: 142 };
}

function generatePositions(
  count: number,
  frameWPct: number,
  frameHPct: number,
  seed: number
): PhotoPosition[] {
  // Safe inset from edges
  const TOP_INSET = 4;
  const SIDE_INSET = 4;
  const minTop = TOP_INSET;
  const maxTop = Math.max(TOP_INSET, 100 - frameHPct - TOP_INSET);
  const minLeft = SIDE_INSET;
  const maxLeft = Math.max(SIDE_INSET, 100 - frameWPct - SIDE_INSET);

  const placed: PhotoPosition[] = [];

  function intersectsAny(t: number, l: number): boolean {
    const top1 = t - FRAME_PADDING_PCT;
    const left1 = l - FRAME_PADDING_PCT;
    const right1 = l + frameWPct + FRAME_PADDING_PCT;
    const bot1 = t + frameHPct + FRAME_PADDING_PCT;
    return placed.some((p) => {
      const top2 = p.topPct;
      const left2 = p.leftPct;
      const right2 = p.leftPct + frameWPct;
      const bot2 = p.topPct + frameHPct;
      return !(right1 <= left2 || left1 >= right2 || bot1 <= top2 || top1 >= bot2);
    });
  }

  // Best-fit search: try many random positions, accept first non-overlapping.
  // Avoids the rigid zone system that fails on responsive widths.
  for (let i = 0; i < count; i++) {
    let topPct = minTop;
    let leftPct = minLeft;
    let placedOk = false;

    for (let attempt = 0; attempt < 200; attempt++) {
      const t = minTop + sr(seed + i * 11.3 + attempt * 0.9) * (maxTop - minTop);
      const l = minLeft + sr(seed + i * 11.3 + attempt * 0.9 + 0.4) * (maxLeft - minLeft);
      if (!intersectsAny(t, l)) {
        topPct = t;
        leftPct = l;
        placedOk = true;
        break;
      }
    }

    // Last-resort: place at corner-march if every random spot collided
    // (only happens if container truly can't fit all frames — extreme case).
    if (!placedOk) {
      const idx = placed.length;
      topPct = minTop + (idx % 4) * (frameHPct + 2);
      leftPct = minLeft + Math.floor(idx / 4) * (frameWPct + 2);
    }

    const rotation = (sr(seed + i * 7.7 + 2.2) - 0.5) * 8; // ±4 deg
    placed.push({ topPct, leftPct, rotation });
  }

  return placed;
}

export default function FloatingPhotos({ photos, screenIndex }: FloatingPhotosProps) {
  const shouldReduce = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 390, h: 844 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setSize({ w: r.width, h: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (photos.length === 0) return null;

  const { frameW, frameH, imgW, imgH } = getPhotoSize(photos.length, size.w);
  const seed = screenIndex * 13.7 + photos.length * 3.1;

  const frameWPct = (frameW / size.w) * 100;
  const frameHPct = (frameH / size.h) * 100;

  const positions = generatePositions(photos.length, frameWPct, frameHPct, seed);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 5 }}
    >
      {photos.map((photo, i) => {
        const pos = positions[i];
        if (!pos) return null;
        const caption = photo.caption?.trim() ?? "";

        return (
          <motion.div
            key={`photo-${i}-${screenIndex}`}
            className="absolute select-none"
            style={{
              top: `${pos.topPct}%`,
              left: `${pos.leftPct}%`,
            }}
            animate={{ rotate: pos.rotation, opacity: 0.55 }}
            initial={{
              rotate: pos.rotation,
              opacity: shouldReduce ? 0.55 : 0,
              scale: shouldReduce ? 1 : 0.85,
            }}
            transition={getReducedMotionTransition(shouldReduce, {
              duration: 0.5,
              delay: i * 0.08,
              ease: "easeOut" as const,
            })}
          >
            <div
              className="bg-white rounded-sm"
              style={{
                width: `${frameW}px`,
                padding: `10px 10px 48px 10px`,
                boxShadow: "0 8px 28px rgba(45,41,38,0.30)",
              }}
            >
              <div style={{ width: `${imgW}px`, height: `${imgH}px`, overflow: "hidden" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                    filter: "contrast(1.02) saturate(1.06)",
                  }}
                  draggable={false}
                />
              </div>
              {caption ? (
                <div
                  style={{
                    fontFamily: "var(--body)",
                    fontSize: photos.length <= 4 ? "14px" : "11px",
                    color: "var(--stone)",
                    textAlign: "center",
                    marginTop: "6px",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                    padding: "0 4px",
                    lineHeight: 1.3,
                  }}
                >
                  {caption}
                </div>
              ) : (
                <div style={{ height: "20px" }} />
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
