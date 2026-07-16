/**
 * Pure hydration tests for the matter repository (Capability 2, Slice 1).
 * No DB — validates row -> live Matter mapping and the honest empty-intake state.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { hydrateMatter, summaryFromRow } from "../matter-repository.ts";
import { buildMatterProfile } from "../../profile.ts";
import type { Database } from "../../../../types/database.types.ts";

type MatterRow = Database["public"]["Tables"]["matters"]["Row"];
type EvidenceRow = Database["public"]["Tables"]["matter_evidence"]["Row"];

function row(over: Partial<MatterRow> = {}): MatterRow {
  return {
    id: "11111111-1111-1111-1111-111111111111", organization_id: "org", slug: "m-abc",
    title_he: "כהן נ׳ טק־לייף", file_no_he: "23-1", forum_he: "אזורי ת״א",
    legal_domain: "labor", procedure_type: "severance_claim", topic: "severance_claim",
    current_stage_id: "intake", status: "open", assigned_owner_id: null,
    confidentiality: "client_confidential", ai_policy: "allowed_with_review",
    opened_at: "2026-07-10T00:00:00Z", as_of: null,
    created_at: "2026-07-10T00:00:00Z", updated_at: "2026-07-10T00:00:00Z", deleted_at: null,
    ...over,
  };
}
function ev(over: Partial<EvidenceRow> = {}): EvidenceRow {
  return {
    id: "e1", organization_id: "org", matter_id: row().id, label_he: "אישור העסקה",
    evidence_type: "document", mandatory: true, status: "required",
    owner_id: null, owner_he: null, provenance: {}, linked_document_id: null,
    linked_fact_field: null, legal_issue_id_he: null, procedure_stage_id: null,
    created_at: "2026-07-10T00:00:00Z", updated_at: "2026-07-10T00:00:00Z",
    ...over,
  };
}

test("hydrateMatter maps header, keeps legalDomain labor, addresses by slug", () => {
  const m = hydrateMatter(row(), [], [], "2026-07-15T00:00:00Z");
  assert.equal(m.id, "m-abc");           // room addresses by slug
  assert.equal(m.titleHe, "כהן נ׳ טק־לייף");
  assert.equal(m.legalDomain, "labor");
  assert.equal(m.procedureType, "severance_claim");
  assert.equal(m.currentStageId, "intake");
  assert.equal(m.asOf, "2026-07-15");    // falls back to nowISO date
});

test("a fresh matter has no facts → engine reports insufficient facts (honest, not a crash)", () => {
  const m = hydrateMatter(row(), [], [], "2026-07-15T00:00:00Z");
  assert.equal(m.facts.length, 0);
  assert.equal(m.deadlines.length, 0);
  const p = buildMatterProfile(m); // must run without throwing on an empty matter
  assert.ok(p.score.summary.posture); // computes some posture
  assert.match(JSON.stringify(p.score.summary), /insufficient|review|unknown|לא מספיק/i);
});

test("evidence requirements map through with collected derived from status", () => {
  const m = hydrateMatter(row(), [ev({ status: "collected" }), ev({ id: "e2", status: "required" })], [], "2026-07-15T00:00:00Z");
  assert.equal(m.evidence.length, 2);
  assert.equal(m.evidence[0].collected, true);
  assert.equal(m.evidence[1].collected, false);
  assert.equal(m.evidence[0].mandatory, true);
});

test("summaryFromRow projects the list card fields", () => {
  const s = summaryFromRow(row({ slug: "m-xyz", title_he: "פלוני" }));
  assert.equal(s.slug, "m-xyz");
  assert.equal(s.titleHe, "פלוני");
  assert.equal(s.procedureType, "severance_claim");
});
