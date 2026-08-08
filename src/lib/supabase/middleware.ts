import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  // Skip auth when Supabase keys not configured (local UI testing)
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === "your_supabase_project_url"
  ) {
    return NextResponse.next({ request });
  }

  // Skip the auth round-trip on public paths. Two tiers below:
  //   protectedPaths — signed-out visitors are redirected to sign-in.
  //   sessionPaths   — the session is refreshed but nobody is turned away.
  // /create is in the second tier on purpose: the wizard is reachable
  // signed-out by design (see create/layout.tsx) and demands auth at publish /
  // premium unlock instead, so a visitor can try the product before making an
  // account — but a signed-in visitor still needs a fresh session so the
  // layout renders the authenticated chrome and the tier lookup works.
  const protectedPaths = ["/dashboard", "/settings"];
  const sessionPaths = ["/create"];
  const path = request.nextUrl.pathname;
  const isProtected = protectedPaths.some((p) => path.startsWith(p));
  const needsSession = isProtected || sessionPaths.some((p) => path.startsWith(p));
  if (!needsSession) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    url.pathname = "/auth/signin";
    url.search = next === "/" ? "" : `next=${encodeURIComponent(next)}`;
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
