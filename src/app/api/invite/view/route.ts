import { NextRequest, NextResponse } from "next/server";
import { getIp } from "@/lib/rate-limit";
import { logInviteViewBySlug } from "@/lib/invite-view";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { slug?: string };
  const slug = body?.slug ?? "";
  const ua = request.headers.get("user-agent") ?? "";
  const ip = getIp(request.headers);

  const result = await logInviteViewBySlug(slug, ua, ip);

  if (!result.ok) {
    const status = result.status ?? 500;
    const msg =
      status === 400
        ? "Slug required"
        : status === 404
        ? "Not found"
        : status === 429
        ? "Too many requests"
        : "Error";
    return NextResponse.json({ error: msg }, { status });
  }

  return NextResponse.json({ ok: true });
}
