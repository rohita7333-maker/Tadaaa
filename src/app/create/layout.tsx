import Link from "next/link";
import { Heart } from "lucide-react";
import DashboardNavServer from "@/components/dashboard/DashboardNavServer";
import CreateSignInLink from "@/components/auth/CreateSignInLink";
import { getDashboardUser } from "@/lib/dashboard-data";

/**
 * The wizard is reachable signed-out (auth is demanded at publish / premium
 * unlock), so the chrome branches here rather than inside the client page:
 * - Signed in: the shared authenticated bar, same as dashboard/templates.
 * - Signed out: a minimal logo bar so the page still has a way home.
 *
 * Either way the wizard body owns no bar of its own — one logo, never two.
 * No max-w wrapper here: the wizard already centres itself at max-w-2xl.
 */
export default async function CreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getDashboardUser();

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      {user ? (
        <DashboardNavServer activeRoute="create" />
      ) : (
        <header className="bg-white border-b border-[#D4CBC3]/40 px-6 py-4 sticky top-0 z-40">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Heart className="w-5 h-5 fill-[#C4686D] text-[#C4686D]" />
              <span className="font-heading text-lg text-[#2D2926]">TaDaaaa</span>
            </Link>
            <CreateSignInLink />
          </div>
        </header>
      )}
      {children}
    </div>
  );
}
