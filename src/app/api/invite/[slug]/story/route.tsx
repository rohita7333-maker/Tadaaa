import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getActiveTier } from "@/lib/tier";
import { canUseDesignerArt, getTemplate } from "@/lib/designer-art";

/**
 * D3 — Story Export
 * 1080×1920 vertical PNG, paid-gated (plus/unlimited).
 * Same gate pattern as art/route.tsx: 410 inactive/expired, 403 free, 200 PNG attachment.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
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

  const t = getTemplate(invite.occasion_type);
  const title = invite.title || t.label;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1080,
          height: 1920,
          background: t.background,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 240, lineHeight: 1 }}>{t.emoji}</div>
        <div
          style={{
            fontSize: 96,
            fontWeight: 700,
            color: t.accent,
            marginTop: 60,
            textAlign: "center",
            padding: "0 80px",
            display: "flex",
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 40, color: "#6B5E57", marginTop: 40, position: "absolute", bottom: 80 }}>
          made with TaDaaaa
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
      headers: {
        "Content-Disposition": `attachment; filename="${slug}-story.png"`,
      },
    }
  );
}
