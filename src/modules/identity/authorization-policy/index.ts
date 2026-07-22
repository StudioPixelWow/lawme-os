/**
 * Public API of the Resource Authorization Policy Engine (Capability 0.8,
 * Slice 0.8.3). Pure, route-independent, repository-independent.
 *
 * Capability authorization ("may this actor do this category of thing?") lives
 * in the identity barrel; RESOURCE authorization ("may this actor act on THIS
 * object?") lives here. The two are deliberately separate layers.
 */

// Actions + resource types
export type {
  MatterAction,
  IntakeDraftAction,
  ContactAction,
  DocumentAction,
  EvidenceAction,
  AuditAction,
  ResourceAction,
  ResourceType,
} from "./actions.ts";

// Fact contracts + confidentiality/status vocabularies
export type {
  AuthorizationActor,
  MatterConfidentiality,
  DocumentConfidentiality,
  DocumentApprovalState,
  IntakeDraftPolicyStatus,
  AuditClassification,
  MatterMembershipFacts,
  MatterPolicyFacts,
  IntakeDraftPolicyFacts,
  ContactPolicyFacts,
  DocumentPolicyFacts,
  EvidencePolicyFacts,
  AuditPolicyFacts,
} from "./contracts.ts";
export {
  MATTER_CONFIDENTIALITY_VALUES,
  DOCUMENT_CONFIDENTIALITY_VALUES,
  INTAKE_DRAFT_STATUS_VALUES,
  AUDIT_CLASSIFICATION_VALUES,
  isMatterConfidentiality,
  isDocumentConfidentiality,
  isIntakeDraftStatus,
  isAuditClassification,
} from "./contracts.ts";

// Decision contract + reason codes + version
export type {
  ResourceAuthorizationDecision,
  ResourceAuthorizationCode,
  AuthorizationRequirement,
  AuthorizationRequirementKind,
} from "./decision.ts";
export { RESOURCE_AUTHORIZATION_POLICY_VERSION } from "./decision.ts";

// The six pure policies
export { authorizeMatter } from "./matter-policy.ts";
export { authorizeIntakeDraft } from "./intake-policy.ts";
export { authorizeContact } from "./contact-policy.ts";
export { authorizeDocument } from "./document-policy.ts";
export { authorizeEvidence } from "./evidence-policy.ts";
export { authorizeAudit } from "./audit-policy.ts";

// Integration seam for Slice 0.8.4 (interfaces only)
export type {
  ResourceReference,
  ResourceAuthorizationService,
  MatterAuthorizationFactsRepository,
  IntakeAuthorizationFactsRepository,
  ContactAuthorizationFactsRepository,
  DocumentAuthorizationFactsRepository,
  EvidenceAuthorizationFactsRepository,
  AuditAuthorizationFactsRepository,
} from "./integration.ts";
