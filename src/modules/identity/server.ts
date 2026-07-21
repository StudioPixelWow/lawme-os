/**
 * Identity SERVER entry (Capability 0.8, Slice 0.8.2). SERVER-ONLY.
 *
 * Next-integrated wiring: reads the verified Supabase session from cookies,
 * builds the RLS-enforced repository, revalidates the active-organization cookie,
 * and produces the canonical ActorContext. Importing `next/headers` keeps this
 * module off the browser. NOT re-exported from the domain barrel (`index.ts`).
 *
 * Never uses the service client to identify or authorize a user.
 */
import { cookies } from "next/headers";
import type { ActorContext } from "./actor-context.ts";
import { createServerAuthClient, type AuthDb, type CookieAdapter } from "./infrastructure/supabase-auth-client.ts";
import { createSupabaseActorIdentityRepository } from "./infrastructure/supabase-actor-identity-repository.ts";
import { readActiveOrganizationId, type ActiveOrgCookieStore } from "./infrastructure/active-organization-cookie.ts";
import { resolveServerActorContext } from "./server-actor-context.ts";
import { IdentityAuthorizationError, type IdentityAuthorizationCode } from "./errors.ts";

type NextCookieStore = Awaited<ReturnType<typeof cookies>>;

function toCookieAdapter(store: NextCookieStore): CookieAdapter {
  return {
    getAll: () => store.getAll().map((c) => ({ name: c.name, value: c.value })),
    setAll: (list) => {
      // In a read-only render (Server Component) set() throws — safe to ignore;
      // session refresh happens in middleware / route handlers where it is writable.
      try { for (const c of list) store.set(c.name, c.value, c.options); } catch { /* read-only context */ }
    },
  };
}

/** The active-org cookie store bridge over Next's cookie store (write in actions/middleware). */
export function activeOrgCookieStore(store: NextCookieStore): ActiveOrgCookieStore {
  return {
    get: (name) => { const c = store.get(name); return c ? { value: c.value } : undefined; },
    set: (name, value, options) => store.set(name, value, options),
    delete: (name) => store.delete(name),
  };
}

/** Build the cookie-bound server auth client from the current request cookies. */
export async function getServerAuthClient(): Promise<AuthDb> {
  return createServerAuthClient(toCookieAdapter(await cookies()));
}

/**
 * Resolve the canonical ActorContext for the current server request. Throws
 * IdentityAuthorizationError (UNAUTHENTICATED / NO_ACTIVE_ORGANIZATION /
 * ORGANIZATION_SELECTION_REQUIRED / …) on failure. Uses auth.getUser() — the
 * server-verified path — never a client-decoded session.
 */
export async function getServerActorContext(
  options?: { requestedOrganizationId?: string; correlationId?: string },
): Promise<ActorContext> {
  const store = await cookies();
  const authClient = createServerAuthClient(toCookieAdapter(store));
  const { data } = await authClient.auth.getUser();
  const authUserId = data.user?.id ?? null;
  const requestedOrganizationId = options?.requestedOrganizationId
    ?? readActiveOrganizationId(activeOrgCookieStore(store));
  const repository = createSupabaseActorIdentityRepository(authClient);
  return resolveServerActorContext({ authUserId, repository, requestedOrganizationId, correlationId: options?.correlationId });
}

export type ServerActorResult =
  | { readonly ok: true; readonly actor: ActorContext }
  | { readonly ok: false; readonly code: IdentityAuthorizationCode; readonly correlationId: string };

/** Non-throwing variant for layouts/pages that redirect on failure. */
export async function tryGetServerActorContext(
  options?: { requestedOrganizationId?: string; correlationId?: string },
): Promise<ServerActorResult> {
  try {
    return { ok: true, actor: await getServerActorContext(options) };
  } catch (e) {
    if (e instanceof IdentityAuthorizationError) return { ok: false, code: e.code, correlationId: e.correlationId };
    throw e;
  }
}
