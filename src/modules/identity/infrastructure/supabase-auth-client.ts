/**
 * SERVER-ONLY Supabase Auth client (Capability 0.8, Slice 0.8.2).
 *
 * Cookie-based, RLS-enforced auth client built from the PUBLIC url + anon key
 * ONLY — it NEVER reads or uses the service-role key. It reads the authenticated
 * user's session from cookies and performs user-scoped, RLS-enforced reads.
 *
 * The service client (matter/persistence/supabase-server.ts `serviceClient`) is
 * a separate, RLS-bypassing infrastructure client. It is NEVER used to infer who
 * the current user is and NEVER authorizes a protected user action.
 */
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../types/database.types.ts";

export type AuthDb = SupabaseClient<Database>;

/** Minimal cookie bridge (adapts Next's cookie store / middleware req+res). */
export interface CookieAdapter {
  getAll(): { readonly name: string; readonly value: string }[];
  /** Persist refreshed session cookies. May be a no-op in read-only contexts. */
  setAll(cookies: { name: string; value: string; options?: Record<string, unknown> }[]): void;
}

function requiredPublicEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.length === 0) throw new Error(`missing required public env: ${name}`);
  return v;
}

/** Create the cookie-bound server auth client (anon key + user session). */
export function createServerAuthClient(cookies: CookieAdapter): AuthDb {
  return createServerClient<Database>(
    requiredPublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll: () => cookies.getAll().map((c) => ({ name: c.name, value: c.value })),
        setAll: (list) => cookies.setAll(list),
      },
    },
  );
}
