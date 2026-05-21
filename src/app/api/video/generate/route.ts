import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { STORAGE_BUCKET } from "@/lib/constants";
import { getThemeById } from "@/lib/themes";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Per-user rate limit. Video render is expensive (CPU + RAM + Chromium).
  // 5 generations / hour is generous for legitimate use, blocks abuse.
  if (!(await rateLimit(`video:${user.id}`, 5, 60 * 60 * 1000))) {
    return NextResponse.json(
      { error: "Too many video generations. Try again in an hour." },
      { status: 429 }
    );
  }

  const { inviteId } = (await request.json()) as { inviteId: string };
  if (!inviteId) {
    return NextResponse.json({ error: "inviteId required" }, { status: 400 });
  }

  // Verify ownership + tier
  const { data: invite } = await supabase
    .from("invites")
    .select("id, creator_id, title, message, theme, video_status")
    .eq("id", inviteId)
    .single();

  if (!invite || invite.creator_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, subscription_expires_at")
    .eq("id", user.id)
    .single();

  const tier = profile?.subscription_tier ?? "free";
  const isActive =
    tier !== "free" &&
    (!profile?.subscription_expires_at ||
      new Date(profile.subscription_expires_at) > new Date());

  if (!isActive) {
    return NextResponse.json(
      { error: "Video generation requires Plus or Unlimited plan" },
      { status: 403 }
    );
  }

  // Atomic claim — only one POST flips the status from non-processing to processing.
  // Concurrent POSTs race here; the loser sees claimed.length === 0.
  const jobId = crypto.randomUUID();
  const { data: claimed } = await supabase
    .from("invites")
    .update({ video_status: "processing", video_job_id: jobId })
    .eq("id", inviteId)
    .neq("video_status", "processing")
    .select("id");

  if (!claimed || claimed.length === 0) {
    return NextResponse.json({ error: "Video already processing" }, { status: 409 });
  }

  // Fetch photos
  const { data: photos } = await supabase
    .from("invite_photos")
    .select("storage_path, caption, sort_order")
    .eq("invite_id", inviteId)
    .order("sort_order");

  const photoUrls = await Promise.all(
    (photos || []).map(async (p) => {
      const { data } = await adminClient.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(p.storage_path, 60 * 60);
      return { url: data?.signedUrl || "", caption: p.caption || "" };
    })
  );

  const theme = getThemeById(invite.theme);
  const themeColors = theme
    ? { background: theme.colors.background, text: theme.colors.text, accent: theme.colors.accent }
    : { background: "#FFF8F0", text: "#2D2926", accent: "#C4686D" };

  // Render video in background
  renderVideo({
    inviteId,
    jobId,
    title: invite.title,
    message: invite.message,
    photos: photoUrls,
    themeColors,
    userId: user.id,
  }).catch((err) => {
    console.error("[video] Render failed:", err);
  });

  return NextResponse.json({ jobId, status: "processing" });
}

async function renderVideo(params: {
  inviteId: string;
  jobId: string;
  title: string;
  message: string;
  photos: { url: string; caption: string }[];
  themeColors: { background: string; text: string; accent: string };
  userId: string;
}) {
  // Dynamic import to avoid loading Remotion at build time
  const { bundle } = await import("@remotion/bundler");
  const { renderMedia, selectComposition } = await import("@remotion/renderer");
  const { calculateDuration } = await import("@/lib/video/composition");
  const path = await import("path");
  const fs = await import("fs");
  const os = await import("os");

  const supabase = (await import("@/lib/supabase/server")).createAdminClient();

  try {
    const entryPoint = path.resolve(process.cwd(), "src/lib/video/entry.tsx");
    const bundled = await bundle({ entryPoint, webpackOverride: (c) => c });

    const durationInFrames = calculateDuration(params.photos.length);
    const composition = await selectComposition({
      serveUrl: bundled,
      id: "SurpriseVideo",
      inputProps: {
        photos: params.photos,
        title: params.title,
        message: params.message,
        themeColors: params.themeColors,
      },
    });

    const outputPath = path.join(os.tmpdir(), `tadaaaa-${params.jobId}.mp4`);

    await renderMedia({
      composition: { ...composition, durationInFrames },
      serveUrl: bundled,
      codec: "h264",
      outputLocation: outputPath,
      inputProps: {
        photos: params.photos,
        title: params.title,
        message: params.message,
        themeColors: params.themeColors,
      },
    });

    // Upload to Supabase Storage
    const fileBuffer = fs.readFileSync(outputPath);
    const storagePath = `${params.userId}/${params.inviteId}/video.mp4`;

    await supabase.storage
      .from("moment-photos")
      .upload(storagePath, fileBuffer, {
        contentType: "video/mp4",
        upsert: true,
      });

    const { data: urlData } = supabase.storage
      .from("moment-photos")
      .getPublicUrl(storagePath);

    await supabase
      .from("invites")
      .update({
        video_status: "ready",
        video_storage_path: storagePath,
      })
      .eq("id", params.inviteId)
      .eq("video_job_id", params.jobId);

    // Cleanup temp file
    fs.unlinkSync(outputPath);
  } catch (err) {
    console.error("[video] Render error:", err);
    await supabase
      .from("invites")
      .update({ video_status: "failed" })
      .eq("id", params.inviteId)
      .eq("video_job_id", params.jobId);
  }
}
