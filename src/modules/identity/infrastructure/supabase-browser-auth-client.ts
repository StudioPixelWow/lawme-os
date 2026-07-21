/**
 * BROWSER Supabase Auth client (Capability 0.8, Slice 0.8.2).
 *
 * For login / logout / Supabase-driven session refresh in the browser. Uses ONLY
 * the public url + anon key (NEXT_PUBLIC). The service-role key is never referenced
 * here and never reaches the browser bundle.
 */
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../types/database.types.ts";

export function createBrowserAuthClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("missing NEXT_PUBLIC Supabase configuration");
  return createBrowserClient<Database>(url, anon);
}
