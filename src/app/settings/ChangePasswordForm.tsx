"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { updatePassword } from "@/actions/auth";

export default function ChangePasswordForm() {
  const [pending, startTransition] = useTransition();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await updatePassword(formData);
      if (res?.error) {
        toast.error(res.error);
      } else if (res?.success) {
        toast.success(res.success);
        const form = document.getElementById("changePasswordForm") as HTMLFormElement | null;
        form?.reset();
      }
    });
  }

  return (
    <form id="changePasswordForm" action={onSubmit} className="space-y-3">
      <div>
        <label className="text-xs text-[#6F6E68] uppercase tracking-wider font-medium block mb-1">
          Current password
        </label>
        <input
          type={showCurrent ? "text" : "password"}
          name="currentPassword"
          required
          className="w-full h-11 px-4 rounded-2xl border border-[#E9E6DF] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3E6B5C] focus:border-[#3E6B5C]"
          autoComplete="current-password"
        />
      </div>
      <div>
        <label className="text-xs text-[#6F6E68] uppercase tracking-wider font-medium block mb-1">
          New password
        </label>
        <input
          type={showNew ? "text" : "password"}
          name="password"
          required
          minLength={8}
          className="w-full h-11 px-4 rounded-2xl border border-[#E9E6DF] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3E6B5C] focus:border-[#3E6B5C]"
          autoComplete="new-password"
        />
        <p className="text-[11px] text-[#6F6E68] mt-1">At least 8 characters.</p>
      </div>
      <div className="flex items-center gap-3 text-xs text-[#6F6E68]">
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={showCurrent}
            onChange={(e) => setShowCurrent(e.target.checked)}
            className="w-3.5 h-3.5 accent-[#3E6B5C]"
          />
          Show current
        </label>
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={showNew}
            onChange={(e) => setShowNew(e.target.checked)}
            className="w-3.5 h-3.5 accent-[#3E6B5C]"
          />
          Show new
        </label>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-2 inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-gradient-to-r from-[#3E6B5C] to-[#2E5145] text-white text-sm font-semibold hover:from-[#2E5145] hover:to-[#3E6B5C] transition-all duration-300 hover:scale-[1.01] shadow-md shadow-[#3E6B5C]/20 disabled:opacity-60"
      >
        <Lock className="w-3.5 h-3.5" />
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
