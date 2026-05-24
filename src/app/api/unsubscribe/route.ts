import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyUnsubscribe } from "@/lib/unsubscribe";

type ListKey = "monthly" | "weekly" | "view" | "answer";

const COLUMN_FOR_LIST: Record<ListKey, string> = {
  monthly: "notify_occasions",
  weekly: "notify_occasions",
  view: "notify_on_view",
  answer: "notify_on_answer",
};

function htmlPage(title: string, body: string, status: number) {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#FFF8F0;margin:0;padding:40px 24px;color:#2D2926;">
<main style="max-width:480px;margin:40px auto;background:#fff;border-radius:24px;padding:32px;border:1px solid #D4CBC380;text-align:center">
<h1 style="font-size:22px;margin:0 0 12px">${title}</h1>
${body}
</main></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

async function handle(userId: string, list: string, token: string) {
  if (!(list in COLUMN_FOR_LIST)) {
    return htmlPage("Invalid link", `<p>That unsubscribe link is not valid.</p>`, 400);
  }
  if (!verifyUnsubscribe(userId, list, token)) {
    return htmlPage("Invalid link", `<p>That unsubscribe link is expired or invalid.</p>`, 400);
  }
  const column = COLUMN_FOR_LIST[list as ListKey];
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId, [column]: false });
  if (error) {
    return htmlPage(
      "We couldn't unsubscribe you",
      `<p>Something went wrong. Please try again or change settings in your <a href="/settings" style="color:#C4686D">account</a>.</p>`,
      500
    );
  }
  return htmlPage(
    "You're unsubscribed",
    `<p style="color:#6B5E57;line-height:1.6">We won't send you any more of these emails. You can re-enable them anytime in <a href="/settings" style="color:#C4686D">notification settings</a>.</p>`,
    200
  );
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  return handle(
    url.searchParams.get("u") ?? "",
    url.searchParams.get("k") ?? "",
    url.searchParams.get("t") ?? ""
  );
}

// Some mail clients pre-fetch with POST per RFC 8058 (List-Unsubscribe-Post).
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  return handle(
    url.searchParams.get("u") ?? "",
    url.searchParams.get("k") ?? "",
    url.searchParams.get("t") ?? ""
  );
}
