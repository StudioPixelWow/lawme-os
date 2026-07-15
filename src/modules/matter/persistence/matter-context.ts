/**
 * Matter context resolution + demo seed (Capability 1, Slice A). SERVER-ONLY.
 *
 * Resolves the durable {organizationId, matterId} for a Matter Room route param
 * (a slug like "demo" or a uuid) so server routes can enforce access and the
 * repository can read/write real rows. Also provides an IDEMPOTENT demo seed
 * that materialises the org-demo organization + the "demo" matter (+ evidence
 * requirements) in Development, so /matters/demo is durable in Preview.
 *
 * The seed runs ONLY through the service client (server-side) and ONLY targets
 * the Development project. It never runs in the browser. Everything here is
 * additive and idempotent (on conflict do nothing / upsert by natural key).
 */
import type { Db } from "./supabase-server.ts";
import { DEMO_SEED } from "../fixtures/demo-seed.ts";

export interface MatterContext {
  organizationId: string;
  matterId: string;
  slug: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Resolve a route param to a durable matter context (by uuid or by slug). */
export async function resolveMatterContext(db: Db, param: string): Promise<MatterContext | null> {
  const q = db.from("matters").select("id, organization_id, slug").is("deleted_at", null).limit(1);
  const { data, error } = UUID_RE.test(param) ? await q.eq("id", param) : await q.eq("slug", param);
  if (error || !data || data.length === 0) return null;
  const row = data[0];
  return { organizationId: row.organization_id, matterId: row.id, slug: row.slug };
}

/**
 * Idempotently ensure the demo organization + matter (+ requirements) exist.
 * Returns the resolved demo context. Safe to call on every demo access.
 */
export async function ensureDemoSeed(db: Db): Promise<MatterContext> {
  const s = DEMO_SEED;
  await db.from("organizations").upsert(
    { id: s.organizationId, name: s.organizationName, slug: s.organizationSlug },
    { onConflict: "id" },
  );
  await db.from("matters").upsert(
    {
      id: s.matterId,
      organization_id: s.organizationId,
      slug: s.matterSlug,
      title_he: s.titleHe,
      procedure_type: s.procedureType,
      topic: s.topic,
      current_stage_id: s.currentStageId,
      forum_he: s.forumHe,
      file_no_he: s.fileNoHe,
    },
    { onConflict: "id" },
  );
  // evidence requirements (inputs). Upsert by stable id so re-seeding is a no-op.
  if (s.evidenceRequirements.length > 0) {
    await db.from("matter_evidence").upsert(
      s.evidenceRequirements.map((r) => ({
        id: r.id,
        organization_id: s.organizationId,
        matter_id: s.matterId,
        label_he: r.labelHe,
        evidence_type: r.evidenceType,
        mandatory: r.mandatory,
        status: r.status,
        linked_fact_field: r.linkedFactField ?? null,
      })),
      { onConflict: "id" },
    );
  }
  return { organizationId: s.organizationId, matterId: s.matterId, slug: s.matterSlug };
}
