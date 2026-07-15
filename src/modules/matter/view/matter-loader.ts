/**
 * Matter loading for the room + list (Capability 2, Slice 1). SERVER-ONLY.
 *
 * Replaces the "every id is the demo" behaviour with real, DB-backed matters —
 * WITHOUT changing the approved demo. Rules:
 *   - slug "demo" always returns the frozen rich fixture (unchanged reference).
 *   - other matters load from the Slice A `matters` table when supabase_dev is
 *     configured; otherwise (local/memory, or misconfigured) we fall back to the
 *     demo fixture so pages never crash for lack of a secret.
 *
 * Org scope: Slice 1 uses the demo organization (no auth/session yet); when auth
 * lands, the org comes from the session. Access stays server-side.
 */
import type { Matter } from "../types.ts";
import { getDemoMatter } from "../fixtures/demo.ts";
import { DEMO_SEED } from "../fixtures/demo-seed.ts";
import { documentStorageMode, persistenceConfigError, serviceClient } from "../persistence/supabase-server.ts";
import { MatterRepository, type MatterSummary } from "../persistence/matter-repository.ts";

const DEMO_SLUG = "demo";

function durable(): boolean {
  return documentStorageMode() === "supabase_dev" && !persistenceConfigError();
}

/** The frozen demo, presented as a list summary. */
export function demoSummary(): MatterSummary {
  const d = getDemoMatter(DEMO_SLUG);
  return {
    id: DEMO_SLUG, slug: DEMO_SLUG, titleHe: d.titleHe, procedureType: d.procedureType,
    currentStageId: d.currentStageId, status: "open", fileNoHe: d.fileNoHe ?? null,
    forumHe: d.forumHe ?? null, openedAt: d.openedAt,
  };
}

/** Load a Matter for the room. Returns null only when a durable matter is missing. */
export async function loadMatterForRoom(param: string, nowISO: string): Promise<Matter | null> {
  if (param === DEMO_SLUG) return getDemoMatter(DEMO_SLUG);   // frozen rich reference
  if (!durable()) return getDemoMatter(param);               // local/misconfigured fallback
  const repo = new MatterRepository(serviceClient());
  const r = await repo.getHydrated(DEMO_SEED.organizationId, param, nowISO);
  return r.ok ? r.value : null;
}

/** List matters for the /matters page (demo first, then durable matters). */
export async function listMattersForPage(): Promise<{ matters: MatterSummary[]; durable: boolean }> {
  const demo = demoSummary();
  if (!durable()) return { matters: [demo], durable: false };
  const repo = new MatterRepository(serviceClient());
  const r = await repo.list(DEMO_SEED.organizationId);
  if (!r.ok) return { matters: [demo], durable: true };
  return { matters: [demo, ...r.value.filter((m) => m.slug !== DEMO_SLUG)], durable: true };
}
