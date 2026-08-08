"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Signed-out "Sign in" link in the /create header. Preserves the current
 * query string (e.g. ?template=X) through the auth round-trip so picking a
 * template while signed out doesn't lose the intent. Reads window.location
 * directly (mirrors readTemplateParam in create/page.tsx) rather than
 * useSearchParams to avoid a Suspense boundary requirement in this
 * server-rendered layout.
 */
export default function CreateSignInLink() {
  const [href, setHref] = useState("/auth/signin?next=/create");

  useEffect(() => {
    const next = `/create${window.location.search}`;
    // External-state sync from window.location on mount (SSR has no
    // location) — same pattern as readGiftId/readTemplateParam in
    // create/page.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHref(`/auth/signin?next=${encodeURIComponent(next)}`);
  }, []);

  return (
    <Link
      href={href}
      className="text-sm text-[#6B5E57] hover:text-[#C4686D] transition-colors font-medium"
    >
      Sign in
    </Link>
  );
}
