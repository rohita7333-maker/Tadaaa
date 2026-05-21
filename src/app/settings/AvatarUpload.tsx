"use client";

import { useState, useRef } from "react";
import { Camera, Loader2 } from "lucide-react";
import { uploadAvatar } from "@/actions/account";
import { toast } from "sonner";

export default function AvatarUpload({
  currentUrl,
  userInitial,
}: {
  currentUrl?: string | null;
  userInitial: string;
}) {
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Revoke previous blob URL to prevent memory leak
    if (preview && preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }
    setPreview(URL.createObjectURL(file));
    setUploading(true);

    const fd = new FormData();
    fd.append("avatar", file);

    const result = await uploadAvatar(fd);
    if (result.error) {
      toast.error(result.error);
      setPreview(currentUrl ?? null);
    } else {
      toast.success("Profile photo updated!");
    }
    setUploading(false);
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative w-16 h-16 rounded-full overflow-hidden group"
      >
        {preview ? (
          <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#C4686D] to-[#9B3D42] flex items-center justify-center text-white text-xl font-bold">
            {userInitial}
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {uploading ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Camera className="w-5 h-5 text-white" />
          )}
        </div>
      </button>
      <div>
        <p className="text-sm font-medium text-[#2D2926]">Profile photo</p>
        <p className="text-xs text-[#6B5E57]">JPG, PNG, or WebP. Max 2MB.</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  );
}
