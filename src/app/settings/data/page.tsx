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
    <div className="min-h-screen bg-[#FFF8F0] py-10 px-6">
      <div className="max-w-xl mx-auto">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-[#6B5E57] hover:text-[#C4686D] transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to settings
        </Link>

        <h1 className="font-heading text-3xl text-[#2D2926] mb-2">Your Data</h1>
        <p className="text-[#6B5E57] mb-8 text-sm leading-relaxed">
          Download everything we have about you as a JSON file. This honors
          your GDPR right to data portability.
        </p>

        <section className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(45,41,38,0.06)] border border-[#D4CBC3]/30 mb-5">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-xl bg-[#FFF0E8] flex items-center justify-center">
              <FileJson className="w-4 h-4 text-[#C4686D]" />
            </div>
            <h2 className="font-heading text-lg text-[#2D2926]">What you get</h2>
          </div>
          <ul className="text-sm text-[#2D2926] space-y-2 mb-6 leading-relaxed">
            <li>• Your profile + notification preferences</li>
            <li>• Every surprise you&apos;ve created</li>
            <li>• Photos, questions, answers, and RSVPs on those surprises</li>
            <li>• Your full account audit log (sign-ins, changes, etc.)</li>
          </ul>
          <p className="text-xs text-[#6B5E57] mb-5 leading-relaxed">
            Limit: 5 downloads per day. The file is plain JSON — open it in
            any text editor or import it into a script.
          </p>
          <a
            href="/api/account/export"
            download
            className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-gradient-to-r from-[#C4686D] to-[#9B3D42] text-white text-sm font-semibold hover:from-[#9B3D42] hover:to-[#C4686D] transition-all duration-300 hover:scale-[1.01] shadow-md shadow-[#C4686D]/20"
          >
            <Download className="w-4 h-4" />
            Download my data (JSON)
          </a>
        </section>
      </div>
    </div>
  );
}
