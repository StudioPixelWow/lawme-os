/**
 * LawME proxy (Capability 0.8, Slice 0.8.2).
 *
 * Formerly `middleware.ts` — renamed to the Next 16 `proxy` file convention
 * (the `middleware` convention is deprecated in v16). Two jobs ONLY: (1) refresh
 * the Supabase session cookies, (2) redirect an anonymous user away from
 * protected OS pages to /login. It performs NO business authorization
 * (matter/capability/resource/ownership/approval/confidentiality) — those remain
 * server-side application/resource decisions.
 *
 * Excludes (via matcher): Next internals, static assets, and ALL /api routes
 * (so the public signed-token preview route and self-guarding API routes are
 * untouched). API auth is enforced inside the routes as JSON, not by redirect.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isProtectedAppPath, safeInternalRedirect } from "@/modules/identity/infrastructure/route-protection";

export async function proxy(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // If auth is not configured, do not crash every request in the proxy; the
  // protected server layout still fails closed (no silent access is granted).
  if (!url || !anon) return response;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // IMPORTANT: getUser() (server-verified) refreshes the session cookies.
  const { data } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (!data.user && isProtectedAppPath(path)) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    login.searchParams.set("redirect", safeInternalRedirect(path));
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  matcher: [
    // all paths EXCEPT: Next internals, static assets, /api/*, and common file types
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|woff2?)$).*)",
  ],
};
