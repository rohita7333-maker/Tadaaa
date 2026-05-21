"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { occasions } from "@/lib/themes";

export default function OccasionFilter({ current }: { current: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setFilter(id: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set("occasion", id);
    } else {
      params.delete("occasion");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <button
        onClick={() => setFilter(null)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
          !current
            ? "bg-[#C4686D] text-white border-[#C4686D] shadow-sm shadow-[#C4686D]/20"
            : "bg-white text-[#6B5E57] border-[#D4CBC3] hover:border-[#C4686D]/40 hover:text-[#C4686D]"
        }`}
      >
        All
      </button>
      {occasions.map((occ) => (
        <button
          key={occ.id}
          onClick={() => setFilter(occ.id)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
            current === occ.id
              ? "bg-[#C4686D] text-white border-[#C4686D] shadow-sm shadow-[#C4686D]/20"
              : "bg-white text-[#6B5E57] border-[#D4CBC3] hover:border-[#C4686D]/40 hover:text-[#C4686D]"
          }`}
        >
          <span>{occ.emoji}</span>
          {occ.label}
        </button>
      ))}
    </div>
  );
}
