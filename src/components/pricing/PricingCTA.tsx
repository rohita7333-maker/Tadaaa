"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface PricingCTAProps {
  plan: "free" | "plus" | "unlimited";
  label: string;
  className: string;
  isAuthed: boolean;
}

export default function PricingCTA({ plan, label, className, isAuthed }: PricingCTAProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (plan === "free") {
      router.push(isAuthed ? "/dashboard" : "/auth/signup");
      return;
    }
    if (plan === "plus") {
      router.push(isAuthed ? "/create" : "/auth/signup?next=/create");
      return;
    }
    // unlimited
    if (!isAuthed) {
      router.push("/auth/signup?next=/pricing");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "unlimited" }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      toast.error(data.error || "Checkout failed");
    } catch {
      toast.error("Could not start checkout — try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={className}
    >
      {loading ? "Loading…" : label}
    </button>
  );
}
