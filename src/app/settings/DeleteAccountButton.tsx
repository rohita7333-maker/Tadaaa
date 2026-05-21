"use client";

import { useState } from "react";
import { deleteAccount } from "@/actions/account";

export default function DeleteAccountButton() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (value !== "DELETE") return;
    setLoading(true);
    setError("");
    const result = await deleteAccount();
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // On success, server redirects — no client action needed
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="h-10 px-6 rounded-full border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
      >
        Delete account
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-[#2D2926]">
        Type <span className="font-mono font-bold">DELETE</span> to confirm
      </p>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="DELETE"
        className="w-full h-10 px-4 rounded-xl border border-[#D4CBC3] text-sm outline-none focus:border-red-400 transition-colors"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button
          onClick={() => { setOpen(false); setValue(""); }}
          className="flex-1 h-10 rounded-full border border-[#D4CBC3] text-[#6B5E57] text-sm hover:bg-[#FFF0E8] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={value !== "DELETE" || loading}
          className="flex-1 h-10 rounded-full bg-red-600 text-white text-sm font-medium disabled:opacity-40 hover:bg-red-700 transition-colors"
        >
          {loading ? "Deleting…" : "Delete forever"}
        </button>
      </div>
    </div>
  );
}
