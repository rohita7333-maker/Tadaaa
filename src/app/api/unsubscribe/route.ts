import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyUnsubscribe } from "@/lib/unsubscribe";

type ListKey = "monthly" | "weekly" | "view" | "answer";

const VALID_LISTS = new Set<ListKey>(["monthly", "weekly", "view", "answer"]);

function htmlPage(title: string, body: string, status: number) {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#FAF9F6;margin:0;padding:40px 24px;color:#1A1B18;">
<main style="max-width:480px;margin:40px auto;background:#fff;border-radius:24px;padding:32px;border:1px solid #E9E6DF80;text-align:center">
<h1 style="font-size:22px;margin:0 0 12px">${title}</h1>
${body}
</main></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

async function handle(userId: string, list: string, token: string, day: string) {
  if (!VALID_LISTS.has(list as ListKey)) {
    return htmlPage("Invalid link", `<p>That unsubscribe link is not valid.</p>`, 400);
  }
  if (!verifyUnsubscribe(userId, list, token, day)) {
    return htmlPage("Invalid link", `<p>That unsubscribe link is expired or invalid.</p>`, 400);
  }
  // unsubscribe_user has SECURITY DEFINER + GRANT to anon — no service-role needed.
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("unsubscribe_user", {
    p_user_id: userId,
    p_list: list,
  });
  if (error || !data) {
    return htmlPage(
      "We couldn't unsubscribe you",
      `<p>Something went wrong. Please try again or change settings in your <a href="/settings" style="color:#3E6B5C">account</a>.</p>`,
      500
    );
  }
  return htmlPage(
    "You're unsubscribed",
    `<p style="color:#6F6E68;line-height:1.6">We won't send you any more of these emails. You can re-enable them anytime in <a href="/settings" style="color:#3E6B5C">notification settings</a>.</p>`,
    200
  );
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  return handle(
    url.searchParams.get("u") ?? "",
    url.searchParams.get("k") ?? "",
    url.searchParams.get("t") ?? "",
    url.searchParams.get("d") ?? ""
  );
}

// Some mail clients pre-fetch with POST per RFC 8058 (List-Unsubscribe-Post).
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  return handle(
    url.searchParams.get("u") ?? "",
    url.searchParams.get("k") ?? "",
    url.searchParams.get("t") ?? "",
    url.searchParams.get("d") ?? ""
  );
}
