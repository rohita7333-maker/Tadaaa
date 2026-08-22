"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BTN, BTN_CORAL, TLINK_INK } from "./editorial";

const LINKS = [
  { href: "/templates", label: "Templates" },
  { href: "/create", label: "Create" },
  { href: "/pricing", label: "Pricing" },
] as const;

/**
 * Marketing top nav — mockup `.topnav`.
 *
 * Sticky paper bar with a mist hairline, centered uppercase link rail, and the
 * signed-out auth pair on the right. The link rail collapses below 760px
 * exactly as the mockup does (`@media(max-width:760px){.topnav .navlinks{display:none}}`);
 * the footer carries the same destinations on small screens.
 */
export default function Navbar() {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-[700] border-b border-mist bg-paper">
      {/* Mockup padding/gap are 20px/18px; below 360px they are tightened so the
          logo + auth pair still fit without horizontal scroll. */}
      <div className="mx-auto flex max-w-[1080px] items-center gap-2 px-4 py-3.5 min-[360px]:gap-[18px] min-[360px]:px-5">
        <Link
          href="/"
          className="font-heading text-xl tracking-[-0.01em] text-ink"
        >
          TaDaaaa<span className="text-coral">.</span>
        </Link>

        <nav
          aria-label="Main"
          className="mx-auto hidden gap-1 min-[761px]:flex"
        >
          {LINKS.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-[var(--r-sm)] px-3.5 py-2 text-[13px] font-semibold uppercase tracking-[0.06em] transition-colors ${
                  active
                    ? "text-ink shadow-[inset_0_-2px_0_var(--coral)]"
                    : "text-stone hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 min-[360px]:gap-3 min-[761px]:ml-0">
          <Link
            href="/auth/signin"
            className={`${TLINK_INK} whitespace-nowrap text-[13px] font-semibold tracking-[0.04em]`}
          >
            Log in
          </Link>
          <Link
            href="/auth/signup"
            /* mockup .btn-sm is 18px of side padding; tightened below 360px so
               the nav row clears a 320px viewport */
            className={`${BTN} ${BTN_CORAL} whitespace-nowrap px-3.5 py-[9px] text-[11px] min-[360px]:px-[18px]`}
          >
            Get started
          </Link>
        </div>
      </div>
    </div>
  );
}
