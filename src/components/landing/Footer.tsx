import Link from "next/link";

const LINKS = [
  { href: "/templates", label: "Templates" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#how", label: "How it works" },
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

/** Mockup `footer.foot`. */
export default function Footer() {
  return (
    <footer className="border-t border-mist px-6 pt-14 pb-14">
      <div className="mx-auto flex max-w-[1080px] flex-wrap items-center justify-between gap-5">
        <div>
          <Link href="/" className="font-heading text-xl tracking-[-0.01em] text-ink">
            TaDaaaa<span className="text-coral">.</span>
          </Link>
          <span className="ml-3 text-[13px] text-stone">© 2026 TaDaaaa</span>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap gap-[22px]">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[13px] text-stone hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
