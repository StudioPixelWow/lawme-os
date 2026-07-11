/**
 * Repository factory — the single entry point for storage access.
 * SERVER-SIDE ONLY: never import this from client components.
 *
 * Selection:
 *  - SUPABASE_URL + SUPABASE_SECRET_KEY present  → Supabase (dev project),
 *    service-privileged (ingestion/seed/dev-interface reads).
 *  - otherwise                                   → in-memory fixture-backed
 *    repositories (deterministic fallback, clearly labeled by `kind`).
 *
 * Production-refusal guard: the service path refuses to run when the URL
 * does not point at the approved DEVELOPMENT project.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../types/database.types.ts";
import { createInMemoryRepositories } from "./in-memory.ts";
import { createSupabaseRepositories } from "./supabase.ts";
import type { Repositories } from "./types.ts";

export * from "./types.ts";
export { createInMemoryRepositories } from "./in-memory.ts";
export { createSupabaseRepositories } from "./supabase.ts";

/** The ONLY Supabase project this codebase may write to in Epic 2. */
export const APPROVED_DEV_PROJECT_REF = "udispadsbxqicmawqcuk";

export interface RepositoryEnv {
  supabaseUrl?: string;
  supabaseSecretKey?: string;
}

export function assertDevelopmentProject(url: string): void {
  if (!url.includes(APPROVED_DEV_PROJECT_REF)) {
    throw new Error(
      "REFUSED: Supabase URL does not point at the approved DEVELOPMENT " +
      `project (${APPROVED_DEV_PROJECT_REF}). Production/foreign targets are blocked.`,
    );
  }
}

export function createRepositories(env: RepositoryEnv = {
  supabaseUrl: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY,
}): Repositories {
  if (env.supabaseUrl && env.supabaseSecretKey) {
    assertDevelopmentProject(env.supabaseUrl);
    const client = createClient<Database>(env.supabaseUrl, env.supabaseSecretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return createSupabaseRepositories(client);
  }
  return createInMemoryRepositories();
}
