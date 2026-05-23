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

// 8 named anchor zones — top-left corner of the photo frame as % of container
const ZONES: Zone[] = [
  { topPct: 6,  leftPct: 3  },  // top-left
  { topPct: 3,  leftPct: 38 },  // top-center
  { topPct: 6,  leftPct: 72 },  // top-right
  { topPct: 42, leftPct: 1  },  // left-middle
  { topPct: 42, leftPct: 74 },  // right-middle
  { topPct: 70, leftPct: 3  },  // bottom-left
  { topPct: 76, leftPct: 38 },  // bottom-center
  { topPct: 70, leftPct: 72 },  // bottom-right
];

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

  return indices.slice(0, count).map((zoneIdx, i) => {
    const zone = ZONES[zoneIdx];

    // ±3% jitter
    const jitterTop = (sr(seed + i * 4.1 + 0.5) - 0.5) * 6;
    const jitterLeft = (sr(seed + i * 4.1 + 1.3) - 0.5) * 6;

    let topPct = zone.topPct + jitterTop;
    let leftPct = zone.leftPct + jitterLeft;

    // Clamp so photo frame never goes outside container
    // min 20px from edges — approximated in % (assume ~600px container; 20/600 ≈ 3.3%)
    // We clamp topPct so that top >= 0 and top + frameH% <= 100
    topPct = Math.max(0, Math.min(100 - frameHPct, topPct));
    leftPct = Math.max(0, Math.min(100 - frameWPct, leftPct));

    const rotation = (sr(seed + i * 7.7 + 2.2) - 0.5) * 10; // -5 to +5 degrees

    return { topPct, leftPct, rotation };
  });
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
