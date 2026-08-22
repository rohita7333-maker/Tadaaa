"use client";

import { useState, useRef, useCallback } from "react";
import { X, GripVertical } from "lucide-react";
import imageCompression from "browser-image-compression";
import { MAX_PHOTOS, PHOTO_MAX_DIMENSION, PHOTO_MAX_SIZE_MB } from "@/lib/constants";
import { randomRotation } from "@/lib/utils";
import { toast } from "sonner";
import {
  LABEL,
  DROP,
  DROP_ACTIVE,
  DROP_P,
  DROP_SMALL,
  UPBAR,
  UPBAR_FILL,
  THUMBS,
  THUMB,
  THUMB_IM,
  THUMB_CAP,
  THUMB_X,
} from "./editorial";

export interface PhotoFile {
  id: string;
  file: File;
  preview: string;
  caption: string;
  rotation_deg: number;
  uploading?: boolean;
  progress?: number;
}

interface PhotoUploaderProps {
  photos: PhotoFile[];
  onPhotosChange: (photos: PhotoFile[]) => void;
}

const CAPTION_MAX = 120;

/**
 * Photo step — mockup `.drop` / `.upbar` / `.thumbs` (L324-337).
 *
 * Compression, moderation-bound file handling, captions, `rotation_deg` and
 * drag-to-reorder are unchanged; only the chrome moved to the editorial
 * dashed drop zone and 116px thumb strip.
 */
export default function PhotoUploader({ photos, onPhotosChange }: PhotoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [compressPct, setCompressPct] = useState<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    async (files: File[]) => {
      const remaining = MAX_PHOTOS - photos.length;
      if (remaining <= 0) {
        toast.error(`Maximum ${MAX_PHOTOS} photos allowed`);
        return;
      }

      const toProcess = files.slice(0, remaining);
      const imageFiles = toProcess.filter((f) => f.type.startsWith("image/"));
      if (imageFiles.length === 0) return;

      setCompressPct(0);

      const newPhotos: PhotoFile[] = [];
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        try {
          const compressed = await imageCompression(file, {
            maxSizeMB: PHOTO_MAX_SIZE_MB,
            maxWidthOrHeight: PHOTO_MAX_DIMENSION,
            useWebWorker: true,
          });
          const preview = await imageCompression.getDataUrlFromFile(compressed);
          newPhotos.push({
            id: `${Date.now()}-${Math.random()}`,
            file: compressed,
            preview,
            caption: "",
            rotation_deg: randomRotation(),
          });
        } catch {
          toast.error(`Failed to process ${file.name}`);
        }
        setCompressPct(Math.round(((i + 1) / imageFiles.length) * 100));
      }

      setCompressPct(null);
      onPhotosChange([...photos, ...newPhotos]);
    },
    [photos, onPhotosChange]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    processFiles(Array.from(e.target.files));
    e.target.value = "";
  }

  function removePhoto(id: string) {
    onPhotosChange(photos.filter((p) => p.id !== id));
  }

  function updateCaption(id: string, caption: string) {
    onPhotosChange(photos.map((p) => (p.id === id ? { ...p, caption } : p)));
  }

  function handleDragEnd() {
    if (dragIdx === null || overIdx === null || dragIdx === overIdx) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }
    const next = [...photos];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(overIdx, 0, moved);
    onPhotosChange(next);
    setDragIdx(null);
    setOverIdx(null);
  }

  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className={LABEL}>Photos</span>
        <span className="text-xs text-stone mb-[7px]">
          {photos.length}/{MAX_PHOTOS} · drag to reorder
        </span>
      </div>

      {/* Mockup `.drop` */}
      {photos.length < MAX_PHOTOS && (
        <button
          type="button"
          className={`${DROP} ${isDragging ? DROP_ACTIVE : ""}`}
          onDragEnter={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
          <span className={`block ${DROP_P}`}>
            {compressPct === null
              ? "Drop photos or click to browse"
              : "Optimising photos…"}
          </span>
          <span className={`block ${DROP_SMALL}`}>
            Compressed to {PHOTO_MAX_DIMENSION}px on device · up to {MAX_PHOTOS}
          </span>
        </button>
      )}

      {/* Mockup `.upbar` — real progress across the compression loop. */}
      {compressPct !== null && (
        <div
          className={UPBAR}
          role="progressbar"
          aria-label="Optimising photos"
          aria-valuenow={compressPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className={UPBAR_FILL} style={{ width: `${compressPct}%` }} />
        </div>
      )}

      {/* Mockup `.thumbs` — 116px cards, inline caption, corner remove. */}
      {photos.length > 0 && (
        <ul className={THUMBS}>
          {photos.map((photo, idx) => (
            <li
              key={photo.id}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => {
                e.preventDefault();
                setOverIdx(idx);
              }}
              onDragEnd={handleDragEnd}
              className={`${THUMB} ${
                overIdx === idx && dragIdx !== idx ? "outline-2 outline-coral" : ""
              }`}
            >
              <div className={THUMB_IM}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.preview}
                  alt={`Photo ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <span
                  aria-hidden="true"
                  className="absolute top-[3px] left-[3px] flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(26,26,26,0.55)] text-white"
                >
                  <GripVertical className="h-3 w-3" />
                </span>
                {idx === 0 && (
                  <span className="absolute bottom-0 left-0 bg-[rgba(26,26,26,0.72)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white">
                    Cover
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(photo.id)}
                  aria-label={`Remove photo ${idx + 1}`}
                  className={THUMB_X}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <input
                value={photo.caption}
                onChange={(e) => updateCaption(photo.id, e.target.value)}
                placeholder="Caption…"
                maxLength={CAPTION_MAX}
                aria-label={`Caption for photo ${idx + 1}`}
                className={THUMB_CAP}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
