import { describe, it, expect } from "vitest";
import { trackServer } from "./analytics";

describe("trackServer", () => {
  it("no-ops when POSTHOG_KEY missing", async () => {
    const prev = process.env.POSTHOG_API_KEY;
    delete process.env.POSTHOG_API_KEY;
    await expect(
      trackServer("user1", "invite_created", { theme: "x" }),
    ).resolves.toBeUndefined();
    if (prev !== undefined) process.env.POSTHOG_API_KEY = prev;
  });
});
