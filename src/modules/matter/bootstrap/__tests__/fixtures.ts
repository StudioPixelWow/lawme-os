/**
 * Shared, deterministic fixtures for the Bootstrap Validation Engine tests.
 * Pure builders returning a fresh, mutable copy each call (so a test can edit
 * one field without affecting others). No DB, no clock, no randomness.
 */

import type {
  BootstrapValidationContext,
  RawBootstrapDraft,
  ResolvedBootstrapReferenceFacts,
} from "../contracts.ts";

/** Deep-mutable view of a contract type, so tests can edit a fresh fixture copy.
 *  The engine still consumes the readonly contract types (a mutable value is
 *  assignable to a readonly parameter). */
export type DeepWritable<T> = T extends readonly (infer U)[]
  ? DeepWritable<U>[]
  : T extends object
    ? { -readonly [K in keyof T]: DeepWritable<T[K]> }
    : T;

export const ORG = "00000000-0000-4000-8000-0000000000aa";
export const OTHER_ORG = "00000000-0000-4000-8000-0000000000bb";
export const OWNER = "11111111-1111-4000-8000-000000000001";
export const NOW = "2026-07-24T09:00:00.000Z";
export const SCHEMA = "matter-intake-contract-1.0.0";
export const ENGINE = "intake-1";
export const VALIDATION = "bootstrap-validation-v1";

export function rawDraft(): DeepWritable<RawBootstrapDraft> {
  return {
    draftId: "draft-1",
    organizationId: ORG,
    status: "ready_for_review",
    versionToken: "v1",
    schemaVersion: SCHEMA,
    engineVersion: ENGINE,
    expiresAt: null,
    confirmedMatterId: null,
    structuredDraft: {
      contacts: [
        { id: "c1", value: { displayNameHe: "רונית לוי", kind: "person", duplicatePossibility: false }, span: null, provenance: { ruleId: "contact.person" } },
        { id: "c2", value: { displayNameHe: "טק-לייף בע\"מ", kind: "organization", duplicatePossibility: false }, span: { source: "story", start: 0, end: 5, quoteHe: "טק-לייף" }, provenance: { ruleId: "contact.company" } },
      ],
      facts: [
        { id: "f1", value: { factKey: "employment_duration", statementHe: "עבדה שלוש שנים", suggestedStatus: "client_alleged" }, span: null, provenance: { ruleId: "fact.duration" } },
        { id: "f2", value: { factKey: "dismissal_date", statementHe: "פוטרה ביוני", suggestedStatus: "client_alleged" }, span: null, provenance: { ruleId: "fact.dismissal" } },
      ],
      deadlines: [
        { id: "d1", value: { labelHe: "הגשת כתב תביעה", kind: "deadline", sourceType: "statute", deadlineConfidence: "known", dueAt: "2026-08-01", timezone: "Asia/Jerusalem", basisHe: "סעיף חוק", strict: true }, span: null, provenance: { ruleId: "deadline.claim" } },
      ],
      evidenceRequirements: [
        { id: "e1", value: { labelHe: "תלוש שכר", mandatory: true }, span: null, provenance: { ruleId: "evidence.payslip" } },
      ],
    },
  };
}

export function referenceFacts(): DeepWritable<ResolvedBootstrapReferenceFacts> {
  return {
    organization: { id: ORG, active: true },
    owner: { profileId: OWNER, organizationId: ORG, activeMember: true },
    members: [{ profileId: OWNER, organizationId: ORG, activeMember: true }],
    resolvedContacts: [{ contactId: "existing-contact-1", organizationId: ORG, kind: "person" }],
    supportedMatterTypes: ["pregnancy_dismissal", "severance_claim"],
    existingConfirmation: null,
    supportedSchemaVersions: [SCHEMA],
    supportedDraftEngineVersions: [ENGINE],
    supportedValidationVersion: VALIDATION,
  };
}

export function context(): DeepWritable<BootstrapValidationContext> {
  return {
    activeOrganizationId: ORG,
    actorProfileId: OWNER,
    expectedDraftVersion: "v1",
    validatedAt: NOW,
    correlationId: "corr-1",
    approvals: {
      matter: {
        titleHe: "רונית לוי נ׳ טק-לייף",
        procedureType: "pregnancy_dismissal",
        forumHe: "בית הדין האזורי לעבודה",
        confidentiality: "client_confidential",
        aiPolicy: "allowed_with_review",
      },
      participants: [{ itemId: "c1", role: "client" }],
      facts: [{ itemId: "f1" }, { itemId: "f2" }],
      deadlines: [{ itemId: "d1" }],
      evidenceRequirements: [{ itemId: "e1" }],
    },
  };
}

/** Deep clone via JSON — fixtures are plain data, so this is safe + isolating. */
export function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}
