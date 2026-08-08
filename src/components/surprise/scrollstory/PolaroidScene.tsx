"use client";

import type { CSSProperties } from "react";
import type { StoryConfig } from "@/lib/scroll-story/config";
import { Reveal } from "./Reveal";
import {
  HANDWRITING_STACK,
  SEAM_PLAN_TO_POLAROID,
  SEAM_POLAROID_TO_RSVP,
  SERIF_STACK,
} from "./shared";

const FALLBACK_ROTATIONS = [-6, 5, -3, 7] as const;
const PLACEHOLDER_EMOJI = ["📸", "💛", "🎈", "✨"] as const;
const PHOTO_WIDTH = 240;
const PHOTO_HEIGHT = 300;

interface PolaroidSceneProps {
  config: StoryConfig;
}

/**
 * Scene 4 — polaroid wall of favourite memories.
 * GRADIENT SEAM CONTRACT: first stop #F5EDE3 (SEAM_PLAN_TO_POLAROID) ===
 * PlanScene's final stop; final stop #E8A5A8 blush (SEAM_POLAROID_TO_RSVP)
 * === RsvpScene's first stop.
 */
export default function PolaroidScene({ config }: PolaroidSceneProps) {
  if (config.photos.length === 0) return null;

  return (
    <section
      aria-label="Our favourite memories"
      className="relative px-6 py-28"
      style={{
        background: `linear-gradient(180deg, ${SEAM_PLAN_TO_POLAROID} 0%, #F2DAD3 55%, ${SEAM_POLAROID_TO_RSVP} 100%)`,
      }}
    >
      <Reveal className="mx-auto max-w-4xl text-center">
        <p
          className="text-rose-deep"
          style={{ fontFamily: HANDWRITING_STACK, fontSize: "26px" }}
        >
          a few of my favourites
        </p>
        <h2
          className="mt-1 text-charcoal"
          style={{
            fontFamily: SERIF_STACK,
            fontWeight: 600,
            fontSize: "clamp(32px, 6vw, 44px)",
            letterSpacing: "0",
          }}
        >
          Us, so far
        </h2>

        <div className="mt-12 flex flex-wrap items-start justify-center gap-8">
          {config.photos.map((photo, i) => {
            const rotation =
              photo.rotationDeg ??
              FALLBACK_ROTATIONS[i % FALLBACK_ROTATIONS.length];
            return (
              <figure
                key={i}
                className="bg-white p-[10px] pb-[30px] shadow-[0_14px_34px_rgba(45,41,38,0.18)] transition-transform duration-300 [transform:rotate(var(--ss-rot))] hover:[transform:rotate(0deg)_translateY(-8px)_scale(1.03)]"
                style={{ "--ss-rot": `${rotation}deg` } as CSSProperties}
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
                    className="flex items-center justify-center"
                    style={{
                      width: PHOTO_WIDTH,
                      height: PHOTO_HEIGHT,
                      background:
                        "linear-gradient(150deg, #E8A5A8 0%, #C4686D 55%, #C9A96E 100%)",
                    }}
                  >
                    <span className="text-5xl">
                      {PLACEHOLDER_EMOJI[i % PLACEHOLDER_EMOJI.length]}
                    </span>
                  </div>
                )}
                {photo.caption && (
                  <figcaption
                    className="mt-3 text-center text-xl text-charcoal"
                    style={{ fontFamily: HANDWRITING_STACK }}
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
