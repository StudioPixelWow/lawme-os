/**
 * Matter loading for the room + list (Capability 2, Slice 1 + list hotfix).
 * SERVER-ONLY.
 *
 * Replaces the "every id is the demo" behaviour with real, DB-backed matters —
 * WITHOUT changing the approved demo. Rules:
 *   - slug "demo" always returns the frozen rich fixture (unchanged reference).
 *   - other matters load from the Slice A `matters` table when supabase_dev is
 *     configured; otherwise fall back to the demo fixture so pages never crash.
 *
 * LIST HOTFIX invariants (founder-mandated):
 *   - The frozen demo is composed by the PAGE, independently of the database,
 *     so it is ALWAYS present exactly once — even on DB/config failure.
 *   - The durable query returns an EXPLICIT result state; a DB or configuration
 *     failure is NEVER silently turned into an empty list.
 *   - Safe server-side diagnostics (no secrets) are logged with a correlation id.
 */
import { randomUUID } from "node:crypto";
import type { Matter } from "../types.ts";
import { getDemoMatter } from "../fixtures/demo.ts";
import { DEMO_SEED } from "../fixtures/demo-seed.ts";
import {
  documentStorageMode, persistenceConfigError, expectedProjectRef, supabaseUrl, serviceClient,
} from "../persistence/supabase-server.ts";
import { MatterRepository, type MatterSummary } from "../persistence/matter-repository.ts";

const DEMO_SLUG = "demo";

function durable(): boolean {
  return documentStorageMode() === "supabase_dev" && !persistenceConfigError();
}

/** The frozen demo, presented as a list summary. Pure, never touches the DB. */
export function demoSummary(): MatterSummary {
  const d = getDemoMatter(DEMO_SLUG);
  return {
    id: DEMO_SLUG, slug: DEMO_SLUG, titleHe: d.titleHe, procedureType: d.procedureType,
    currentStageId: d.currentStageId, status: "open", fileNoHe: d.fileNoHe ?? null,
    forumHe: d.forumHe ?? null, openedAt: d.openedAt,
  };
}

/** Explicit result of loading the DURABLE matters only (never the demo). */
export type DurableMattersResult =
  | { status: "success"; matters: MatterSummary[] }
  | { status: "configuration_error"; code: string }
  | { status: "database_error"; code: string };

/** Load the durable matters with an explicit outcome. Never throws; never turns
 *  an error into an empty success. Logs a safe diagnostic line.
 *
 *  Identity (Slice 0.8.2): `organizationId` is the caller's REAL active
 *  organization, resolved server-side from the verified session by the page —
 *  no longer the hardcoded demo tenant. The query mechanics and the LIST HOTFIX
 *  invariants are otherwise unchanged; the frozen demo is still composed by the
 *  page, independently of this durable query. */
export async function getDurableMatters(organizationId: string): Promise<DurableMattersResult> {
  const correlationId = randomUUID();
  const mode = documentStorageMode();
  const refExpected = expectedProjectRef();
  const projectRefMatch = refExpected ? Boolean(supabaseUrl()?.includes(refExpected)) : null;

  // memory/local mode: there is no durable store — that's a success with none.
  if (mode !== "supabase_dev") {
    diag({ correlationId, mode, projectRefMatch, orgResolved: false, queryOk: true, durableCount: 0, outcome: "memory_no_durable" });
    return { status: "success", matters: [] };
  }
  const cfg = persistenceConfigError();
  if (cfg) {
    diag({ correlationId, mode, projectRefMatch, orgResolved: false, queryOk: false, durableCount: 0, outcome: "configuration_error", code: cfg });
    return { status: "configuration_error", code: `${cfg} [cid:${correlationId}]` };
  }
  try {
    const repo = new MatterRepository(serviceClient());
    const r = await repo.list(organizationId);
    if (!r.ok) {
      diag({ correlationId, mode, projectRefMatch, orgResolved: true, queryOk: false, durableCount: 0, outcome: "database_error", code: r.code });
      return { status: "database_error", code: `${r.code} [cid:${correlationId}]` };
    }
    const matters = r.value.filter((m) => m.slug !== DEMO_SLUG);
    diag({ correlationId, mode, projectRefMatch, orgResolved: true, queryOk: true, durableCount: matters.length, outcome: "success" });
    return { status: "success", matters };
  } catch (e) {
    diag({ correlationId, mode, projectRefMatch, orgResolved: true, queryOk: false, durableCount: 0, outcome: "exception", code: (e as Error).name });
    return { status: "database_error", code: `exception:${(e as Error).name} [cid:${correlationId}]` };
  }
}

/** Pure composition: the frozen demo is ALWAYS first and present exactly once;
 *  a durable failure surfaces as an error code (banner) — never an empty list. */
export function composeMatterList(
  demo: MatterSummary,
  result: DurableMattersResult,
): { matters: MatterSummary[]; errorCode: string | null } {
  if (result.status === "success") {
    return { matters: [demo, ...result.matters.filter((m) => m.slug !== demo.slug)], errorCode: null };
  }
  return { matters: [demo], errorCode: result.code };
}

/** Load a Matter for the room. Returns null only when a durable matter is missing. */
export async function loadMatterForRoom(param: string, nowISO: string): Promise<Matter | null> {
  if (param === DEMO_SLUG) return getDemoMatter(DEMO_SLUG);   // frozen rich reference
  if (!durable()) return getDemoMatter(param);               // local/misconfigured fallback
  const repo = new MatterRepository(serviceClient());
  const r = await repo.getHydrated(DEMO_SEED.organizationId, param, nowISO);
  return r.ok ? r.value : null;
}

/** Safe server diagnostics — NEVER logs secrets, keys, or document contents. */
function diag(d: {
  correlationId: string; mode: string; projectRefMatch: boolean | null;
  orgResolved: boolean; queryOk: boolean; durableCount: number; outcome: string; code?: string;
}): void {
  console.log(JSON.stringify({
    tag: "matters.list",
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? "local",
    demoInjected: true, // the page always composes the demo independently
    ...d,
  }));
}
