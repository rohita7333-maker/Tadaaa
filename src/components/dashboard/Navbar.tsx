"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, LogOut, Settings, Sparkles } from "lucide-react";
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
  inviteCount?: number;
  greetingName?: string;
}

export default function Navbar({
  userEmail,
  userInitial = "U",
  avatarUrl,
  subscriptionTier = "free",
  inviteCount = 0,
  greetingName,
}: NavbarProps) {
  const router = useRouter();
  const tierBadge =
    subscriptionTier === "unlimited"
      ? { label: "Unlimited", cls: "bg-amber-100 text-amber-800" }
      : subscriptionTier === "plus"
      ? { label: "Plus", cls: "bg-rose-100 text-rose-700" }
      : null;

  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const firstName = greetingName?.split(" ")[0];

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-[#D4CBC3]/40 px-6 py-3.5 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#C4686D] to-[#9B3D42] flex items-center justify-center group-hover:scale-105 transition-transform">
            <Heart className="w-4 h-4 fill-white text-white" />
          </div>
          <span className="font-heading text-lg text-[#2D2926]">TaDaaaa</span>
        </Link>

        {/* Middle: greeting + streak/counter */}
        <div className="hidden md:flex flex-1 items-center justify-center gap-3 px-6">
          {firstName && (
            <span className="text-sm text-[#6B5E57]">
              Good {timeOfDay},{" "}
              <span className="font-semibold text-[#2D2926]">{firstName}</span>
            </span>
          )}
          {inviteCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9B3D42] bg-[#FFF0EE] px-3 py-1 rounded-full">
              <Sparkles className="w-3 h-3" />
              {inviteCount} surprise{inviteCount !== 1 ? "s" : ""} crafted
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {tierBadge && (
            <span className={`hidden sm:inline-block text-xs font-semibold px-3 py-1 rounded-full ${tierBadge.cls}`}>
              {tierBadge.label}
            </span>
          )}

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
