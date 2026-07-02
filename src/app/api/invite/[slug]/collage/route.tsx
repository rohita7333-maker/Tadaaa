import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getActiveTier } from "@/lib/tier";
import {
  canUseDesignerArt,
  getTemplate,
  resolveStyle,
  occasionEyebrow,
  occasionWish,
} from "@/lib/designer-art";
import { buildDesignerCard } from "@/lib/designer-art-render";
import { getOgFonts } from "@/lib/og-fonts";
import { signPhotoList } from "@/lib/sign-storage";
import { fetchPhotoAsJpegDataUri } from "@/lib/satori-image";
import { STORAGE_BUCKET } from "@/lib/constants";
import { styleToMode } from "@/lib/designer-art-render";
import {
  getCollageTemplate,
  pickCollageTemplateForCount,
  type CollageSlot,
  type CollageTemplate,
} from "@/lib/collage-templates";

/** Short TTL is fine — the signed URLs are only used during the Satori render. */
const COLLAGE_PHOTO_TTL = 60;

const WIDTH = 1200;
const HEIGHT = 1500;

/**
 * Diamond decoration rendered as a rotated square (Satori-safe).
 * Replaces the ✦ glyph which is absent from the loaded fonts.
 */
function DiamondIcon({ color = "#3a2e2a" }: { color?: string }) {
  return (
    <span
      style={{
        width: 8,
        height: 8,
        background: color,
        opacity: 0.5,
        transform: "rotate(45deg)",
        display: "flex",
      }}
    />
  );
}

/**
 * Renders the polaroid-scrapbook (or any CollageTemplate) layout.
 * Photos are assigned: hero slot gets signedPhotos[0]; remaining slots
 * (in slot-array order, skipping hero) get signedPhotos[1..].
 * Slots with no photo assigned are not rendered.
 */
function renderTemplateCollage(
  template: CollageTemplate,
  signedPhotos: Array<{ url: string }>,
  caption: string
) {
  const { width, height, background, slots, heroSlotIndex } = template;
  const heroIdx = heroSlotIndex ?? 0;

  // Photo slots only (caption slots never receive a photo). Hero first, then
  // the remaining photo slots in array order → photos[0..].
  const photoSlotIndices = slots
    .map((s, i) => ({ s, i }))
    .filter((x) => !x.s.caption)
    .map((x) => x.i);
  const order = photoSlotIndices.includes(heroIdx)
    ? [heroIdx, ...photoSlotIndices.filter((i) => i !== heroIdx)]
    : photoSlotIndices;

  const photoMap = new Map<number, string>();
  order.forEach((slotIdx, k) => {
    if (k < signedPhotos.length) photoMap.set(slotIdx, signedPhotos[k].url);
  });

  // Sort slots by z so lower z renders first (background).
  const sortedIndices = slots
    .map((_, i) => i)
    .sort((a, b) => (slots[a].z ?? 1) - (slots[b].z ?? 1));

  function renderSlot(slotIdx: number) {
    const slot: CollageSlot = slots[slotIdx];

    const {
      xPct,
      yPct,
      wPct,
      hPct,
      rotateDeg,
      frame,
      captionStrip,
      radius = 4,
    } = slot;

    const left = Math.round((xPct / 100) * width);
    const top = Math.round((yPct / 100) * height);
    const slotW = Math.round((wPct / 100) * width);
    const slotH = Math.round((hPct / 100) * height);

    // Caption cell — text-only tile that wishes the recipient.
    if (slot.caption) {
      const capSize = caption.length > 20 ? 44 : caption.length > 12 ? 56 : 68;
      return (
        <div
          key={slotIdx}
          style={{
            position: "absolute",
            left,
            top,
            width: slotW,
            height: slotH,
            background: "#ffffff",
            borderRadius: radius,
            boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              background: "#C4686D",
              transform: "rotate(45deg)",
              marginBottom: 12,
              display: "flex",
            }}
          />
          <div
            style={{
              fontFamily: "Fraunces, Georgia, serif",
              fontWeight: 600,
              fontSize: capSize,
              lineHeight: 1,
              color: "#3a2e2a",
              textAlign: "center",
              padding: "0 24px",
              display: "flex",
            }}
          >
            {caption}
          </div>
        </div>
      );
    }

    const photoUrl = photoMap.get(slotIdx);
    if (!photoUrl) return null;

    const strip = captionStrip ?? 0;
    const imgW = slotW - frame * 2;
    const imgH = slotH - frame - (frame + strip);

    const isHero = slotIdx === heroIdx;

    return (
      <div
        key={slotIdx}
        style={{
          position: "absolute",
          left,
          top,
          width: slotW,
          height: slotH,
          transform: `rotate(${rotateDeg}deg)`,
          background: "#fff",
          padding: frame,
          borderRadius: radius,
          boxShadow: "0 10px 30px rgba(0,0,0,0.28)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt=""
          width={imgW}
          height={imgH}
          style={{
            width: imgW,
            height: imgH,
            objectFit: "cover",
            borderRadius: 2,
            flexShrink: 0,
          }}
        />
        {isHero && strip > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: imgW,
              height: strip,
              flexShrink: 0,
              padding: "0 12px",
              fontFamily: "Fraunces, Georgia, serif",
              fontWeight: 600,
              fontSize: caption.length > 22 ? 24 : 34,
              lineHeight: 1,
              color: "#3a2e2a",
              textAlign: "center",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {caption}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        width,
        height,
        background,
        position: "relative",
        overflow: "hidden",
        display: "flex",
      }}
    >
      {sortedIndices.map((idx) => renderSlot(idx))}

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: 28,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          fontFamily: "Inter, system-ui, sans-serif",
          fontWeight: 400,
          fontSize: 24,
          color: "#5a4a42",
          opacity: 0.55,
        }}
      >
        <DiamondIcon color="#5a4a42" />
        <span style={{ display: "flex" }}>made with TaDaaaa</span>
      </div>
    </div>
  );
}

/**
 * D4 — Photo Collage Art
 * Paid-gated (plus/unlimited). 1200×1500 PNG.
 * - With photos + valid ?template=<id>: renders the data-driven template layout.
 * - With photos, no template: renders a framed grid collage.
 * - No photos: falls back to D1 single-card editorial layout.
 * Gate: 410 inactive/expired, 403 free, 200 PNG attachment.
 * Accepts ?style=classic|bold|minimal (unknown → classic).
 * Accepts ?template=<id> (unknown → grid fallback).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const searchParams = new URL(req.url).searchParams;
  const style = resolveStyle(searchParams.get("style"));
  const templateId = searchParams.get("template");
  const collageTemplate = getCollageTemplate(templateId);

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

  // Load up to 9 photos (3×3 grid max, or up to 8 slots for template).
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

  const signedRaw =
    rawPhotos.length > 0
      ? await signPhotoList(STORAGE_BUCKET, rawPhotos, COLLAGE_PHOTO_TTL, {
          inviteSlug: slug,
        })
      : [];

  // Satori only decodes PNG/JPEG/GIF/SVG — transcode every photo to a JPEG
  // data URI so webp/heic uploads don't render as blank frames. Photos that
  // fail to fetch/decode are dropped (never shown as broken images).
  const converted = await Promise.all(
    signedRaw.map(async (p) => {
      const dataUri = await fetchPhotoAsJpegDataUri(p.url);
      return dataUri ? { ...p, url: dataUri } : null;
    })
  );
  const signedPhotos = converted.filter(
    (p): p is (typeof signedRaw)[number] => p !== null
  );

  const responseHeaders = {
    "Content-Disposition": `attachment; filename="${slug}-collage.png"`,
  };

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
        headers: responseHeaders,
      }
    );
  }

  // Template render path — explicit ?template=<id>, else random-pick a
  // count-bucketed layout matching the number of photos (no empty holes).
  const selectedTemplate =
    collageTemplate ?? pickCollageTemplateForCount(signedPhotos.length);

  if (selectedTemplate) {
    // Caption wishes the recipient with the invite's occasion.
    const caption = occasionWish(invite.occasion_type);

    return new ImageResponse(
      renderTemplateCollage(selectedTemplate, signedPhotos, caption),
      {
        width: selectedTemplate.width,
        height: selectedTemplate.height,
        fonts,
        headers: responseHeaders,
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
          <DiamondIcon color={accentColor} />
          <span style={{ display: "flex" }}>made with TaDaaaa</span>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts,
      headers: responseHeaders,
    }
  );
}
