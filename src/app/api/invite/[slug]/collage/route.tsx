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
import { signPhotoList } from "@/lib/sign-storage";
import { STORAGE_BUCKET } from "@/lib/constants";
import { styleToMode } from "@/lib/designer-art-render";

/** Short TTL is fine — the signed URLs are only used during the Satori render. */
const COLLAGE_PHOTO_TTL = 60;

const WIDTH = 1200;
const HEIGHT = 1500;

/**
 * D4 — Photo Collage Art
 * Paid-gated (plus/unlimited). 1200×1500 PNG.
 * - With photos: renders a framed grid collage inside the new editorial/modern bg treatment.
 * - No photos: falls back to D1 single-card editorial layout.
 * Gate: 410 inactive/expired, 403 free, 200 PNG attachment.
 * Accepts ?style=classic|bold|minimal (unknown → classic).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const style = resolveStyle(new URL(req.url).searchParams.get("style"));
  const supabase = createAdminClient();

  const { data: invite } = await supabase
    .from("invites")
    .select("id, title, occasion_type, creator_id, is_active, expires_at")
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

  // Load up to 9 photos (3×3 grid max).
  const { data: photoRows } = await supabase
    .from("invite_photos")
    .select("storage_path, caption, rotation_deg, sort_order")
    .eq("invite_id", invite.id)
    .order("sort_order", { ascending: true })
    .limit(9);

  const rawPhotos = (photoRows ?? []).map((r) => ({
    storage_path: r.storage_path as string,
    caption: (r.caption ?? "") as string,
    rotation_deg: (r.rotation_deg ?? 0) as number,
    sort_order: (r.sort_order ?? 0) as number,
  }));

  const signedPhotos =
    rawPhotos.length > 0
      ? await signPhotoList(STORAGE_BUCKET, rawPhotos, COLLAGE_PHOTO_TTL, {
          inviteSlug: slug,
        })
      : [];

  // If no photos available, render D1 single-card fallback.
  if (signedPhotos.length === 0) {
    return new ImageResponse(
      buildDesignerCard({
        template: t,
        title,
        occasionLabel: eyebrow,
        width: WIDTH,
        height: HEIGHT,
        style,
      }),
      {
        width: WIDTH,
        height: HEIGHT,
        fonts,
        headers: {
          "Content-Disposition": `attachment; filename="${slug}-collage.png"`,
        },
      }
    );
  }

  // Grid collage wrapped in the new background + frame treatment.
  const cols = signedPhotos.length === 1 ? 1 : signedPhotos.length <= 4 ? 2 : 3;
  const gridWidth = 1080; // photo grid is 1080 wide, centered in 1200
  const cellSize = Math.floor(gridWidth / cols);
  const gridRows = Math.ceil(signedPhotos.length / cols);
  const gridHeight = cellSize * gridRows;

  const mode = styleToMode(style);
  const isModern = mode === "modern";

  // Shared colors
  const accentColor = t.accent;
  const bgGradient = t.bgDeep ?? t.background;
  const glowColor = t.glow ?? "rgba(255,255,255,0.18)";
  const interFamily = "Inter, system-ui, sans-serif";
  const fraunceFamily = "Fraunces, Georgia, serif";
  const isQuiet = mode === "quiet";

  const eyebrowColor = isQuiet ? t.accent : accentColor;
  const titleColor = isQuiet ? t.accent : accentColor;
  const titleFamily = isModern ? interFamily : fraunceFamily;
  const titleWeight = isModern ? 700 : 600;

  const cardBg = isQuiet
    ? "rgba(255,252,250,0.88)"
    : isModern
      ? "transparent"
      : "rgba(255,255,255,0.06)";
  const cardBorder = isQuiet
    ? "1px solid rgba(180,140,130,0.28)"
    : isModern
      ? "none"
      : "1px solid rgba(255,255,255,0.40)";
  const cardShadow = isQuiet
    ? "0 8px 48px rgba(0,0,0,0.10)"
    : isModern
      ? "none"
      : "0 8px 64px rgba(0,0,0,0.28)";

  // Top/bottom padding to keep within HEIGHT
  const topPad = 80;
  const headerHeight = 180; // eyebrow + title block
  const footerHeight = 70;
  const availableGridHeight = HEIGHT - topPad - headerHeight - footerHeight - 40;
  const maxCellSize = Math.floor(availableGridHeight / gridRows);
  const finalCellSize = Math.min(cellSize, maxCellSize);
  const finalGridWidth = finalCellSize * cols;
  const finalGridHeight = finalCellSize * gridRows;

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          backgroundImage: bgGradient,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          position: "relative",
          overflow: "hidden",
          paddingTop: topPad,
        }}
      >
        {/* Glow layer */}
        {!isModern && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `radial-gradient(ellipse 80% 40% at 50% 0%, ${glowColor} 0%, transparent 70%)`,
              display: "flex",
            }}
          />
        )}

        {/* Vignette bottom */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 200,
            backgroundImage:
              "linear-gradient(to top, rgba(0,0,0,0.25) 0%, transparent 100%)",
            display: "flex",
          }}
        />

        {/* Modern accent circles */}
        {isModern && (
          <>
            <div
              style={{
                position: "absolute",
                top: -100,
                right: -100,
                width: 550,
                height: 550,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.07)",
                display: "flex",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 80,
                right: -60,
                width: 350,
                height: 350,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.04)",
                display: "flex",
              }}
            />
          </>
        )}

        {/* Header card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: isModern ? "flex-start" : "center",
            width: WIDTH - 120,
            background: cardBg,
            border: cardBorder,
            borderRadius: isModern ? 0 : 24,
            boxShadow: cardShadow,
            padding: "28px 40px",
            marginBottom: 24,
            position: "relative",
          }}
        >
          {/* Eyebrow */}
          <div
            style={{
              fontFamily: interFamily,
              fontWeight: 700,
              fontSize: 22,
              letterSpacing: 8,
              color: eyebrowColor,
              opacity: 0.80,
              display: "flex",
            }}
          >
            {eyebrow}
          </div>

          {/* Title */}
          <div
            style={{
              fontFamily: titleFamily,
              fontWeight: titleWeight,
              fontSize: 72,
              lineHeight: 1.05,
              color: titleColor,
              letterSpacing: isModern ? -2 : 0,
              textAlign: isModern ? "left" : "center",
              marginTop: 12,
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            {isModern ? `${t.emoji}  ` : ""}
            {title}
          </div>

          {/* Accent bar (modern only) */}
          {isModern && (
            <div
              style={{
                marginTop: 16,
                width: 60,
                height: 5,
                borderRadius: 3,
                background: accentColor,
                opacity: 0.70,
                display: "flex",
              }}
            />
          )}
        </div>

        {/* Photo grid — framed */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: isQuiet
              ? "rgba(255,252,250,0.75)"
              : "rgba(255,255,255,0.06)",
            border: isQuiet
              ? "1px solid rgba(180,140,130,0.22)"
              : "1px solid rgba(255,255,255,0.22)",
            borderRadius: 20,
            padding: 10,
            boxShadow: isQuiet
              ? "0 4px 32px rgba(0,0,0,0.08)"
              : "0 4px 32px rgba(0,0,0,0.22)",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              width: finalGridWidth,
              height: finalGridHeight,
              borderRadius: 12,
              overflow: "hidden",
              gap: 0,
            }}
          >
            {signedPhotos.map((photo, i) => (
              <div
                key={i}
                style={{
                  width: finalCellSize,
                  height: finalCellSize,
                  overflow: "hidden",
                  display: "flex",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt=""
                  width={finalCellSize}
                  height={finalCellSize}
                  style={{
                    width: finalCellSize,
                    height: finalCellSize,
                    objectFit: "cover",
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: interFamily,
            fontWeight: 400,
            fontSize: 24,
            color: accentColor,
            opacity: 0.45,
          }}
        >
          <span style={{ fontSize: 12, display: "flex" }}>✦</span>
          <span style={{ display: "flex" }}>made with TaDaaaa</span>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts,
      headers: {
        "Content-Disposition": `attachment; filename="${slug}-collage.png"`,
      },
    }
  );
}
