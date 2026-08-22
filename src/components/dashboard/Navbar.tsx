"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/actions/auth";
import { resolveProductNav, type ProductRoute } from "./nav-items";
import AppBar from "./AppBar";

interface NavbarProps {
  userEmail?: string;
  userInitial?: string;
  avatarUrl?: string | null;
  subscriptionTier?: string;
  inviteCount?: number;
  /** Kept for callers; the greeting itself now lives in the page headline,
   *  matching the mockup's `.phead` rather than duplicating it in the bar. */
  greetingName?: string;
  /** Which product surface is being viewed — highlights the matching nav item. */
  activeRoute?: ProductRoute;
}

export default function Navbar({
  userEmail,
  userInitial = "U",
  avatarUrl,
  subscriptionTier = "free",
  inviteCount = 0,
  activeRoute,
}: NavbarProps) {
  const router = useRouter();
  const tierBadge =
    subscriptionTier === "unlimited"
      ? "Unlimited"
      : subscriptionTier === "plus"
      ? "Plus"
      : null;

  const navItems = resolveProductNav(activeRoute);

  return (
    <>
      {/* Mockup `.topnav` (L44-47): paper, mist hairline, sticky. The greeting
          that used to live here moved to the dashboard's `.phead` headline,
          which is where the mockup puts it — one greeting, not two. */}
      <nav className="bg-paper border-b border-mist px-5 sm:px-6 py-3.5 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link href="/dashboard" className="font-heading text-xl tracking-tight shrink-0">
            TaDaaaa<span className="text-coral">.</span>
          </Link>

          {/* Product nav — mockup `.navlinks`, hidden below sm exactly as the
              mockup hides it below 760px. The bottom app bar replaces it. */}
          <div className="hidden sm:flex items-center gap-1 mx-auto">
            {navItems.map((item) =>
              item.isActive ? (
                <span
                  key={item.key}
                  aria-current="page"
                  className="px-3.5 py-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-ink shadow-[inset_0_-2px_0_var(--coral)]"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  key={item.key}
                  href={item.href}
                  className="px-3.5 py-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-stone hover:text-ink rounded-[6px] transition-colors"
                >
                  {item.label}
                </Link>
              ),
            )}
          </div>

          <div className="flex items-center gap-3 ml-auto sm:ml-0">
            {tierBadge && (
              <span className="ed-pill ed-pill-live hidden sm:inline-flex">
                {tierBadge}
              </span>
            )}
            {inviteCount > 0 && (
              <span className="hidden lg:inline text-xs text-stone">
                {inviteCount} surprise{inviteCount !== 1 ? "s" : ""} crafted
              </span>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Account menu"
                className="ed-avatar outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  userInitial
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {userEmail && (
                  <div className="px-2 py-1.5 text-xs text-stone border-b border-mist mb-1">
                    {userEmail}
                  </div>
                )}
                <DropdownMenuItem onClick={() => router.push("/settings")} className="cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="text-coral-deep cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      {/* Mobile nav. Mounted here so every authenticated surface gets it and
          no signed-out route can — this component only renders with a session. */}
      <AppBar activeRoute={activeRoute} />
    </>
  );
}
