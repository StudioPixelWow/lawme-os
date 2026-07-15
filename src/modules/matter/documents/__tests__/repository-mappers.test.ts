/**
 * Pure mapper tests for the matter documents repository (Slice A).
 * No database — validates row<->domain mapping, derived provenance, and the
 * latest-version reducer deterministically.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { rowToEvidenceDocument, deriveProvenance, latestByDocument } from "../repository.ts";
import type { Database } from "../../../../types/database.types.ts";

type DocRow = Database["public"]["Tables"]["matter_documents"]["Row"];
type VerRow = Database["public"]["Tables"]["matter_document_versions"]["Row"];

function docRow(over: Partial<DocRow> = {}): DocRow {
  return {
    id: "doc-1", organization_id: "org-1", matter_id: "m-1",
    title: "תכתובת וואטסאפ", filename: "wa.png", mime_type: "image/png", size: 5000,
    document_type: "correspondence", evidence_type: "communication", source_type: "opposing_party",
    document_date: null, uploaded_by_id: null, uploaded_by_he: "עו״ד מאיה",
    assigned_reviewer_id: null, assigned_reviewer_he: null, confidentiality: "standard",
    evidence_decision: null, verification_state: "unverified", approval_state: "draft",
    scan_status: "scan_clean_demo", workflow_id: null, legal_issue_id_he: null,
    procedure_stage_id: null, latest_version: 1,
    created_at: "2026-07-14T00:00:00Z", updated_at: "2026-07-14T00:00:00Z", deleted_at: null,
    ...over,
  };
}
function verRow(over: Partial<VerRow> = {}): VerRow {
  return {
    id: "v-1", organization_id: "org-1", matter_id: "m-1", document_id: "doc-1",
    version: 1, content_hash: "a".repeat(64), storage_bucket: "matter-documents",
    storage_path: "organizations/org-1/matters/m-1/uuid-wa.png", byte_size: 5000,
    mime_type: "image/png", prev_version_id: null, created_by_id: null, created_by_he: null,
    verification_status: "unverified", change_reason: null, created_at: "2026-07-14T00:00:00Z",
    ...over,
  };
}

test("rowToEvidenceDocument composes doc + latest version, derives provenance", () => {
  const d = rowToEvidenceDocument(docRow(), verRow());
  assert.equal(d.id, "doc-1");
  assert.equal(d.storageRef, "organizations/org-1/matters/m-1/uuid-wa.png");
  assert.equal(d.hash, "a".repeat(64));
  assert.equal(d.version, 1);
  assert.equal(d.sourceType, "opposing_party");
  assert.equal(d.provenance.originHe, "הצד שכנגד"); // SOURCE_TYPE_HE mapping
  assert.equal(d.provenance.capturedByHe, "עו״ד מאיה");
  assert.equal(d.evidenceRequirementId, null); // derived elsewhere, never stored
});

test("missing version falls back to latest_version and empty storage ref", () => {
  const d = rowToEvidenceDocument(docRow({ latest_version: 3 }), null);
  assert.equal(d.version, 3);
  assert.equal(d.storageRef, "");
  assert.equal(d.hash, "");
});

test("deriveProvenance maps every source type and tolerates null uploader", () => {
  assert.equal(deriveProvenance("client", null).originHe, "הלקוח");
  assert.equal(deriveProvenance("client", null).capturedByHe, "—");
  assert.equal(deriveProvenance("public_record", "פקיד").originHe, "רשומה ציבורית");
});

test("latestByDocument keeps the highest version per document", () => {
  const map = latestByDocument([
    verRow({ id: "v1", document_id: "A", version: 1 }),
    verRow({ id: "v2", document_id: "A", version: 2 }),
    verRow({ id: "v3", document_id: "B", version: 1 }),
  ]);
  assert.equal(map.get("A")?.id, "v2");
  assert.equal(map.get("B")?.id, "v3");
  assert.equal(map.size, 2);
});
