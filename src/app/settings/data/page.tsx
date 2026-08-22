import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import DashboardNavServer from "@/components/dashboard/DashboardNavServer";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Your Data — TaDaaaa" };

export default async function DataPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signin");

  return (
    <div className="min-h-screen bg-paper">
      <DashboardNavServer activeRoute="settings" />

      <div className="max-w-[560px] mx-auto px-5 sm:px-6 pt-8 pb-16">
        <div className="ed-phead">
          <div>
            <Link
              href="/settings"
              className="ed-tlink !text-stone inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.6} />
              Settings
            </Link>
            <h1 className="mt-1.5">Your data</h1>
            <div className="ed-sub">
              Everything we have about you, as one JSON file. This honours your
              GDPR right to data portability.
            </div>
          </div>
        </div>

        <div className="ed-panel">
          <h2>What you get</h2>
          <ul className="text-sm text-stone leading-relaxed list-disc pl-5 space-y-1.5">
            <li>Your profile and notification preferences</li>
            <li>Every surprise you&apos;ve created</li>
            <li>Photos, questions, answers and RSVPs on those surprises</li>
            <li>Your full account audit log (sign-ins, changes, and so on)</li>
          </ul>
          <p className="text-xs text-stone mt-4 leading-relaxed">
            Limit: 5 downloads per day. The file is plain JSON — open it in any
            text editor or read it from a script.
          </p>
          <a
            href="/api/account/export"
            download
            className="ed-btn ed-btn-coral ed-btn-sm ed-btn-block mt-5"
          >
            <Download className="w-4 h-4" strokeWidth={1.6} />
            Download my data
          </a>
        </div>

        <div className="ed-appbar-gutter sm:hidden" aria-hidden="true" />
      </div>
    </div>
  );
}
