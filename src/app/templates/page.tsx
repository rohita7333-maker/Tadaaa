import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import TemplatesPageClient from "@/components/templates/TemplatesPageClient";
import DashboardNavServer from "@/components/dashboard/DashboardNavServer";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Reveal Templates for Every Occasion — TaDaaaa",
  description:
    "Browse TaDaaaa's animated reveal templates — birthdays, proposals, festivals, apologies and more. Pick one, add your words and photos, and send a moment they'll never forget.",
};

// Public marketplace route — no auth gate, but the top chrome adapts:
// - Signed in (e.g. arriving from the dashboard's "Templates" link): render the
//   dashboard's authenticated header (avatar, greeting, account menu) so the
//   page reads as "inside my app", not "logged out on a marketing page".
// - Signed out: the public marketing Navbar + Footer (SEO-friendly), plus the
//   marketing-only sections (how it works, pricing panel) inside the page.
export default async function TemplatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthed = !!user;

  return (
    <div className="min-h-screen bg-paper">
      {isAuthed ? <DashboardNavServer activeRoute="templates" /> : <Navbar />}
      <main>
        <TemplatesPageClient authedChrome={isAuthed} />
      </main>
      {!isAuthed && <Footer />}
    </div>
  );
}
