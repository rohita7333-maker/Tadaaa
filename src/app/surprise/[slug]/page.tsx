import { type Metadata } from "next";
import { headers } from "next/headers";
import { getInviteBySlug } from "@/actions/invite";
import { logInviteViewBySlug } from "@/lib/invite-view";
import { getIp } from "@/lib/rate-limit";
import { getThemeById } from "@/lib/themes";
import { isExpired } from "@/lib/utils";
import TapToReveal from "@/components/surprise/TapToReveal";
import CountdownReveal from "@/components/surprise/CountdownReveal";
import ReportButton from "@/components/surprise/ReportButton";
import Link from "next/link";
import { Heart } from "lucide-react";
import { MagneticButton } from "@/components/ui/magnetic-button";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const invite = await getInviteBySlug(slug);
  if (!invite) return { title: "Surprise not found" };

  const firstPhoto = invite.photos?.[0];

  return {
    title: `${invite.title} — TaDaaaa`,
    description: "Someone made something special for you ✨",
    robots: "noindex",
    openGraph: {
      title: `${invite.title} — You have a surprise!`,
      description: "Tap to see what's waiting for you ✨",
      images: firstPhoto?.url ? [{ url: firstPhoto.url }] : [],
    },
  };
}

export default async function SurprisePage({ params }: Props) {
  const { slug } = await params;
  const invite = await getInviteBySlug(slug);

  if (!invite) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex flex-col items-center justify-center px-6 text-center">
        <span className="text-6xl mb-6">🔍</span>
        <h1 className="font-heading text-3xl text-[#2D2926] mb-3">
          This surprise doesn&apos;t exist
        </h1>
        <p className="text-[#6B5E57] mb-8">
          The link may be invalid or the surprise was deleted.
        </p>
        <Link href="/" aria-label="Create your own surprise">
          <MagneticButton type="button" tabIndex={-1}>
            <Heart className="w-4 h-4 fill-white" />
            Create your own surprise
          </MagneticButton>
        </Link>
      </div>
    );
  }

  if (!invite.is_active) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex flex-col items-center justify-center px-6 text-center">
        <span className="text-6xl mb-6">💌</span>
        <h1 className="font-heading text-3xl text-[#2D2926] mb-3">
          This surprise is no longer available
        </h1>
        <p className="text-[#6B5E57]">
          The creator has deactivated this page.
        </p>
      </div>
    );
  }

  if (isExpired(invite.expires_at)) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex flex-col items-center justify-center px-6 text-center">
        <span className="text-6xl mb-6">⏰</span>
        <h1 className="font-heading text-3xl text-[#2D2926] mb-3">
          This surprise has expired
        </h1>
        <p className="text-[#6B5E57] mb-8">
          The moment has passed, but the memory lives on.
        </p>
        <Link href="/" aria-label="Create a new surprise">
          <MagneticButton type="button" tabIndex={-1}>
            Create a new surprise
          </MagneticButton>
        </Link>
      </div>
    );
  }

  const theme = getThemeById(invite.theme) ?? getThemeById("warm-embrace")!;
  const ownerPhotos = (invite.photos || []) as { url: string; caption?: string; rotation_deg?: number }[];
  const contributions = ((invite as { contributions?: { contributor_name: string; message: string | null; photo_url: string | null }[] }).contributions) ?? [];

  // Merge contributions into the polaroid carousel. Photo contributions
  // become real polaroids (caption shows contributor's name + their note
  // if they wrote one). Message-only contributions get a "letter" polaroid
  // — no image, just the note signed by the contributor — so they aren't
  // silently dropped.
  const contributionPhotos = contributions
    .filter((c) => !!c.photo_url)
    .map((c) => ({
      url: c.photo_url as string,
      caption: c.message
        ? `${c.message} — ${c.contributor_name}`
        : `from ${c.contributor_name}`,
    }));
  const photos = [...ownerPhotos, ...contributionPhotos];

  // Contributor letters (no photo, just a note) are surfaced as a roster
  // beneath the polaroids — passed to the reveal so it can render them
  // alongside the photo stack without overhauling the carousel logic.
  const contributorNotes = contributions
    .filter((c) => !c.photo_url && c.message)
    .map((c) => ({
      contributor_name: c.contributor_name,
      message: c.message as string,
    }));
  const questions = (invite.questions as { id: string; question_text: string; yes_label: string; no_label: string; require_answer: boolean }[]) || [];
  const enableDodge = (invite as { enable_dodge_no?: boolean }).enable_dodge_no ?? true;
  const videoUrl = (invite as { videoUrl?: string | null }).videoUrl ?? null;

  // Log view directly via the shared lib — no env-URL hop, no silent
  // failure when NEXT_PUBLIC_APP_URL is missing.
  const hdrs = await headers();
  void logInviteViewBySlug(
    invite.slug,
    hdrs.get("user-agent") ?? "",
    getIp(hdrs)
  );

  return (
    <div className="fixed inset-0 overflow-hidden">
      <ReportButton inviteId={invite.id} />
      {invite.reveal_type === "countdown" && invite.countdown_date ? (
        <CountdownReveal
          theme={theme}
          photos={photos}
          title={invite.title}
          message={invite.message}
          countdownDate={invite.countdown_date}
          questions={questions}
          inviteId={invite.id}
          enableDodge={enableDodge}
          videoUrl={videoUrl}
          contributorNotes={contributorNotes}
        />
      ) : (
        <TapToReveal
          theme={theme}
          photos={photos}
          title={invite.title}
          message={invite.message}
          questions={questions}
          inviteId={invite.id}
          enableDodge={enableDodge}
          videoUrl={videoUrl}
          contributorNotes={contributorNotes}
        />
      )}
    </div>
  );
}
