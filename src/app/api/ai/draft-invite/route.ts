import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { draftInvite } from "@/lib/ai/draft";
import { rateLimit } from "@/lib/rate-limit";
import { logAudit, getRequestMeta } from "@/lib/audit";

const Body = z.object({
  recipient: z.string().min(1).max(50),
  occasion: z.string().min(1).max(80),
  tone: z.enum(["warm", "playful", "elegant", "heartfelt", "funny"]),
  details: z.string().max(300).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ok = await rateLimit(`ai:draft:${user.id}`, 10, 3600_000);
  if (!ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "bad_input" }, { status: 400 });

  try {
    const { draft, tokensIn, tokensOut } = await draftInvite(parsed.data);

    after(async () => {
      await supabase.from("ai_drafts").insert({
        user_id: user.id,
        inputs: parsed.data,
        output: draft,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
      });
      const { ip, userAgent } = await getRequestMeta();
      await logAudit({
        userId: user.id,
        action: "ai.draft",
        ip,
        userAgent,
        meta: { tokensIn, tokensOut },
      });
    });

    return NextResponse.json({ draft });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    if (msg.startsWith("refused:")) {
      return NextResponse.json({ error: "refused" }, { status: 422 });
    }
    // Distinguish "the AI provider itself is unavailable" (billing/credits,
    // auth, provider outage, rate limit) from a genuine bug. These are config
    // problems the user can't retry their way out of, so the client shows an
    // honest "temporarily unavailable" message instead of "try again".
    const status = (e as { status?: number } | null)?.status;
    const lower = msg.toLowerCase();
    const isProviderDown =
      status === 401 ||
      status === 403 ||
      status === 429 ||
      (status !== undefined && status >= 500) ||
      lower.includes("credit balance") ||
      lower.includes("billing") ||
      lower.includes("quota") ||
      lower.includes("overloaded");
    console.error("[ai/draft-invite]", { status, msg });
    if (isProviderDown) {
      return NextResponse.json({ error: "unavailable" }, { status: 503 });
    }
    return NextResponse.json({ error: "ai_failed" }, { status: 500 });
  }
}
