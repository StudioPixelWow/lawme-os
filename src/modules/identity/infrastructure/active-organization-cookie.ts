/**
 * Active-organization cookie (Capability 0.8, Slice 0.8.2).
 *
 * Stores ONLY the selected organization id — never actor/role/capability data.
 * It is NOT authoritative: every protected request revalidates it against an
 * active membership (a stale/forged value fails closed as TENANT_MISMATCH).
 * HttpOnly, SameSite=Lax, Secure outside development, explicit expiry.
 */

export const ACTIVE_ORG_COOKIE = "lawme_active_org";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days; always revalidated server-side

/** Cookie store bridge (Next request/response cookie stores implement this). */
export interface ActiveOrgCookieStore {
  get(name: string): { value: string } | undefined;
  set(name: string, value: string, options?: Record<string, unknown>): void;
  delete(name: string): void;
}

/** Safe attributes for the active-org cookie. */
export function activeOrganizationCookieOptions(): Record<string, unknown> {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV !== "development",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}

/** A syntactically plausible organization id (defence in depth; membership is revalidated). */
export function isPlausibleOrganizationId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 100 && /^[A-Za-z0-9-]+$/.test(value);
}

/** Read the selected org id from the cookie (or undefined). */
export function readActiveOrganizationId(store: ActiveOrgCookieStore): string | undefined {
  const raw = store.get(ACTIVE_ORG_COOKIE)?.value;
  return isPlausibleOrganizationId(raw) ? raw : undefined;
}

/** Persist the selected org id with safe attributes. */
export function writeActiveOrganizationId(store: ActiveOrgCookieStore, organizationId: string): void {
  if (!isPlausibleOrganizationId(organizationId)) throw new Error("invalid organization id");
  store.set(ACTIVE_ORG_COOKIE, organizationId, activeOrganizationCookieOptions());
}

/** Clear the active-org selection (e.g. on logout or invalid selection). */
export function clearActiveOrganization(store: ActiveOrgCookieStore): void {
  store.delete(ACTIVE_ORG_COOKIE);
}
