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
    console.error("[ai/draft-invite]", msg);
    return NextResponse.json({ error: "ai_failed" }, { status: 500 });
  }
}
