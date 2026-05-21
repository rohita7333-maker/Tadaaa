"use client";

import { useState, useRef, useCallback } from "react";
import { ImagePlus, X, Loader2, GripVertical } from "lucide-react";
import imageCompression from "browser-image-compression";
import { MAX_PHOTOS, PHOTO_MAX_DIMENSION, PHOTO_MAX_SIZE_MB } from "@/lib/constants";
import { randomRotation } from "@/lib/utils";
import { toast } from "sonner";

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

export default function PhotoUploader({ photos, onPhotosChange }: PhotoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [compressing, setCompressing] = useState(false);
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

      setCompressing(true);

      const newPhotos: PhotoFile[] = [];
      for (const file of imageFiles) {
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
      }

      setCompressing(false);
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
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[#2D2926] font-medium text-sm">Photos</label>
        <span className="text-[#6B5E57] text-xs">
          {photos.length}/{MAX_PHOTOS} · drag to reorder
        </span>
      </div>

      {/* Drop zone */}
      {photos.length < MAX_PHOTOS && (
        <div
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${
            isDragging
              ? "border-[#C4686D] bg-[#FFF0EE] scale-[1.01]"
              : "border-[#D4CBC3] bg-[#FFF8F0] hover:border-[#C4686D]/50 hover:bg-[#FFF5F0]"
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
          {compressing ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-[#C4686D] animate-spin" />
              <p className="text-[#6B5E57] text-sm">Optimising photos…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <ImagePlus className="w-8 h-8 text-[#C4686D]" />
              <p className="text-[#2D2926] font-medium text-sm">
                Drop photos here or <span className="text-[#C4686D] underline">browse</span>
              </p>
              <p className="text-[#6B5E57] text-xs">JPEG, PNG, WebP · Max 10MB each</p>
            </div>
          )}
        </div>
      )}

      {/* Photo list with polaroid preview + captions */}
      {photos.length > 0 && (
        <div className="mt-4 space-y-3">
          {photos.map((photo, idx) => (
            <div
              key={photo.id}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => { e.preventDefault(); setOverIdx(idx); }}
              onDragEnd={handleDragEnd}
              className={`flex gap-3 bg-white rounded-2xl border border-[#D4CBC3]/40 p-3 transition-all ${
                overIdx === idx && dragIdx !== idx ? "ring-2 ring-[#C4686D]" : ""
              }`}
            >
              {/* Drag handle */}
              <div className="flex items-center text-[#D4CBC3] cursor-grab active:cursor-grabbing">
                <GripVertical className="w-4 h-4" />
              </div>

              {/* Polaroid thumbnail */}
              <div
                className="polaroid-frame flex-shrink-0 w-20"
                style={{ "--rotation": `${photo.rotation_deg}deg` } as React.CSSProperties}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.preview}
                  alt={`Photo ${idx + 1}`}
                  className="w-full aspect-square object-cover"
                />
                <p
                  className="polaroid-caption text-xs truncate"
                  style={{ fontFamily: "var(--font-caveat), cursive" }}
                >
                  {photo.caption || "caption…"}
                </p>
              </div>

              {/* Caption input */}
              <div className="flex-1 flex flex-col justify-center">
                {idx === 0 && (
                  <span className="text-[9px] font-semibold text-[#C4686D] uppercase tracking-wider mb-1">
                    Cover photo
                  </span>
                )}
                <label className="text-[10px] text-[#6B5E57] mb-1">Polaroid caption</label>
                <textarea
                  value={photo.caption}
                  onChange={(e) => updateCaption(photo.id, e.target.value)}
                  placeholder="Write something sweet…"
                  maxLength={120}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-[#D4CBC3] bg-[#FFF8F0] text-[#2D2926] placeholder:text-[#6B5E57]/40 focus:outline-none focus:ring-2 focus:ring-[#C4686D]/30 focus:border-[#C4686D] resize-none"
                  style={{ fontFamily: "var(--font-caveat), cursive", fontSize: "1rem" }}
                />
                <p className="text-right text-[10px] text-[#6B5E57] mt-0.5">
                  {photo.caption.length}/120
                </p>
              </div>

              {/* Remove */}
              <button
                onClick={() => removePhoto(photo.id)}
                className="self-start mt-1 w-6 h-6 rounded-full bg-[#FFF0EE] text-[#C4686D] flex items-center justify-center hover:bg-[#C4686D] hover:text-white transition-colors flex-shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
