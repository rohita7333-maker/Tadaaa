"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, LogOut, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/actions/auth";

interface NavbarProps {
  userEmail?: string;
  userInitial?: string;
  avatarUrl?: string | null;
  subscriptionTier?: string;
}

export default function Navbar({ userEmail, userInitial = "U", avatarUrl, subscriptionTier = "free" }: NavbarProps) {
  const router = useRouter();
  const tierBadge =
    subscriptionTier === "unlimited"
      ? { label: "Unlimited", cls: "bg-amber-100 text-amber-800" }
      : subscriptionTier === "plus"
      ? { label: "Plus", cls: "bg-rose-100 text-rose-700" }
      : null;
  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-[#D4CBC3]/40 px-6 py-3.5 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#C4686D] to-[#9B3D42] flex items-center justify-center group-hover:scale-105 transition-transform">
            <Heart className="w-4 h-4 fill-white text-white" />
          </div>
          <span className="font-heading text-lg text-[#2D2926]">TaDaaaa</span>
        </Link>

        <div className="flex items-center gap-2.5">
          {tierBadge && (
            <span className={`hidden sm:inline-block text-xs font-semibold px-3 py-1 rounded-full ${tierBadge.cls}`}>
              {tierBadge.label}
            </span>
          )}

          <Link
            href="/create"
            className="inline-flex items-center rounded-xl bg-gradient-to-r from-[#C4686D] to-[#9B3D42] hover:from-[#9B3D42] hover:to-[#C4686D] text-white text-sm h-9 px-4 font-semibold transition-all duration-300 hover:scale-[1.02] shadow-sm shadow-[#C4686D]/20"
          >
            + New Surprise
          </Link>

          <Link
            href="/settings"
            className="w-9 h-9 rounded-xl border border-[#D4CBC3]/60 flex items-center justify-center text-[#6B5E57] hover:text-[#C4686D] hover:border-[#C4686D]/40 hover:bg-[#FFF8F0] transition-all"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Account menu"
              className="w-9 h-9 rounded-full bg-gradient-to-br from-[#C4686D] to-[#9B3D42] flex items-center justify-center text-white text-sm font-bold hover:opacity-90 transition-opacity outline-none overflow-hidden"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                userInitial
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {userEmail && (
                <div className="px-2 py-1.5 text-xs text-[#6B5E57] border-b border-[#D4CBC3]/40 mb-1">
                  {userEmail}
                </div>
              )}
              <DropdownMenuItem onClick={() => router.push("/settings")} className="cursor-pointer">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => signOut()}
                className="text-[#C4686D] cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
