import Link from "next/link";
import { ArrowLeft, Download, FileJson } from "lucide-react";
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
    <div className="min-h-screen bg-[#FAF9F6] py-10 px-6">
      <div className="max-w-xl mx-auto">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-[#6F6E68] hover:text-[#3E6B5C] transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to settings
        </Link>

        <h1 className="font-heading text-3xl text-[#1A1B18] mb-2">Your Data</h1>
        <p className="text-[#6F6E68] mb-8 text-sm leading-relaxed">
          Download everything we have about you as a JSON file. This honors
          your GDPR right to data portability.
        </p>

        <section className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(26,27,24,0.06)] border border-[#E9E6DF]/30 mb-5">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-xl bg-[#FFF0E8] flex items-center justify-center">
              <FileJson className="w-4 h-4 text-[#3E6B5C]" />
            </div>
            <h2 className="font-heading text-lg text-[#1A1B18]">What you get</h2>
          </div>
          <ul className="text-sm text-[#1A1B18] space-y-2 mb-6 leading-relaxed">
            <li>• Your profile + notification preferences</li>
            <li>• Every surprise you&apos;ve created</li>
            <li>• Photos, questions, answers, and RSVPs on those surprises</li>
            <li>• Your full account audit log (sign-ins, changes, etc.)</li>
          </ul>
          <p className="text-xs text-[#6F6E68] mb-5 leading-relaxed">
            Limit: 5 downloads per day. The file is plain JSON — open it in
            any text editor or import it into a script.
          </p>
          <a
            href="/api/account/export"
            download
            className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-gradient-to-r from-[#3E6B5C] to-[#2E5145] text-white text-sm font-semibold hover:from-[#2E5145] hover:to-[#3E6B5C] transition-all duration-300 hover:scale-[1.01] shadow-md shadow-[#3E6B5C]/20"
          >
            <Download className="w-4 h-4" />
            Download my data (JSON)
          </a>
        </section>
      </div>
    </div>
  );
}
