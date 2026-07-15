/**
 * Matter persistence — Supabase server clients (Capability 1). SERVER-ONLY.
 *
 * Two privilege levels, never mixed:
 *   - serviceClient(): SUPABASE_SERVICE_ROLE_KEY. Bypasses RLS. The trusted
 *     server-side finalization/ingestion path. NEVER importable by the browser
 *     (the service key is read from a non-NEXT_PUBLIC_ env var, and this module
 *     is only imported by server routes / server components).
 *   - anonClient(jwt): the publishable/anon key + an end-user JWT, where RLS is
 *     the enforcement layer. Used for tenant-scoped reads on behalf of a user.
 *
 * `persistenceEnabled()` lets callers fall back to the in-memory dev adapter
 * when no Development credentials are configured (local demo / offline tests),
 * so the app never crashes for lack of a secret — it just isn't durable.
 *
 * No secret is ever logged. Values are read lazily so importing this module is
 * side-effect free.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../types/database.types.ts";

export type Db = SupabaseClient<Database>;

const URL_ENV = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"] as const;
const SERVICE_ENV = ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"] as const;
const ANON_ENV = ["NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;

function firstEnv(names: readonly string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.length > 0) return v;
  }
  return undefined;
}

export function supabaseUrl(): string | undefined {
  return firstEnv(URL_ENV);
}

/** True only when the server can perform durable writes (service key present). */
export function persistenceEnabled(): boolean {
  return Boolean(supabaseUrl() && firstEnv(SERVICE_ENV));
}

/**
 * Document storage mode (Capability 1). "supabase_dev" REQUIRES durable
 * Development persistence and must NEVER silently fall back to memory —
 * callers fail clearly instead. Anything else (unset) is "memory": the local
 * dev fallback. Production storage mode is not implemented.
 */
export type StorageMode = "supabase_dev" | "memory";
export function documentStorageMode(): StorageMode {
  return process.env.LAWME_DOCUMENT_STORAGE_MODE === "supabase_dev" ? "supabase_dev" : "memory";
}

export function expectedProjectRef(): string | undefined {
  return process.env.LAWME_SUPABASE_PROJECT_REF;
}

/**
 * Returns a clear misconfiguration reason when supabase_dev is requested but a
 * required server credential/binding is missing or points at the wrong project.
 * Null means the durable path is safe to use. NEVER includes any secret value.
 */
export function persistenceConfigError(): string | null {
  if (documentStorageMode() !== "supabase_dev") return null;
  if (!supabaseUrl()) return "LAWME_DOCUMENT_STORAGE_MODE=supabase_dev but NEXT_PUBLIC_SUPABASE_URL is not set";
  if (!firstEnv(SERVICE_ENV)) return "LAWME_DOCUMENT_STORAGE_MODE=supabase_dev but SUPABASE_SERVICE_ROLE_KEY is not set";
  const ref = expectedProjectRef();
  if (ref && !supabaseUrl()!.includes(ref)) {
    return "Supabase URL does not match LAWME_SUPABASE_PROJECT_REF — refusing to write to the wrong project";
  }
  return null;
}

let cachedService: Db | null = null;

/**
 * Trusted server client (service role). Throws if credentials are absent so
 * callers must consult persistenceEnabled() first and fall back deliberately —
 * we never silently downgrade a write path.
 */
export function serviceClient(): Db {
  if (cachedService) return cachedService;
  const url = supabaseUrl();
  const key = firstEnv(SERVICE_ENV);
  if (!url || !key) {
    throw new Error("matter persistence: service credentials not configured");
  }
  cachedService = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedService;
}

/**
 * Tenant-scoped client bound to an end-user JWT; RLS enforces isolation.
 * (Reserved for the authenticated read path once sessions exist; the demo
 * currently reads through the server, but the seam is here so no rewrite is
 * needed when auth lands.)
 */
export function anonClient(accessToken: string): Db {
  const url = supabaseUrl();
  const anon = firstEnv(ANON_ENV);
  if (!url || !anon) {
    throw new Error("matter persistence: anon credentials not configured");
  }
  return createClient<Database>(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
