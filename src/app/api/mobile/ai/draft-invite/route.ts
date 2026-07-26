import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { draftInvite } from "@/lib/ai/draft";
import { rateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { getBearerUser } from "@/lib/mobile-auth";

/**
 * POST /api/mobile/ai/draft-invite  (mobile BFF)
 *
 * Bearer-authed twin of /api/ai/draft-invite. Same Anthropic draft path, same
 * per-user hourly rate limit, same ai_drafts logging — just token auth instead
 * of cookies, and the admin client for the log insert (no cookie session).
 */
const Body = z.object({
  recipient: z.string().min(1).max(50),
  occasion: z.string().min(1).max(80),
  tone: z.enum(["warm", "playful", "elegant", "heartfelt", "funny"]),
  details: z.string().max(300).optional(),
});

export async function POST(req: NextRequest) {
  const user = await getBearerUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ok = await rateLimit(`ai:draft:${user.id}`, 10, 3600_000);
  if (!ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "bad_input" }, { status: 400 });

  try {
    const { draft, tokensIn, tokensOut } = await draftInvite(parsed.data);
    const admin = createAdminClient();
    after(async () => {
      await admin.from("ai_drafts").insert({
        user_id: user.id,
        inputs: parsed.data,
        output: draft,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
      });
      await logAudit({ userId: user.id, action: "ai.draft", meta: { tokensIn, tokensOut, source: "mobile" } });
    });
    return NextResponse.json({ draft });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    if (msg.startsWith("refused:")) {
      return NextResponse.json({ error: "This request couldn't be drafted. Try different wording." }, { status: 422 });
    }
    const status = (e as { status?: number } | null)?.status;
    const lower = msg.toLowerCase();
    const isProviderDown =
      status === 401 || status === 403 || status === 429 ||
      (status !== undefined && status >= 500) ||
      lower.includes("credit balance") || lower.includes("billing") ||
      lower.includes("quota") || lower.includes("overloaded");
    return NextResponse.json(
      { error: isProviderDown ? "AI is temporarily unavailable — try again shortly." : "Draft failed. Please try again." },
      { status: isProviderDown ? 503 : 500 }
    );
  }
}
