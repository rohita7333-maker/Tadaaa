"use client";

import { motion, useReducedMotion } from "framer-motion";
import { getReducedMotionTransition } from "@/lib/a11y";

interface FloatingPhotosProps {
  photos: { url: string; caption?: string }[];
  screenIndex: number;
}

interface Zone {
  topPct: number;
  leftPct: number;
}

interface PhotoPosition {
  topPct: number;
  leftPct: number;
  rotation: number;
}

// 8 named anchor zones — top-left corner of the photo frame as % of container.
// Insets keep frames safely off the screen edges (top >= 8%, side >= 8%).
const ZONES: Zone[] = [
  { topPct: 10, leftPct: 8  },  // top-left
  { topPct: 8,  leftPct: 38 },  // top-center
  { topPct: 10, leftPct: 68 },  // top-right
  { topPct: 40, leftPct: 6  },  // left-middle
  { topPct: 40, leftPct: 70 },  // right-middle
  { topPct: 65, leftPct: 8  },  // bottom-left
  { topPct: 70, leftPct: 38 },  // bottom-center
  { topPct: 65, leftPct: 68 },  // bottom-right
];

// Min distance (in % of container) between any two photo centers, prevents overlap.
const MIN_SEPARATION_PCT = 26;

// Seeded pseudo-random [0, 1] — stable across renders
function sr(seed: number): number {
  const x = Math.sin(seed + 1.618) * 99991;
  return x - Math.floor(x);
}

function getPhotoSize(count: number): { frameW: number; frameH: number; imgW: number; imgH: number } {
  if (count <= 3) return { frameW: 220, frameH: 320, imgW: 200, imgH: 262 };
  if (count <= 5) return { frameW: 180, frameH: 270, imgW: 160, imgH: 212 };
  return { frameW: 150, frameH: 230, imgW: 130, imgH: 172 };
}

function generatePositions(
  count: number,
  frameWPct: number,
  frameHPct: number,
  seed: number
): PhotoPosition[] {
  // Shuffle zone order deterministically so different screenIndex = different layout
  const indices = Array.from({ length: ZONES.length }, (_, i) => i);
  indices.sort((a, b) => sr(seed + a * 2.3) - sr(seed + b * 2.3));

  // Safe inset from screen edges (keeps photo well off the borders)
  const TOP_INSET = 6;
  const SIDE_INSET = 6;
  const minTop = TOP_INSET;
  const maxTop = Math.max(TOP_INSET, 100 - frameHPct - TOP_INSET);
  const minLeft = SIDE_INSET;
  const maxLeft = Math.max(SIDE_INSET, 100 - frameWPct - SIDE_INSET);

  const placed: PhotoPosition[] = [];

  for (let i = 0; i < count; i++) {
    const zoneIdx = indices[i % indices.length];
    const zone = ZONES[zoneIdx];

    // Try a small jitter, retry a few times to avoid overlap with already-placed photos.
    let topPct = zone.topPct;
    let leftPct = zone.leftPct;
    for (let attempt = 0; attempt < 6; attempt++) {
      const jitterTop = (sr(seed + i * 4.1 + attempt * 0.7 + 0.5) - 0.5) * 4; // ±2%
      const jitterLeft = (sr(seed + i * 4.1 + attempt * 0.7 + 1.3) - 0.5) * 4;
      const t = Math.max(minTop, Math.min(maxTop, zone.topPct + jitterTop));
      const l = Math.max(minLeft, Math.min(maxLeft, zone.leftPct + jitterLeft));

      const overlap = placed.some((p) => {
        const dt = (p.topPct + frameHPct / 2) - (t + frameHPct / 2);
        const dl = (p.leftPct + frameWPct / 2) - (l + frameWPct / 2);
        return Math.hypot(dt, dl) < MIN_SEPARATION_PCT;
      });

      topPct = t;
      leftPct = l;
      if (!overlap) break;
    }

    const rotation = (sr(seed + i * 7.7 + 2.2) - 0.5) * 8; // ±4 deg (tighter)
    placed.push({ topPct, leftPct, rotation });
  }

  return placed;
}

export default function FloatingPhotos({ photos, screenIndex }: FloatingPhotosProps) {
  const shouldReduce = useReducedMotion();

  if (photos.length === 0) return null;

  const { frameW, frameH, imgW, imgH } = getPhotoSize(photos.length);
  const seed = screenIndex * 13.7 + photos.length * 3.1;

  // We need approximate % sizes for clamping — assume a 390px wide, 844px tall container (iPhone 14)
  // These are only used for clamping so approximate values are fine
  const frameWPct = (frameW / 390) * 100;
  const frameHPct = (frameH / 844) * 100;

  const positions = generatePositions(photos.length, frameWPct, frameHPct, seed);

  return (
    <div
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
            initial={{ rotate: pos.rotation, opacity: shouldReduce ? 0.55 : 0, scale: shouldReduce ? 1 : 0.85 }}
            transition={getReducedMotionTransition(shouldReduce, { duration: 0.5, delay: i * 0.08, ease: "easeOut" as const })}
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
                    fontFamily: "var(--font-caveat, cursive)",
                    fontSize: photos.length <= 4 ? "14px" : "11px",
                    color: "#6B5E57",
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
