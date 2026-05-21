import Link from "next/link";
import { Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-[#D4CBC3]/40 py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Heart className="w-5 h-5 fill-[#C4686D] text-[#C4686D]" />
            <span className="font-heading text-lg text-[#2D2926]">TaDaaaa</span>
          </Link>

          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#6B5E57] justify-center">
            <Link href="/#how-it-works" className="hover:text-[#C4686D] transition-colors">
              How it works
            </Link>
            <Link href="/pricing" className="hover:text-[#C4686D] transition-colors">
              Pricing
            </Link>
            <Link href="/auth/signup" className="hover:text-[#C4686D] transition-colors">
              Get started
            </Link>
            <Link href="/auth/signin" className="hover:text-[#C4686D] transition-colors">
              Sign in
            </Link>
            <Link href="/privacy" className="hover:text-[#C4686D] transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[#C4686D] transition-colors">
              Terms
            </Link>
            <a href="mailto:hello@tadaaaa.app" className="hover:text-[#C4686D] transition-colors">
              Contact
            </a>
          </nav>

          <p className="text-[#6B5E57] text-sm">
            Made with{" "}
            <Heart className="w-3.5 h-3.5 fill-[#C4686D] text-[#C4686D] inline" />{" "}
            for love
          </p>
        </div>
      </div>
    </footer>
  );
}
