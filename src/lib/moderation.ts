/**
 * Photo moderation via Sightengine.
 *
 * Design choices (load-bearing):
 *   - FAIL OPEN. If credentials are missing, the API returns non-200, network
 *     errors, or response parsing throws — we treat the image as safe. We will
 *     NEVER block a legitimate user upload because the moderation provider is
 *     having a bad day. False negatives are recoverable (manual takedown);
 *     false positives shake user trust permanently.
 *   - Thresholds are calibrated higher than Sightengine's "this might be a
 *     thing" floor: nudity > 0.5 (sexual content), weapon > 0.7, gore > 0.6,
 *     offensive symbols > 0.7. These match the values in the security
 *     hardening plan and can be tightened post-launch once we see signal in
 *     the audit log.
 *   - We aggregate nudity sub-scores (sexual_activity, sexual_display,
 *     erotica, raw) with Math.max because Sightengine's 2.1 model splits a
 *     single concept across multiple keys. Suggestive content with no skin
 *     can still spike `erotica`.
 *   - Reason strings are coarse-grained ("nudity", "weapon", "gore",
 *     "offensive"). Caller is responsible for translating into a user-facing
 *     message; we do NOT surface raw category names to end users.
 */
type Scan = { safe: boolean; reason?: string };

export async function scanImage(url: string): Promise<Scan> {
  const user = process.env.SIGHTENGINE_API_USER;
  const secret = process.env.SIGHTENGINE_API_SECRET;
  if (!user || !secret) return { safe: true };

  try {
    const params = new URLSearchParams({
      url,
      models: "nudity-2.1,weapon,gore,offensive",
      api_user: user,
      api_secret: secret,
    });
    const res = await fetch(`https://api.sightengine.com/1.0/check.json?${params}`);
    if (!res.ok) return { safe: true }; // fail OPEN — never block uploads on API outage
    const data = await res.json();

    const nudity = Math.max(
      data.nudity?.sexual_activity ?? 0,
      data.nudity?.sexual_display ?? 0,
      data.nudity?.erotica ?? 0,
      data.nudity?.raw ?? 0
    );
    const weapon = data.weapon ?? 0;
    const gore = data.gore?.prob ?? 0;
    const offensive = data.offensive?.prob ?? 0;

    if (nudity > 0.5) return { safe: false, reason: "nudity" };
    if (weapon > 0.7) return { safe: false, reason: "weapon" };
    if (gore > 0.6) return { safe: false, reason: "gore" };
    if (offensive > 0.7) return { safe: false, reason: "offensive" };
    return { safe: true };
  } catch (e) {
    console.error("[moderation] scan failed", e);
    return { safe: true }; // fail OPEN on network/parse errors
  }
}
