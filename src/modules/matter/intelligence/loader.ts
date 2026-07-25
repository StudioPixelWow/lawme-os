/**
 * MatterIntelligence loader (Capability 2, Slice 2.1.0). SERVER-ONLY.
 *
 * The canonical entry point every future capability calls to obtain a matter's
 * intelligence: authorize + read the raw source ONCE, then derive the immutable
 * `MatterIntelligence`. Callers must never read the raw tables themselves.
 */
import type { ActorContext } from "../../identity/index.ts";
import type { AuthDb } from "../../identity/infrastructure/supabase-auth-client.ts";
import { loadMatterSource } from "./read.ts";
import { buildMatterIntelligence } from "./derive.ts";
import type { MatterIntelligence } from "./types.ts";

export type MatterIntelligenceLoad =
  | { readonly ok: true; readonly intelligence: MatterIntelligence }
  | { readonly ok: false };

/**
 * Load the authorized canonical MatterIntelligence for `param` (slug or uuid).
 * Returns `{ ok: false }` on denial or absence (uniform not-found; no enumeration).
 */
export async function loadMatterIntelligence(
  db: AuthDb,
  actor: ActorContext,
  param: string,
  nowISO: string,
): Promise<MatterIntelligenceLoad> {
  const source = await loadMatterSource(db, actor, param, nowISO);
  if (!source) return { ok: false };
  return { ok: true, intelligence: buildMatterIntelligence(source) };
}
