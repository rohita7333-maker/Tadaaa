import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getActiveTier } from "@/lib/tier";
import { canUseDesignerArt, getTemplate } from "@/lib/designer-art";
import { signPhotoList } from "@/lib/sign-storage";
import { STORAGE_BUCKET } from "@/lib/constants";

/** Short TTL is fine — the signed URLs are only used during the Satori render. */
const COLLAGE_PHOTO_TTL = 60;

/**
 * D4 — Photo Collage Art
 * Paid-gated (plus/unlimited). 1200×1500 PNG.
 * - With photos: renders a grid collage with template frame (up to 9 photos).
 * - No photos: falls back to D1 single-card layout.
 * Gate: 410 inactive/expired, 403 free, 200 PNG attachment.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
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

  const t = getTemplate(invite.occasion_type);
  const title = invite.title || t.label;

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

  const signedPhotos = rawPhotos.length > 0
    ? await signPhotoList(STORAGE_BUCKET, rawPhotos, COLLAGE_PHOTO_TTL, {
        inviteSlug: slug,
      })
    : [];

  // If no photos available, render D1 single-card fallback.
  if (signedPhotos.length === 0) {
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
          "Content-Disposition": `attachment; filename="${slug}-collage.png"`,
        },
      }
    );
  }

  // Grid collage. Photos fill a 3-column grid, max 9 cells.
  const cols = signedPhotos.length === 1 ? 1 : signedPhotos.length <= 4 ? 2 : 3;
  const cellSize = Math.floor(1080 / cols);
  const gridRows = Math.ceil(signedPhotos.length / cols);
  const gridHeight = cellSize * gridRows;
  const topPad = 100;
  const bottomPad = 160;

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
          fontFamily: "system-ui, sans-serif",
          paddingTop: topPad,
          paddingBottom: bottomPad,
        }}
      >
        {/* Title row */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: t.accent,
            textAlign: "center",
            padding: "0 60px",
            marginBottom: 36,
            display: "flex",
          }}
        >
          {t.emoji} {title}
        </div>

        {/* Photo grid */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            width: cellSize * cols,
            height: gridHeight,
            gap: 0,
          }}
        >
          {signedPhotos.map((photo, i) => (
            <div
              key={i}
              style={{
                width: cellSize,
                height: cellSize,
                overflow: "hidden",
                display: "flex",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt=""
                width={cellSize}
                height={cellSize}
                style={{
                  width: cellSize,
                  height: cellSize,
                  objectFit: "cover",
                }}
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            fontSize: 34,
            color: "#6B5E57",
            marginTop: "auto",
            paddingBottom: 12,
          }}
        >
          made with TaDaaaa
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 1500,
      headers: {
        "Content-Disposition": `attachment; filename="${slug}-collage.png"`,
      },
    }
  );
}
