// @vitest-environment node
import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { bufferToJpegDataUri } from "./satori-image";

function solid(width: number, height: number) {
  return sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 60, b: 60 } },
  });
}

describe("bufferToJpegDataUri", () => {
  it("transcodes a webp buffer (Satori-unsupported) into a jpeg data URI", async () => {
    const webp = await solid(120, 120).webp().toBuffer();
    const uri = await bufferToJpegDataUri(webp);
    expect(uri).toMatch(/^data:image\/jpeg;base64,/);

    const out = Buffer.from(uri!.split(",")[1], "base64");
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("jpeg");
  });

  it("downscales so neither side exceeds maxDim, without upscaling small images", async () => {
    const big = await solid(2000, 1000).png().toBuffer();
    const uri = await bufferToJpegDataUri(big, 500);
    const meta = await sharp(Buffer.from(uri!.split(",")[1], "base64")).metadata();
    expect(Math.max(meta.width!, meta.height!)).toBe(500);

    const small = await solid(80, 80).png().toBuffer();
    const smallUri = await bufferToJpegDataUri(small, 500);
    const smallMeta = await sharp(Buffer.from(smallUri!.split(",")[1], "base64")).metadata();
    expect(smallMeta.width).toBe(80); // not enlarged
  });

  it("returns null on undecodable input", async () => {
    const uri = await bufferToJpegDataUri(Buffer.from("not an image"));
    expect(uri).toBeNull();
  });
});
