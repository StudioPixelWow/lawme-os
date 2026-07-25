/**
 * Matter Workspace — view loader (Capability 2). SERVER-ONLY.
 *
 * Thin adapter over the canonical authorized source read (`loadMatterSource`,
 * Slice 2.1.0): read the raw matter ONCE, then build the presentation view. The
 * authorization + RLS + no-service-client guarantees live in `loadMatterSource`.
 */
import type { ActorContext } from "../../identity/index.ts";
import type { AuthDb } from "../../identity/infrastructure/supabase-auth-client.ts";
import { loadMatterSource } from "../intelligence/read.ts";
import type { MatterWorkspaceView } from "./types.ts";
import { buildWorkspaceView } from "./present.ts";

export type WorkspaceLoad =
  | { readonly ok: true; readonly view: MatterWorkspaceView }
  | { readonly ok: false };

/**
 * Load the authorized Matter Workspace view for `param` (slug or uuid). Returns
 * `{ ok: false }` on denial or absence — the page renders the uniform not-found.
 */
export async function loadMatterWorkspace(
  db: AuthDb,
  actor: ActorContext,
  param: string,
  nowISO: string,
): Promise<WorkspaceLoad> {
  const source = await loadMatterSource(db, actor, param, nowISO);
  if (!source) return { ok: false };
  return { ok: true, view: buildWorkspaceView(source) };
}
