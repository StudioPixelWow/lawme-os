/**
 * Route-protection helpers (Capability 0.8, Slice 0.8.2).
 *
 * Pure path/redirect logic used by middleware. Middleware answers ONLY "is a
 * session potentially present / should we redirect an anonymous user"; it never
 * decides matter/capability/resource authorization (that stays server-side).
 */

/** Protected LawME-OS page prefixes (route group `(os)` has no URL prefix). */
const PROTECTED_PREFIXES = ["/today", "/matters", "/clients", "/calendar", "/documents"] as const;
/** Public (never redirected) app paths. */
const PUBLIC_PREFIXES = ["/login", "/logout", "/select-organization"] as const;

function underPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/** True for a protected OS page (root "/" redirects into the OS, so it is protected). */
export function isProtectedAppPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return underPrefix(pathname, PROTECTED_PREFIXES);
}

/** True for a public app path (login/logout/select-organization). */
export function isPublicPath(pathname: string): boolean {
  return underPrefix(pathname, PUBLIC_PREFIXES);
}

/**
 * The protected-boundary redirect decision (pure). Given an identity-resolution
 * failure code, return the public path the OS layout must redirect to. Fails
 * CLOSED: the org-selection codes go to /select-organization; EVERY other code
 * (unauthenticated, expired, profile-not-found, resolution failure, unknown)
 * goes to /login. The layout never branches protected UI on the reason.
 */
export function protectedBoundaryRedirect(code: string): "/login" | "/select-organization" {
  if (code === "NO_ACTIVE_ORGANIZATION" || code === "ORGANIZATION_SELECTION_REQUIRED") {
    return "/select-organization";
  }
  return "/login";
}

/**
 * Sanitize a post-login return target: must be a same-origin RELATIVE path.
 * Anything else (absolute URL, protocol-relative, backslash, scheme) → fallback.
 * Prevents open-redirect.
 */
export function safeInternalRedirect(candidate: string | null | undefined, fallback = "/today"): string {
  if (typeof candidate !== "string" || candidate.length === 0) return fallback;
  if (!candidate.startsWith("/")) return fallback;
  if (candidate.startsWith("//")) return fallback;
  if (candidate.includes("\\") || candidate.includes("://") || candidate.includes("\n")) return fallback;
  return candidate;
}
