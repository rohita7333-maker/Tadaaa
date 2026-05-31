import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getActiveTier } from "@/lib/tier";
import { canUseDesignerArt, getTemplate, resolveStyle } from "@/lib/designer-art";

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

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 1500,
          background: t.background,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 200, lineHeight: 1 }}>{t.emoji}</div>
        <div
          style={{
            fontSize: 88,
            fontWeight: 700,
            color: t.accent,
            marginTop: 48,
            textAlign: "center",
            padding: "0 96px",
            display: "flex",
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 34, color: "#6B5E57", marginTop: 28 }}>
          made with TaDaaaa
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 1500,
      headers: {
        "Content-Disposition": `attachment; filename="${slug}-invite.png"`,
      },
    }
  );
}
