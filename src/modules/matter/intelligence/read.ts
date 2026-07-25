/**
 * Matter Intelligence — the single authorized SOURCE read (Slice 2.1.0). SERVER-ONLY.
 *
 * This is the ONE place that reads a matter's raw Capability-1 rows. It returns
 * the canonical `MatterSource`; both the Workspace view and the `MatterIntelligence`
 * model derive from it — nothing else touches the raw tables. The read is gated
 * by the SAME resource-authorization policy as the room: the `matter.read`
 * decision is evaluated BEFORE any content is loaded (no enumeration), and only
 * the authenticated (RLS) client is used — never a service client, never DEMO_SEED.
 */
import type { ActorContext } from "../../identity/index.ts";
import type { AuthDb } from "../../identity/infrastructure/supabase-auth-client.ts";
import { createResourceAuthorizationService } from "../../identity/authorization-integration/index.ts";
import { isCanonicalUuid } from "../../identity/infrastructure/authorization-facts-support.ts";
import type { MatterSource } from "./source.ts";

const OWNER_LIKE_ROLES: readonly string[] = ["partner", "senior_lawyer", "lawyer"];

/** Best-effort human source string from a fact's provenance jsonb. */
function provenanceSource(provenance: unknown): string | null {
  if (!provenance || typeof provenance !== "object") return null;
  const p = provenance as Record<string, unknown>;
  for (const key of ["sourceHe", "source", "originHe", "origin", "label"]) {
    const v = p[key];
    if (typeof v === "string" && v.trim().length > 0) return v;
  }
  return null;
}

/**
 * Load the authorized canonical source for `param` (slug or uuid). Returns
 * `null` on denial or absence — callers render the uniform not-found.
 */
export async function loadMatterSource(
  db: AuthDb,
  actor: ActorContext,
  param: string,
  nowISO: string,
): Promise<MatterSource | null> {
  const orgId = actor.organization.id;

  // 1) Authorize the READ before any content is touched.
  const decision = await createResourceAuthorizationService(db).authorizeResourceRequest(actor, {
    resourceType: "matter",
    action: "matter.read",
    matterIdOrSlug: param,
  });
  if (!decision.allowed) return null;

  // 2) Resolve the matter header.
  const base = db.from("matters").select("*").eq("organization_id", orgId).is("deleted_at", null).limit(1);
  const { data: matterRows, error: matterErr } = isCanonicalUuid(param)
    ? await base.eq("id", param)
    : await base.eq("slug", param);
  if (matterErr) return null;
  const row = matterRows?.[0];
  if (!row) return null;
  const matterId = row.id;

  // 3) Load every persisted child collection in parallel (RLS-scoped).
  const [facts, participants, documents, evidence, deadlines, activity, members] = await Promise.all([
    db.from("matter_facts").select("*").eq("organization_id", orgId).eq("matter_id", matterId),
    db.from("matter_participants").select("*").eq("organization_id", orgId).eq("matter_id", matterId).is("archived_at", null),
    db.from("matter_documents").select("*").eq("organization_id", orgId).eq("matter_id", matterId).is("deleted_at", null),
    db.from("matter_evidence").select("*").eq("organization_id", orgId).eq("matter_id", matterId),
    db.from("matter_deadlines").select("*").eq("organization_id", orgId).eq("matter_id", matterId),
    db.from("matter_activity").select("*").eq("organization_id", orgId).eq("matter_id", matterId),
    db.from("matter_members").select("*").eq("organization_id", orgId).eq("matter_id", matterId),
  ]);

  const participantRows = participants.data ?? [];
  const memberRows = members.data ?? [];

  // 4) Resolve linked contact + profile display names (best effort; RLS may
  //    withhold — an absent name honestly stays null, never invented).
  const contactIds = [...new Set(participantRows.map((p) => p.contact_id))];
  const contactsById = new Map<string, { name_he: string; kind: string; id_number_he: string | null }>();
  if (contactIds.length) {
    const { data: contacts } = await db
      .from("contacts").select("id, name_he, kind, id_number_he")
      .eq("organization_id", orgId).in("id", contactIds);
    for (const c of contacts ?? []) contactsById.set(c.id, { name_he: c.name_he, kind: c.kind, id_number_he: c.id_number_he });
  }

  const profileIds = new Set<string>(memberRows.map((m) => m.profile_id));
  if (row.assigned_owner_id) profileIds.add(row.assigned_owner_id);
  const profileById = new Map<string, string>();
  if (profileIds.size) {
    const { data: profiles } = await db.from("profiles").select("id, display_name").in("id", [...profileIds]);
    for (const p of profiles ?? []) profileById.set(p.id, p.display_name);
  }

  const clientParticipant = participantRows.find((p) => p.role === "client");
  const clientNameHe = clientParticipant ? contactsById.get(clientParticipant.contact_id)?.name_he ?? null : null;

  let responsibleLawyerHe: string | null = row.assigned_owner_id ? profileById.get(row.assigned_owner_id) ?? null : null;
  if (!responsibleLawyerHe && memberRows.length) {
    const ownerLike = memberRows.find((m) => OWNER_LIKE_ROLES.includes(m.matter_role)) ?? memberRows[0];
    responsibleLawyerHe = profileById.get(ownerLike.profile_id) ?? null;
  }

  const confidentiality = (row as { confidentiality?: string | null }).confidentiality ?? null;

  return {
    nowISO,
    header: {
      id: matterId,
      slug: row.slug,
      titleHe: row.title_he,
      fileNoHe: row.file_no_he,
      forumHe: row.forum_he,
      legalDomain: row.legal_domain ?? "labor",
      procedureType: row.procedure_type,
      topic: row.topic,
      currentStageId: row.current_stage_id,
      status: row.status,
      openedAtISO: row.opened_at,
      confidentiality,
    },
    clientNameHe,
    responsibleLawyerHe,
    facts: (facts.data ?? []).map((f) => ({
      id: f.id, factKey: f.fact_key, statementHe: f.statement_he, status: f.status, sourceHe: provenanceSource(f.provenance),
    })),
    participants: participantRows.map((p) => {
      const c = contactsById.get(p.contact_id);
      return {
        id: p.id, role: p.role, nameHe: c?.name_he ?? null, kind: c?.kind ?? null, contactId: p.contact_id,
        idNumberHe: c?.id_number_he ?? null, responsiveness: p.responsiveness, archived: false,
      };
    }),
    documents: (documents.data ?? []).map((d) => ({
      id: d.id, titleHe: d.title, documentType: d.document_type, evidenceType: d.evidence_type,
      approvalState: d.approval_state, dateISO: d.document_date, createdAtISO: d.created_at,
    })),
    evidence: (evidence.data ?? []).map((e) => ({
      id: e.id, labelHe: e.label_he, evidenceType: e.evidence_type, mandatory: e.mandatory, status: e.status,
    })),
    deadlines: (deadlines.data ?? []).map((d) => ({
      id: d.id, labelHe: d.label_he, dueAtISO: d.due_at, strict: d.strict, basisHe: d.basis_he, source: d.source, confidence: d.confidence,
    })),
    activity: (activity.data ?? []).map((a) => ({
      id: a.id, occurredAtISO: a.occurred_at, kind: a.kind, descriptionHe: a.description_he, actorHe: a.actor_he,
    })),
  };
}
