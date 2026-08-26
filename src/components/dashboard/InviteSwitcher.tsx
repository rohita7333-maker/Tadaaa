"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

interface InviteOption {
  id: string;
  title: string;
}

interface InviteSwitcherProps {
  invites: InviteOption[];
  selectedId: string;
}

/**
 * Which invite the analytics page is reporting on. Navigation is a plain route
 * change, so the numbers are re-read on the server — nothing is cached client
 * side and a stale tab can't show another invite's data.
 */
export default function InviteSwitcher({ invites, selectedId }: InviteSwitcherProps) {
  const router = useRouter();

  return (
    <div className="relative">
      <select
        value={selectedId}
        aria-label="Choose which surprise to analyse"
        onChange={(e) => router.push(`/dashboard/analytics?invite=${e.target.value}`)}
        className="appearance-none h-11 pl-4 pr-10 rounded-xl border border-[#E9E6DF] bg-white text-sm font-medium text-[#1A1B18] hover:border-[#3E6B5C] focus:outline-none focus:ring-2 focus:ring-[#3E6B5C]/30 transition-colors cursor-pointer max-w-[260px] truncate"
      >
        {invites.map((invite) => (
          <option key={invite.id} value={invite.id}>
            {invite.title}
          </option>
        ))}
      </select>
      <ChevronDown className="w-4 h-4 text-[#6F6E68] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}
