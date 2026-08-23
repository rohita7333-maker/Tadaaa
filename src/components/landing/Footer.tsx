import Link from "next/link";
import { Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-[#E9E6DF]/40 py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Heart className="w-5 h-5 fill-[#3E6B5C] text-[#3E6B5C]" />
            <span className="font-heading text-lg text-[#1A1B18]">TaDaaaa</span>
          </Link>

          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#6F6E68] justify-center">
            <Link href="/#how-it-works" className="hover:text-[#3E6B5C] transition-colors">
              How it works
            </Link>
            <Link href="/templates" className="hover:text-[#3E6B5C] transition-colors">
              Templates
            </Link>
            <Link href="/pricing" className="hover:text-[#3E6B5C] transition-colors">
              Pricing
            </Link>
            <Link href="/auth/signup" className="hover:text-[#3E6B5C] transition-colors">
              Get started
            </Link>
            <Link href="/auth/signin" className="hover:text-[#3E6B5C] transition-colors">
              Sign in
            </Link>
            <Link href="/privacy" className="hover:text-[#3E6B5C] transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[#3E6B5C] transition-colors">
              Terms
            </Link>
            <a href="mailto:hello@tadaaaa.app" className="hover:text-[#3E6B5C] transition-colors">
              Contact
            </a>
          </nav>

          <p className="text-[#6F6E68] text-sm">
            Made with{" "}
            <Heart className="w-3.5 h-3.5 fill-[#3E6B5C] text-[#3E6B5C] inline" />{" "}
            for love
          </p>
        </div>
      </div>
    </footer>
  );
}
