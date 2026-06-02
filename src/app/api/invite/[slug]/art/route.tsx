import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getActiveTier } from "@/lib/tier";
import {
  canUseDesignerArt,
  getTemplate,
  resolveStyle,
  occasionEyebrow,
} from "@/lib/designer-art";
import { buildDesignerCard } from "@/lib/designer-art-render";
import { getOgFonts } from "@/lib/og-fonts";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const style = resolveStyle(new URL(req.url).searchParams.get("style"));
  const supabase = createAdminClient();

  const { data: invite } = await supabase
    .from("invites")
    .select("title, occasion_type, creator_id, is_active, expires_at")
    .eq("slug", slug)
    .maybeSingle();

  if (
    !invite ||
    !invite.is_active ||
    (invite.expires_at && new Date(invite.expires_at) < new Date())
  ) {
    return NextResponse.json({ error: "inactive" }, { status: 410 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, subscription_expires_at")
    .eq("id", invite.creator_id)
    .maybeSingle();

  const tier = getActiveTier(profile ?? null);
  if (!canUseDesignerArt(tier)) {
    return NextResponse.json({ error: "upgrade_required" }, { status: 403 });
  }

  const t = getTemplate(invite.occasion_type, style);
  const title = invite.title || t.label;
  const eyebrow = occasionEyebrow(invite.occasion_type);
  const fonts = await getOgFonts();

  return new ImageResponse(
    buildDesignerCard({
      template: t,
      title,
      occasionLabel: eyebrow,
      width: 1200,
      height: 1500,
      style,
    }),
    {
      width: 1200,
      height: 1500,
      fonts,
      headers: {
        "Content-Disposition": `attachment; filename="${slug}-invite.png"`,
      },
    }
  );
}
