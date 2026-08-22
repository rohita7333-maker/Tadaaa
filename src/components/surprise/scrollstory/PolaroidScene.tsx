"use client";

import type { CSSProperties } from "react";
import type { StoryConfig } from "@/lib/scroll-story/config";
import { Reveal } from "./Reveal";
import {
  SEAM_PLAN_TO_POLAROID,
  SEAM_POLAROID_TO_RSVP,
  SERIF_STACK,
} from "./shared";

const FALLBACK_ROTATIONS = [-6, 5, -3, 7] as const;
const PHOTO_WIDTH = 240;
const PHOTO_HEIGHT = 300;

interface PolaroidSceneProps {
  config: StoryConfig;
}

/**
 * Scene 4 — the photo wall (`.s-photos` in the mockup: paper ground, italic
 * serif caption, hairline-framed images with a paper caption strip).
 *
 * GRADIENT SEAM CONTRACT: first stop #F5F0ED (SEAM_PLAN_TO_POLAROID) ===
 * PlanScene's final stop; final stop #E8E4E0 (SEAM_POLAROID_TO_RSVP) ===
 * RsvpScene's first stop. A quiet pebble → mist settle; the drop into night
 * belongs to RsvpScene, which unlike this scene always renders.
 */
export default function PolaroidScene({ config }: PolaroidSceneProps) {
  if (config.photos.length === 0) return null;

  return (
    <section
      aria-label="Our favourite memories"
      className="relative px-6 py-28"
      style={{
        background: `linear-gradient(180deg, ${SEAM_PLAN_TO_POLAROID} 0%, #EEE9E6 55%, ${SEAM_POLAROID_TO_RSVP} 100%)`,
      }}
    >
      <Reveal className="mx-auto max-w-4xl text-center">
        <h2
          style={{
            fontFamily: SERIF_STACK,
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: "17px",
            color: "var(--stone)",
          }}
        >
          A few favorites
        </h2>

        <div className="mt-6 flex flex-wrap items-start justify-center gap-8">
          {config.photos.map((photo, i) => {
            const rotation =
              photo.rotationDeg ??
              FALLBACK_ROTATIONS[i % FALLBACK_ROTATIONS.length];
            return (
              <figure
                key={i}
                className="p-[10px] pb-[10px] transition-transform duration-300 [transform:rotate(var(--ss-rot))] hover:[transform:rotate(0deg)_translateY(-6px)]"
                style={
                  {
                    "--ss-rot": `${rotation}deg`,
                    backgroundColor: "var(--paper)",
                    border: "1px solid var(--mist)",
                    boxShadow: "0 4px 20px rgba(26,26,26,.06)",
                  } as CSSProperties
                }
              >
                {photo.src ? (
                  <img
                    src={photo.src}
                    alt={photo.caption ?? `Memory ${i + 1}`}
                    loading="lazy"
                    width={PHOTO_WIDTH}
                    height={PHOTO_HEIGHT}
                    className="block object-cover"
                    style={{ width: PHOTO_WIDTH, height: PHOTO_HEIGHT }}
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    style={{
                      width: PHOTO_WIDTH,
                      height: PHOTO_HEIGHT,
                      background:
                        "linear-gradient(150deg, var(--pebble) 0%, var(--mist) 100%)",
                    }}
                  />
                )}
                {photo.caption && (
                  <figcaption
                    className="mt-[10px] pt-[6px] text-left text-[11px]"
                    style={{
                      borderTop: "1px solid var(--mist)",
                      color: "var(--stone)",
                    }}
                  >
                    {photo.caption}
                  </figcaption>
                )}
              </figure>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}
