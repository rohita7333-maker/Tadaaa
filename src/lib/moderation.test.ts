import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { scanImage } from "./moderation";

describe("scanImage", () => {
  const originalUser = process.env.SIGHTENGINE_API_USER;
  const originalSecret = process.env.SIGHTENGINE_API_SECRET;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.SIGHTENGINE_API_USER = originalUser;
    process.env.SIGHTENGINE_API_SECRET = originalSecret;
    vi.unstubAllGlobals();
  });

  it("returns safe when no API key", async () => {
    delete process.env.SIGHTENGINE_API_USER;
    const result = await scanImage("https://example.com/x.jpg");
    expect(result.safe).toBe(true);
  });

  it("rejects when nudity prob > 0.5", async () => {
    process.env.SIGHTENGINE_API_USER = "user";
    process.env.SIGHTENGINE_API_SECRET = "secret";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({
        nudity: { sexual_activity: 0.9 },
      }), { status: 200 })
    ));
    const result = await scanImage("https://example.com/x.jpg");
    expect(result.safe).toBe(false);
    expect(result.reason).toContain("nudity");
  });

  it("rejects when weapon classes contain high firearm score", async () => {
    process.env.SIGHTENGINE_API_USER = "user";
    process.env.SIGHTENGINE_API_SECRET = "secret";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({
        weapon: { classes: { firearm: 0.9, knife: 0.1 } },
      }), { status: 200 })
    ));
    const result = await scanImage("https://example.com/x.jpg");
    expect(result.safe).toBe(false);
    expect(result.reason).toContain("weapon");
  });

  it("fails OPEN when Sightengine API returns non-200", async () => {
    process.env.SIGHTENGINE_API_USER = "user";
    process.env.SIGHTENGINE_API_SECRET = "secret";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(
      new Response("server error", { status: 500 })
    ));
    const result = await scanImage("https://example.com/x.jpg");
    expect(result.safe).toBe(true);
  });
});
