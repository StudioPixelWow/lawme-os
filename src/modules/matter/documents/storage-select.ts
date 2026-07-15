/**
 * Storage selection (Capability 1). SERVER-ONLY.
 *
 * Mode is EXPLICIT, never guessed:
 *  - supabase_dev  → the durable Supabase adapter. Requires credentials; if any
 *    are missing the caller must fail (see persistenceConfigError) — this
 *    function will still return the Supabase adapter, but routes gate on the
 *    config error first so there is NO silent memory fallback and no pretend
 *    success in supabase_dev mode.
 *  - memory (default/unset) → the in-memory dev adapter, for local/offline work.
 * Same interface either way.
 */
import { documentStorageMode } from "../persistence/supabase-server.ts";
import { documentStorage } from "./storage.ts";
import { supabaseStorage } from "./supabase-storage.ts";
import type { DocumentStorage } from "./storage.ts";

export function selectDocumentStorage(): DocumentStorage {
  return documentStorageMode() === "supabase_dev" ? supabaseStorage : documentStorage;
}
