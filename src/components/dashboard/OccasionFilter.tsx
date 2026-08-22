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

  // Mockup `.chips` / `.chip` / `.chip.on` (tadaaaa-editorial.html:282-283).
  return (
    <div className="ed-chiprow">
      <button
        type="button"
        onClick={() => setFilter(null)}
        aria-pressed={!current}
        className={`ed-chip !min-h-0 !px-3 !py-1.5 !text-xs ${!current ? "ed-chip-on" : ""}`}
      >
        All
      </button>
      {occasions.map((occ) => (
        <button
          key={occ.id}
          type="button"
          onClick={() => setFilter(occ.id)}
          aria-pressed={current === occ.id}
          className={`ed-chip !min-h-0 !px-3 !py-1.5 !text-xs ${
            current === occ.id ? "ed-chip-on" : ""
          }`}
        >
          {occ.label}
        </button>
      ))}
    </div>
  );
}
