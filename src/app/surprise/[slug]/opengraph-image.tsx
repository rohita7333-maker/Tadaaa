import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/server";
import { getActiveTier } from "@/lib/tier";
import { canUseDesignerArt, getTemplate } from "@/lib/designer-art";

export const alt = "Someone made a surprise for you!";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const occasionEmojis: Record<string, string> = {
  date: "🌹",
  birthday: "🎂",
  festival: "✨",
  mothers_day: "💐",
  apology: "🙏",
  custom: "💌",
};

const occasionLabels: Record<string, string> = {
  date: "A Special Invitation",
  birthday: "Birthday Surprise!",
  festival: "Festival Greetings",
  mothers_day: "For You, Mom ❤️",
  apology: "A Heartfelt Message",
  custom: "A Surprise For You",
};

export default async function InviteOGImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = createAdminClient();
  const { data: invite } = await supabase
    .from("invites")
    .select("title, occasion_type, theme, creator_id, reveal_type")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  const occasion = invite?.occasion_type || "custom";
  const emoji = occasionEmojis[occasion] || "💌";
  const label = invite?.title || occasionLabels[occasion] || "A Surprise For You";

  // D2: paid owners get an occasion-tuned designer share-card; free owners
  // keep the default palette. Owner tier, not viewer tier, drives this.
  let paid = false;
  if (invite?.creator_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier, subscription_expires_at")
      .eq("id", invite.creator_id)
      .maybeSingle();
    paid = canUseDesignerArt(getActiveTier(profile ?? null));
  }
  const tpl = getTemplate(occasion);

  // Scroll Story reveals get a dusk-gradient card that echoes the cinematic
  // scroll's palette (charcoal → rose → blush). Tap/countdown cards are left
  // byte-identical: their background + title color are unchanged.
  const isScrollStory = invite?.reveal_type === "scroll_story";
  const cardBackground = isScrollStory
    ? "linear-gradient(135deg, #3E3733 0%, #9B3D42 55%, #E8A5A8 100%)"
    : paid
      ? tpl.background
      : "linear-gradient(135deg, #FFF8F0 0%, #F5E6E0 100%)";
  const titleColor = isScrollStory ? "#FFF6F2" : paid ? tpl.accent : "#2D2926";

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: cardBackground,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Background pattern */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "radial-gradient(ellipse at 30% 40%, rgba(196,104,109,0.12) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(201,169,110,0.08) 0%, transparent 60%)",
          }}
        />

        {/* Emoji */}
        <div style={{ fontSize: 80, marginBottom: 16 }}>{emoji}</div>

        {/* Title */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: titleColor,
            textAlign: "center",
            maxWidth: 800,
            lineHeight: 1.2,
            marginBottom: 12,
          }}
        >
          {label}
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 24,
            color: isScrollStory ? "rgba(255,246,242,0.82)" : "#6B5E57",
            textAlign: "center",
          }}
        >
          Someone special made this for you
        </div>

        {/* CTA bar */}
        <div
          style={{
            marginTop: 32,
            background: "linear-gradient(135deg, #C4686D 0%, #9B3D42 100%)",
            color: "white",
            fontSize: 22,
            fontWeight: 600,
            padding: "14px 40px",
            borderRadius: 16,
          }}
        >
          Tap to Open ✨
        </div>

        {/* Branding */}
        <div
          style={{
            position: "absolute",
            bottom: 30,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: "linear-gradient(135deg, #C4686D 0%, #9B3D42 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <div style={{ fontSize: 16, color: "#C4686D", fontWeight: 600 }}>
            Made with TaDaaaa
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
