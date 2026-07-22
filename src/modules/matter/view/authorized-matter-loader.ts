/**
 * Authenticated, authorization-integrated Matter reads (Cap 0.8, Slice 0.8.4).
 * SERVER-ONLY.
 *
 * Replaces the service-role + demo-tenant read paths for the Matter LIST and
 * ROOM. Both use the AUTHENTICATED (RLS) client and the canonical resource
 * authorization policy — never `serviceClient()`, never `DEMO_SEED`:
 *
 *  - LIST: loads only the actor's owner/member matters (Strategy B — a bounded
 *    id set), never every organization matter, then reads summaries for that set.
 *  - ROOM: resolves the parent-matter READ decision FIRST; content is hydrated
 *    only after authorization succeeds. A denial looks uniformly "unavailable".
 *
 * NOTE: current Matter RLS still permits every org member, so this application
 * policy is STRICTER than RLS. Defense-in-depth is not yet complete — a direct
 * browser Supabase read could bypass this until the RLS-hardening migration.
 */
import { z } from "zod";
import type { ActorContext } from "../../identity";
import type { AuthDb } from "../../identity/infrastructure/supabase-auth-client.ts";
import { createResourceAuthorizationService } from "../../identity/authorization-integration/index.ts";
import { createReadableMatterIndex } from "../../identity/infrastructure/matter-policy-facts-repository.ts";
import type { Matter } from "../types.ts";
import { getDemoMatter } from "../fixtures/demo.ts";
import { MatterRepository, type MatterSummary } from "../persistence/matter-repository.ts";
import { demoSummary, type DurableMattersResult } from "./matter-loader.ts";

const DEMO_SLUG = "demo";
const SUMMARY_COLUMNS = "id, slug, title_he, procedure_type, current_stage_id, status, file_no_he, forum_he, opened_at" as const;

const summaryRowSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title_he: z.string(),
  procedure_type: z.string(),
  current_stage_id: z.string(),
  status: z.string(),
  file_no_he: z.string().nullable(),
  forum_he: z.string().nullable(),
  opened_at: z.string(),
});

function toSummary(r: z.infer<typeof summaryRowSchema>): MatterSummary {
  return {
    id: r.id, slug: r.slug, titleHe: r.title_he, procedureType: r.procedure_type,
    currentStageId: r.current_stage_id, status: r.status, fileNoHe: r.file_no_he,
    forumHe: r.forum_he, openedAt: r.opened_at,
  };
}

/**
 * Load the DURABLE matters the actor may READ — owner/member only. Returns the
 * explicit LIST-HOTFIX result so the page still composes the frozen demo and
 * surfaces a banner on failure (never a silent empty). Generic org-wide access is
 * impossible here: the id set is the owner/member candidate set (Strategy B).
 */
export async function loadReadableDurableMatters(db: AuthDb, actor: ActorContext): Promise<DurableMattersResult> {
  try {
    const ids = await createReadableMatterIndex(db).listReadableMatterIds(actor);
    if (ids.length === 0) return { status: "success", matters: [] };

    const { data, error } = await db
      .from("matters")
      .select(SUMMARY_COLUMNS)
      .eq("organization_id", actor.organization.id)
      .in("id", ids as string[])
      .is("deleted_at", null)
      .order("opened_at", { ascending: false });
    if (error) return { status: "database_error", code: "list_query_failed" };

    const summaries: MatterSummary[] = [];
    for (const row of data ?? []) {
      const parsed = summaryRowSchema.safeParse(row);
      if (parsed.success && parsed.data.slug !== DEMO_SLUG) summaries.push(toSummary(parsed.data));
    }
    return { status: "success", matters: summaries };
  } catch {
    return { status: "database_error", code: "list_exception" };
  }
}

export type AuthorizedMatterRoom = { readonly ok: true; readonly matter: Matter } | { readonly ok: false };

/**
 * Load a Matter for the ROOM only when the actor is authorized to read it.
 * The frozen "demo" is a fictional showcase fixture available to any
 * authenticated actor (no real client data). Every real matter is gated: the
 * READ decision is evaluated BEFORE any content is hydrated.
 */
export async function loadAuthorizedMatterRoom(
  db: AuthDb,
  actor: ActorContext,
  param: string,
  nowISO: string,
): Promise<AuthorizedMatterRoom> {
  if (param === DEMO_SLUG) return { ok: true, matter: getDemoMatter(DEMO_SLUG) };

  const service = createResourceAuthorizationService(db);
  const decision = await service.authorizeResourceRequest(actor, { resourceType: "matter", action: "matter.read", matterIdOrSlug: param });
  if (!decision.allowed) return { ok: false };

  // Authorized → hydrate through the SAME authenticated client (RLS permits an
  // org member to read; the application policy already narrowed to owner/member).
  const repo = new MatterRepository(db);
  const r = await repo.getHydrated(actor.organization.id, param, nowISO);
  return r.ok ? { ok: true, matter: r.value } : { ok: false };
}

// Re-export the pure composition helpers so the page has a single import site.
export { demoSummary };
