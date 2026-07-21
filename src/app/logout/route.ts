/**
 * Logout route (Capability 0.8, Slice 0.8.2).
 *
 * POST-only: signs the Supabase session out (clearing its auth cookies) AND
 * clears the active-organization selection cookie, then redirects to /login.
 * POST-only so a cross-site GET/prefetch can't force a logout. Idempotent:
 * even with no session it clears cookies and redirects. Never leaks error
 * detail — logout always ends at the login page.
 */
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getServerAuthClient, activeOrgCookieStore } from "@/modules/identity/server";
import { clearActiveOrganization } from "@/modules/identity/infrastructure/active-organization-cookie";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await getServerAuthClient();
    await supabase.auth.signOut();
  } catch {
    // Fail closed toward "logged out": never block logout on an error.
  }
  try {
    clearActiveOrganization(activeOrgCookieStore(await cookies()));
  } catch {
    /* nothing to clear */
  }
  const login = request.nextUrl.clone();
  login.pathname = "/login";
  login.search = "";
  return NextResponse.redirect(login, { status: 303 });
}
