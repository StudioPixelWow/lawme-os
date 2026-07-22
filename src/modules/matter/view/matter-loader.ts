/**
 * Matter list composition helpers (Capability 2 list hotfix; Cap 0.8 Slice 0.8.4).
 * SERVER-ONLY (pure).
 *
 * The DURABLE read paths now live in `authorized-matter-loader.ts` (authenticated
 * client + resource authorization). This module keeps ONLY the pure, DB-free
 * pieces: the frozen-demo summary and the list composition that guarantees the
 * demo is always present exactly once and a durable failure surfaces as a banner
 * (never a silent empty). No `serviceClient()`, no `DEMO_SEED` here.
 */
import { getDemoMatter } from "../fixtures/demo.ts";
import { type MatterSummary } from "../persistence/matter-repository.ts";

const DEMO_SLUG = "demo";

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
