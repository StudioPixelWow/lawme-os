/**
 * Shared test fixtures + fakes for the Bootstrap application integration.
 * Node strip-types friendly (no enum, no JSX, union types, .ts imports).
 */

import type { ActorContext } from "../../../identity/actor-context.ts";
import type {
  ResourceAuthorizationService,
} from "../../../identity/authorization-integration/index.ts";
import type {
  BootstrapValidationResult,
  MatterAggregatePlan,
  RawBootstrapDraft,
  ResolvedBootstrapReferenceFacts,
  ValidatedBootstrapDraft,
} from "../../bootstrap/index.ts";
import type { BootstrapDraftSnapshotLoader } from "../draft-snapshot-loader.ts";
import type { BootstrapReferenceFactsLoader } from "../reference-facts-loader.ts";
import type { BootstrapMatterRpcGateway, BootstrapRpcOutcome, BootstrapRpcRequest } from "../rpc-gateway.ts";

export const ORG_ID = "a11f0000-0000-4000-8000-0000000000a1";
export const ACTOR_ID = "f0000001-0000-4000-8000-000000000001";
export const DRAFT_ID = "d1000001-0000-4000-8000-000000000001";
export const MATTER_ID = "ed000000-0000-4000-8000-0000000000ed";
export const CORRELATION_ID = "11111111-1111-4000-8000-000000000abc";
export const VERSION_TOKEN = "v1";
export const SCHEMA_VERSION = "matter-intake-contract-1.0.0";
export const ENGINE_VERSION = "matter-intake-engine-1.0.0|matter-intake-contract-1.0.0";
export const PLAN_HASH = "a".repeat(64);

export function makeActor(overrides: Partial<{ profileId: string; organizationId: string; correlationId: string }> = {}): ActorContext {
  const profileId = overrides.profileId ?? ACTOR_ID;
  const organizationId = overrides.organizationId ?? ORG_ID;
  const correlationId = overrides.correlationId ?? CORRELATION_ID;
  return Object.freeze({
    actor: { type: "user", profileId, authUserId: profileId },
    organization: { id: organizationId },
    membership: { id: "m1", role: "owner", status: "active" },
    capabilities: new Set(["intake.confirm"]),
    policy: { capabilityMapVersion: "cap-v1", authorizationPolicyVersion: "resource-authorization-v1" },
    request: { correlationId },
  }) as unknown as ActorContext;
}

export interface AuthzCall {
  readonly resourceType: string;
  readonly action: string;
  readonly id: string;
}

/** Fake authorization service driven by a predicate; records every call. */
export function makeAuthzService(
  allow: (call: AuthzCall) => boolean,
): { service: ResourceAuthorizationService; calls: AuthzCall[] } {
  const calls: AuthzCall[] = [];
  const service: ResourceAuthorizationService = {
    async authorizeResourceRequest(_actor, request) {
      const anyReq = request as unknown as Record<string, unknown>;
      const id = (anyReq["draftId"] ?? anyReq["matterIdOrSlug"] ?? "") as string;
      const call: AuthzCall = { resourceType: request.resourceType, action: request.action, id };
      calls.push(call);
      const allowed = allow(call);
      return {
        allowed,
        code: allowed ? "RESOURCE_AUTHORIZED" : "RESOURCE_NOT_AVAILABLE",
        policyVersion: "resource-authorization-v1",
        action: request.action,
        resourceType: request.resourceType,
        correlationId: CORRELATION_ID,
      } as Awaited<ReturnType<ResourceAuthorizationService["authorizeResourceRequest"]>>;
    },
  };
  return { service, calls };
}

export function makeRawDraft(overrides: Partial<RawBootstrapDraft> = {}): RawBootstrapDraft {
  return Object.freeze({
    draftId: DRAFT_ID,
    organizationId: ORG_ID,
    status: "ready_for_review",
    versionToken: VERSION_TOKEN,
    schemaVersion: SCHEMA_VERSION,
    engineVersion: ENGINE_VERSION,
    expiresAt: null,
    confirmedMatterId: null,
    structuredDraft: { contacts: [] },
    ...overrides,
  });
}

export function makeDraftLoader(draft: RawBootstrapDraft | null): { loader: BootstrapDraftSnapshotLoader; calls: number } {
  const state = { calls: 0 };
  const loader: BootstrapDraftSnapshotLoader = {
    async load() {
      state.calls += 1;
      return draft;
    },
  };
  return { loader, get calls() { return state.calls; } } as { loader: BootstrapDraftSnapshotLoader; calls: number };
}

export function makeReferenceFacts(): ResolvedBootstrapReferenceFacts {
  return Object.freeze({
    organization: { id: ORG_ID, active: true },
    owner: { profileId: ACTOR_ID, organizationId: ORG_ID, activeMember: true },
    members: [{ profileId: ACTOR_ID, organizationId: ORG_ID, activeMember: true }],
    resolvedContacts: [],
    supportedMatterTypes: ["pregnancy_dismissal"] as const,
    existingConfirmation: null,
    supportedSchemaVersions: [SCHEMA_VERSION],
    supportedDraftEngineVersions: [ENGINE_VERSION],
    supportedValidationVersion: "bootstrap-validation-v1",
  });
}

export function makeReferenceLoader(): BootstrapReferenceFactsLoader {
  return { async load() { return makeReferenceFacts(); } };
}

function makeValidatedDraft(): ValidatedBootstrapDraft {
  const provenance = { origin: "intelligent_intake", draftId: DRAFT_ID, ruleId: "r1", span: null } as const;
  return {
    sourceDraftId: DRAFT_ID,
    sourceDraftVersionToken: VERSION_TOKEN,
    sourceDraftSchemaVersion: SCHEMA_VERSION,
    sourceInputHash: "e".repeat(64),
    validatedAt: "2026-07-24T10:00:00.000Z",
    validationVersion: "bootstrap-validation-v1",
    normalizedMatter: {
      titleHe: "רונית לוי",
      procedureType: "pregnancy_dismissal",
      forumHe: "בית הדין",
      confidentiality: "client_confidential",
      aiPolicy: "allowed_with_review",
      legalDomain: "labor",
    },
    normalizedParticipants: [
      { participantKey: "p1", role: "client", displayNameHe: "רונית לוי", kind: "person", linkToContactId: null, sourceItemId: "c1", provenance },
    ],
    normalizedFacts: [
      { factKey: "employment_duration", statementHe: "עבדה שלוש שנים", status: "client_alleged", sourceItemId: "f1", provenance },
    ],
    normalizedDeadlines: [
      { labelHe: "הגשה", dueAt: "2026-08-01T00:00:00+03:00", source: "statute", confidence: "known", timezone: "Asia/Jerusalem", strict: true, basisHe: "סעיף", sourceItemId: "d1" },
    ],
    normalizedEvidence: [{ labelHe: "תלוש", mandatory: true, sourceItemId: "e1" }],
    normalizedMetadata: {
      organizationId: ORG_ID,
      sourceEngineVersion: ENGINE_VERSION,
      validationVersion: "bootstrap-validation-v1",
      warningCodes: [],
      counts: { participants: 1, facts: 1, deadlines: 1, evidence: 1 },
    },
  } as unknown as ValidatedBootstrapDraft;
}

export function makeValidResult(): BootstrapValidationResult {
  return {
    valid: true,
    blockingIssues: [],
    warnings: [],
    infos: [],
    normalizedDraft: makeValidatedDraft(),
    validationVersion: "bootstrap-validation-v1",
    statistics: {
      participants: { considered: 1, accepted: 1, dropped: 0 },
      facts: { considered: 1, accepted: 1, dropped: 0 },
      deadlines: { considered: 1, accepted: 1, dropped: 0 },
      evidence: { considered: 1, accepted: 1, dropped: 0 },
      contacts: { considered: 1, accepted: 1, dropped: 0 },
      issues: 0,
      warnings: 0,
      infos: 0,
    },
  };
}

export function makeInvalidResult(codes: readonly string[]): BootstrapValidationResult {
  return {
    valid: false,
    blockingIssues: codes.map((c) => ({
      stableCode: c,
      severity: "blocking",
      field: null,
      path: null,
      retryable: false,
      userMessageHe: "שגיאה",
      developerMessage: "structural",
    })) as unknown as BootstrapValidationResult["blockingIssues"],
    warnings: [],
    infos: [],
    normalizedDraft: undefined,
    validationVersion: "bootstrap-validation-v1",
    statistics: {
      participants: { considered: 0, accepted: 0, dropped: 0 },
      facts: { considered: 0, accepted: 0, dropped: 0 },
      deadlines: { considered: 0, accepted: 0, dropped: 0 },
      evidence: { considered: 0, accepted: 0, dropped: 0 },
      contacts: { considered: 0, accepted: 0, dropped: 0 },
      issues: codes.length,
      warnings: 0,
      infos: 0,
    },
  };
}

export function makePlan(): MatterAggregatePlan {
  const provenance = { origin: "intelligent_intake", draftId: DRAFT_ID, ruleId: "r1", span: null } as const;
  return {
    matter: {
      titleHe: "רונית לוי",
      procedureType: "pregnancy_dismissal",
      topicHe: "pregnancy_dismissal",
      legalDomain: "labor",
      confidentiality: "client_confidential",
      aiPolicy: "allowed_with_review",
      forumHe: "בית הדין",
      statusIntent: "open",
    },
    members: [{ memberKey: "member_x", slot: "owner", matterRole: null, canReview: true, canApprove: true, bindProfileTo: "confirming_actor" }],
    participants: [{ participantKey: "participant_a", role: "client", displayNameHe: "רונית לוי", contactKey: "contact_a", sourceItemId: "c1", provenance }],
    contacts: [{ contactKey: "contact_a", classification: "create_new", contactId: null, kind: "person", nameHe: "רונית לוי", sourceItemIds: ["c1"] }],
    facts: [{ factPlanKey: "fact_a", factKey: "employment_duration", statementHe: "עבדה שלוש שנים", status: "client_alleged", sourceItemId: "f1", provenance }],
    deadlines: [{ deadlineKey: "deadline_a", labelHe: "הגשה", dueAt: "2026-08-01T00:00:00+03:00", source: "statute", confidence: "known", timezone: "Asia/Jerusalem", strict: true, basisHe: "סעיף", sourceItemId: "d1" }],
    evidence: [{ evidenceKey: "evidence_a", labelHe: "תלוש", mandatory: true, status: "required", sourceItemId: "e1" }],
    audit: {
      auditKey: "audit_a",
      sourceDraftId: DRAFT_ID,
      sourceDraftVersionToken: VERSION_TOKEN,
      sourceDraftSchemaVersion: SCHEMA_VERSION,
      validationVersion: "bootstrap-validation-v1",
      sourceInputHash: "e".repeat(64),
      validatedAt: "2026-07-24T10:00:00.000Z",
      counts: { members: 1, participants: 1, contacts: 1, facts: 1, deadlines: 1, evidence: 1 },
    },
    metadata: {
      aggregateVersion: 1,
      plannerVersion: "matter-aggregate-planner-v1",
      validationVersion: "bootstrap-validation-v1",
      sourceDraftVersion: VERSION_TOKEN,
      sourceInputHash: "e".repeat(64),
      planHash: PLAN_HASH,
      planningDurationMs: null,
      statistics: { members: 1, participants: 1, contacts: 1, facts: 1, deadlines: 1, evidence: 1 },
    },
  } as unknown as MatterAggregatePlan;
}

export function makeRpcGateway(
  outcome: BootstrapRpcOutcome,
): { gateway: BootstrapMatterRpcGateway; calls: BootstrapRpcRequest[] } {
  const calls: BootstrapRpcRequest[] = [];
  const gateway: BootstrapMatterRpcGateway = {
    async bootstrap(request) {
      calls.push(request);
      return outcome;
    },
  };
  return { gateway, calls };
}
