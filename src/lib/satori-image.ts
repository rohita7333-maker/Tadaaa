/**
 * satori-image.ts — image normalization for next/og (Satori) rendering.
 *
 * Why: Satori's ImageResponse can only decode PNG / JPEG / GIF / SVG. WebP
 * (a common upload format) throws "u2 is not iterable" during dimension probe,
 * leaving the photo frame blank. Uploads can be any format, so before handing
 * a photo URL to Satori we fetch the bytes and transcode to JPEG via sharp,
 * returning a self-contained data URI (no second network round-trip in Satori).
 *
 * Downscaling to `maxDim` also keeps the embedded data URIs small — collage
 * slots are at most ~800px, so a 4000px phone photo would otherwise bloat the
 * rendered PNG and the request payload.
 */

import sharp from "sharp";

const DEFAULT_MAX_DIM = 900;
const JPEG_QUALITY = 80;

/**
 * Transcode an image buffer to a JPEG data URI, downscaling so neither side
 * exceeds `maxDim` (never upscales). Returns null on decode failure so callers
 * can omit the photo rather than surface a broken frame.
 */
export async function bufferToJpegDataUri(
  buf: Buffer | Uint8Array,
  maxDim: number = DEFAULT_MAX_DIM
): Promise<string | null> {
  try {
    const jpeg = await sharp(buf)
      .rotate() // honor EXIF orientation before stripping metadata
      .resize({ width: maxDim, height: maxDim, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Fetch a (signed) image URL and return a Satori-safe JPEG data URI.
 * Returns null on fetch or decode failure.
 */
export async function fetchPhotoAsJpegDataUri(
  url: string,
  maxDim: number = DEFAULT_MAX_DIM
): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return bufferToJpegDataUri(buf, maxDim);
  } catch {
    return null;
  }
}
