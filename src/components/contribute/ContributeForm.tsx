"use client";

import { useState } from "react";
import imageCompression from "browser-image-compression";
import { Loader2, ImagePlus, Heart, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PHOTO_MAX_SIZE_MB, PHOTO_MAX_DIMENSION } from "@/lib/constants";

interface ContributeFormProps {
  slug: string;
}

const ERROR_COPY: Record<string, string> = {
  rate_limited: "Whoa, lots of love coming in! Try again in a few minutes.",
  not_accepting: "This surprise isn't accepting contributions any more.",
  inactive: "This surprise is no longer available.",
  not_found: "We couldn't find this surprise.",
  empty: "Add a message or a photo (or both!).",
  photo_rejected: "That photo didn't pass our content filter. Try another one.",
  bad_input: "Something looked off with your submission. Please check and retry.",
  bad_mime: "Use a JPEG, PNG, or WebP photo.",
  too_large: "That photo is too large — try a smaller one.",
  upload_failed: "Couldn't upload the photo. Try again?",
};

export function ContributeForm({ slug }: ContributeFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Please pick an image file.");
      return;
    }
    try {
      // Mirror create-wizard compression — same maxSizeMB/dimension so the
      // server's MAX_BYTES guard rarely fires for legitimate uploads.
      const compressed = await imageCompression(f, {
        maxSizeMB: PHOTO_MAX_SIZE_MB,
        maxWidthOrHeight: PHOTO_MAX_DIMENSION,
        useWebWorker: true,
      });
      const url = await imageCompression.getDataUrlFromFile(compressed);
      setFile(compressed);
      setPreview(url);
    } catch {
      toast.error("Couldn't process that photo. Try a different one.");
    }
  }

  function clearPhoto() {
    setFile(null);
    setPreview(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    if (!name.trim()) {
      toast.error("Please add your name.");
      return;
    }
    if (!message.trim() && !file) {
      toast.error("Add a message or a photo to share.");
      return;
    }

    setSubmitting(true);
    try {
      let photoUrl: string | undefined;

      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        const upRes = await fetch(`/api/invite/${slug}/contribute/upload`, {
          method: "POST",
          body: fd,
        });
        const upJson = (await upRes.json().catch(() => ({}))) as {
          url?: string;
          error?: string;
        };
        if (!upRes.ok || !upJson.url) {
          const msg = ERROR_COPY[upJson.error ?? ""] ?? "Couldn't upload the photo. Try again?";
          toast.error(msg);
          setSubmitting(false);
          return;
        }
        photoUrl = upJson.url;
      }

      const res = await fetch(`/api/invite/${slug}/contribute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
          message: message.trim() || undefined,
          photoUrl,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        dedup?: boolean;
      };
      if (!res.ok) {
        const msg = ERROR_COPY[json.error ?? ""] ?? "Something went wrong. Try again?";
        toast.error(msg);
        setSubmitting(false);
        return;
      }
      if (json.dedup) {
        toast.success("Looks like you've already added a memory — thanks!");
      }
      setDone(true);
    } catch {
      toast.error("Network blip — please try again.");
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mt-8 bg-white rounded-2xl border border-[#E9E6DF]/40 shadow-[0_4px_24px_rgba(26, 27, 24,0.06)] p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#3E6B5C] to-[#2E5145] flex items-center justify-center mx-auto mb-4 shadow-[0_4px_24px_rgba(62, 107, 92,0.3)]">
          <Heart className="w-8 h-8 fill-white text-white" />
        </div>
        <h2 className="font-heading text-2xl text-[#1A1B18] mb-2">
          Memory saved.
        </h2>
        <p className="text-[#6F6E68] text-sm">
          Thank you for being part of this surprise. Your note will show up
          in the reveal.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 bg-white rounded-2xl border border-[#E9E6DF]/40 shadow-[0_4px_24px_rgba(26, 27, 24,0.06)] p-6 space-y-5"
    >
      <div>
        <label className="text-[#1A1B18] font-medium text-sm mb-1.5 block">
          Your name
        </label>
        <input
          type="text"
          required
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="w-full h-12 rounded-xl border border-[#E9E6DF] px-3 text-[#1A1B18] bg-white focus:outline-none focus:border-[#3E6B5C] focus:ring-1 focus:ring-[#3E6B5C] transition-colors"
        />
      </div>

      <div>
        <label className="text-[#1A1B18] font-medium text-sm mb-1.5 block">
          Email <span className="text-[#6F6E68] font-normal">(optional)</span>
        </label>
        <input
          type="email"
          maxLength={120}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="So they can thank you later"
          className="w-full h-12 rounded-xl border border-[#E9E6DF] px-3 text-[#1A1B18] bg-white focus:outline-none focus:border-[#3E6B5C] focus:ring-1 focus:ring-[#3E6B5C] transition-colors"
        />
      </div>

      <div>
        <label className="text-[#1A1B18] font-medium text-sm mb-1.5 block">
          A short note
        </label>
        <textarea
          maxLength={500}
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Say something sweet…"
          className="w-full rounded-xl border border-[#E9E6DF] px-3 py-3 text-[#1A1B18] bg-white focus:outline-none focus:border-[#3E6B5C] focus:ring-1 focus:ring-[#3E6B5C] transition-colors resize-none"
          style={{ fontFamily: "var(--font-caveat), cursive", fontSize: "1.1rem" }}
        />
        <p className="text-right text-[10px] text-[#6F6E68] mt-1">
          {message.length}/500
        </p>
      </div>

      <div>
        <label className="text-[#1A1B18] font-medium text-sm mb-1.5 block">
          Add a photo <span className="text-[#6F6E68] font-normal">(optional)</span>
        </label>
        {preview ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Photo preview"
              className="w-32 h-32 object-cover rounded-xl border border-[#E9E6DF]"
            />
            <button
              type="button"
              onClick={clearPhoto}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#3E6B5C] text-white flex items-center justify-center shadow-md hover:bg-[#2E5145] transition-colors"
              aria-label="Remove photo"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center gap-2 border-2 border-dashed border-[#E9E6DF] rounded-2xl p-6 cursor-pointer bg-[#FAF9F6] hover:border-[#3E6B5C]/60 transition-colors">
            <ImagePlus className="w-8 h-8 text-[#3E6B5C]" />
            <span className="text-[#1A1B18] text-sm font-medium">
              Tap to choose a photo
            </span>
            <span className="text-[#6F6E68] text-xs">JPEG, PNG, or WebP</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFile}
            />
          </label>
        )}
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="w-full h-12 rounded-full bg-gradient-to-r from-[#3E6B5C] to-[#2E5145] hover:from-[#2E5145] hover:to-[#3E6B5C] text-white font-medium transition-all duration-300 shadow-md"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Sending…
          </>
        ) : (
          "Send memory ✨"
        )}
      </Button>
      <p className="text-center text-xs text-[#6F6E68] opacity-70">
        We never share your email. It only goes to the surprise&apos;s creator.
      </p>
    </form>
  );
}
