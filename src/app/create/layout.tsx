import Link from "next/link";
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
 * No max-w wrapper here: the wizard hub already centres itself at 1080px
 * (mockup `.wrap`).
 */
export default async function CreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getDashboardUser();

  return (
    <div className="min-h-screen bg-paper">
      {user ? (
        <DashboardNavServer activeRoute="create" />
      ) : (
        <header className="bg-paper border-b border-mist px-5 py-3.5 sticky top-0 z-40">
          <div className="max-w-[1080px] mx-auto flex items-center justify-between gap-4">
            <Link href="/" className="font-heading text-xl tracking-[-0.01em] text-ink">
              TaDaaaa<span className="text-coral">.</span>
            </Link>
            <CreateSignInLink />
          </div>
        </header>
      )}
      {children}
    </div>
  );
}
