"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Heart, Menu, X } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { easings, durations, makeReducedMotionTransition } from "@/lib/motion";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/90 backdrop-blur-md border-b border-[#E9E6DF]/40 shadow-[0_2px_12px_rgba(26,27,24,0.06)]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#3E6B5C] to-[#2E5145] flex items-center justify-center group-hover:scale-105 transition-transform">
            <Heart className="w-4 h-4 fill-white text-white" />
          </div>
          <span className="font-heading text-lg text-[#1A1B18] font-semibold">TaDaaaa</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-6">
          <Link
            href="#how-it-works"
            className="text-[#6F6E68] hover:text-[#1A1B18] text-sm font-medium transition-colors"
          >
            How it works
          </Link>
          <Link
            href="/templates"
            className="text-[#6F6E68] hover:text-[#1A1B18] text-sm font-medium transition-colors"
          >
            Templates
          </Link>
          <Link
            href="/pricing"
            className="text-[#6F6E68] hover:text-[#1A1B18] text-sm font-medium transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/about"
            className="text-[#6F6E68] hover:text-[#1A1B18] text-sm font-medium transition-colors"
          >
            About
          </Link>
        </div>

        {/* Desktop auth buttons */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/auth/signin"
            className="text-sm font-medium text-[#1A1B18] hover:text-[#3E6B5C] transition-colors px-4 py-2"
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="text-sm font-semibold text-white bg-gradient-to-r from-[#3E6B5C] to-[#2E5145] hover:from-[#2E5145] hover:to-[#3E6B5C] px-5 py-2.5 rounded-xl transition-all duration-300 hover:scale-[1.03] shadow-[0_2px_12px_rgba(62,107,92,0.35)] hover:shadow-[0_4px_20px_rgba(62,107,92,0.5)]"
          >
            Sign up free
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="sm:hidden w-9 h-9 flex items-center justify-center text-[#1A1B18]"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu — opacity+y only (no height animation = no layout thrash) */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={makeReducedMotionTransition(reducedMotion, {
              duration: durations.quick,
              ease: easings.entrance,
            })}
            className="sm:hidden overflow-hidden bg-white/95 backdrop-blur-md border-b border-[#E9E6DF]/40"
          >
            <div className="px-6 py-4 flex flex-col gap-3">
              <Link
                href="#how-it-works"
                onClick={() => setMobileOpen(false)}
                className="text-[#6F6E68] hover:text-[#1A1B18] text-sm font-medium py-2"
              >
                How it works
              </Link>
              <Link
                href="/templates"
                className="text-[#6F6E68] hover:text-[#1A1B18] text-sm font-medium py-2"
              >
                Templates
              </Link>
              <Link
                href="/pricing"
                className="text-[#6F6E68] hover:text-[#1A1B18] text-sm font-medium py-2"
              >
                Pricing
              </Link>
              <Link
                href="/about"
                onClick={() => setMobileOpen(false)}
                className="text-[#6F6E68] hover:text-[#1A1B18] text-sm font-medium py-2"
              >
                About
              </Link>
              <div className="border-t border-[#E9E6DF]/40 pt-3 flex flex-col gap-2">
                <Link
                  href="/auth/signin"
                  className="text-center text-sm font-medium text-[#1A1B18] border border-[#E9E6DF] rounded-xl py-2.5 hover:bg-[#FAF9F6] transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  className="text-center text-sm font-semibold text-white bg-gradient-to-r from-[#3E6B5C] to-[#2E5145] rounded-xl py-2.5 shadow-sm"
                >
                  Sign up free
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
