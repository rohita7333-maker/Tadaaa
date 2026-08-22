"use client";

import { useState } from "react";
import imageCompression from "browser-image-compression";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { PHOTO_MAX_SIZE_MB, PHOTO_MAX_DIMENSION } from "@/lib/constants";
import {
  LABEL,
  INPUT,
  CC,
  DROP,
  DROP_P,
  DROP_SMALL,
  THUMB_X,
} from "@/components/create/editorial";

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
  too_large: "That photo is too large. Try a smaller one.",
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
        toast.success("Looks like you've already added a memory. Thanks!");
      }
      setDone(true);
    } catch {
      toast.error("Network blip. Please try again.");
      setSubmitting(false);
    }
  }

  if (done) {
    // Mockup `subContrib` thank-you state (L1509).
    return (
      <div className="rounded-[var(--r-md)] border border-mist bg-paper p-8 text-center shadow-[var(--sh-card)]">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-coral">
          <Check className="h-7 w-7 text-white" strokeWidth={1.8} />
        </div>
        <p className="font-heading text-[22px] italic leading-snug text-ink">
          Thank you. Your message has been added.
        </p>
        <p className="mt-3.5 text-sm text-stone">
          The creator will review it before it goes live.
        </p>
        <Link href="/" className="ed-tlink mt-6 inline-block">
          Create your own surprise →
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="contrib-name" className={LABEL}>
          Your name
        </label>
        <input
          id="contrib-name"
          type="text"
          required
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Aanya"
          className={INPUT}
        />
      </div>

      <div>
        <label htmlFor="contrib-email" className={LABEL}>
          Email (optional)
        </label>
        <input
          id="contrib-email"
          type="email"
          maxLength={120}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="So they can thank you later"
          className={INPUT}
        />
      </div>

      <div>
        <label htmlFor="contrib-message" className={LABEL}>
          Your message
        </label>
        <textarea
          id="contrib-message"
          maxLength={500}
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="A memory, a wish, an inside joke."
          className={`${INPUT} resize-none leading-relaxed`}
        />
        <div className={CC}>{message.length}/500</div>
      </div>

      <div>
        <span className={LABEL}>Add a photo (optional)</span>
        {preview ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Photo preview"
              className="h-32 w-32 rounded-[var(--r-sm)] border border-mist object-cover"
            />
            <button
              type="button"
              onClick={clearPhoto}
              className={THUMB_X}
              aria-label="Remove photo"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <label className={`${DROP} block`}>
            <span className={`block ${DROP_P}`}>Tap to choose a photo</span>
            <span className={`block ${DROP_SMALL}`}>JPEG, PNG or WebP</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFile}
            />
          </label>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="ed-btn ed-btn-coral ed-btn-block"
      >
        {submitting ? "Sending…" : "Submit"}
      </button>

      <p className="text-center text-[13px] text-stone">
        We never share your email. It only goes to the surprise&apos;s creator.
      </p>
    </form>
  );
}
