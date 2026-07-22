/**
 * Integration CONTRACTS for Slice 0.8.4 (Capability 0.8, Slice 0.8.3).
 *
 * Interfaces ONLY — no Supabase adapters, no orchestration, no DB access. The
 * next slice implements repositories that load normalized policy facts under
 * RLS and an application service that ties (actor, action, resourceRef) → facts
 * → pure decision. Declaring the seam now lets routes/use-cases depend on it.
 */
import type { ActorContext } from "../actor-context.ts";
import type { ResourceAction, ResourceType } from "./actions.ts";
import type { ResourceAuthorizationDecision } from "./decision.ts";
import type {
  AuditPolicyFacts,
  ContactPolicyFacts,
  DocumentPolicyFacts,
  EvidencePolicyFacts,
  IntakeDraftPolicyFacts,
  MatterPolicyFacts,
} from "./contracts.ts";

/** A reference to the specific resource an authorization request targets. */
export interface ResourceReference {
  readonly type: ResourceType;
  readonly id: string;
  readonly organizationId: string;
  /** For matter-scoped children (document/evidence/audit), the parent matter. */
  readonly matterId?: string;
}

export interface MatterAuthorizationFactsRepository {
  loadMatterPolicyFacts(actor: ActorContext, matterId: string): Promise<MatterPolicyFacts | null>;
}
export interface IntakeAuthorizationFactsRepository {
  loadIntakeDraftPolicyFacts(actor: ActorContext, draftId: string): Promise<IntakeDraftPolicyFacts | null>;
}
export interface ContactAuthorizationFactsRepository {
  loadContactPolicyFacts(actor: ActorContext, contactId: string): Promise<ContactPolicyFacts | null>;
}
export interface DocumentAuthorizationFactsRepository {
  // Matter-bound: a document id is never trusted without its parent matter id.
  loadDocumentPolicyFacts(actor: ActorContext, matterId: string, documentId: string): Promise<DocumentPolicyFacts | null>;
}
export interface EvidenceAuthorizationFactsRepository {
  // Matter-bound: evidence is authorized only within its parent matter.
  loadEvidencePolicyFacts(actor: ActorContext, matterId: string, evidenceId: string): Promise<EvidencePolicyFacts | null>;
}
export interface AuditAuthorizationFactsRepository {
  // `classification` + optional `matterId` (audit has no matter_id column).
  loadAuditPolicyFacts(
    actor: ActorContext,
    query: { classification: "organization" | "matter" | "security"; matterId?: string },
  ): Promise<AuditPolicyFacts | null>;
}

/**
 * FUTURE (Slice 0.8.4) application helper: load the resource's facts under RLS
 * and evaluate the matching pure policy. Contract only — unimplemented here.
 * An implementation MUST fail closed when facts cannot be loaded (null → deny).
 */
export interface ResourceAuthorizationService {
  authorizeResourceRequest(
    actor: ActorContext,
    action: ResourceAction,
    resourceRef: ResourceReference,
  ): Promise<ResourceAuthorizationDecision>;
}
