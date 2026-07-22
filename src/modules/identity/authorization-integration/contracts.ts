/**
 * Authorization-integration contracts (Capability 0.8, Slice 0.8.4).
 *
 * The discriminated `ResourceRequest` the orchestration service accepts, plus a
 * minimal, SAFE telemetry seam. No policy semantics live here — this is the shape
 * of "what is being requested" and "what is safe to record about the decision".
 */
import type {
  AuditAction,
  AuditClassification,
  ContactAction,
  DocumentAction,
  EvidenceAction,
  IntakeDraftAction,
  MatterAction,
  ResourceAction,
  ResourceAuthorizationCode,
  ResourceType,
} from "../authorization-policy/index.ts";

/** A fully-specified authorization request. Discriminated by `resourceType`. */
export type ResourceRequest =
  | { readonly resourceType: "matter"; readonly action: MatterAction; readonly matterIdOrSlug: string }
  | { readonly resourceType: "intake_draft"; readonly action: IntakeDraftAction; readonly draftId: string }
  | { readonly resourceType: "document"; readonly action: DocumentAction; readonly matterId: string; readonly documentId: string }
  | {
      readonly resourceType: "contact";
      readonly action: ContactAction;
      readonly contactId?: string;
      /** For `contact.link_to_matter`: the target matter to authorize alongside. */
      readonly targetMatter?: { readonly matterIdOrSlug: string; readonly action: MatterAction };
    }
  | { readonly resourceType: "evidence"; readonly action: EvidenceAction; readonly matterId: string; readonly evidenceId: string }
  | { readonly resourceType: "audit"; readonly action: AuditAction; readonly classification: AuditClassification; readonly matterId?: string };

/** SAFE authorization telemetry — identifiers + decision only, never content.
 *  Explicitly excludes matter titles, client names, reviewer ids, document
 *  metadata, confidential text, and raw DB errors. */
export interface AuthorizationTelemetryEvent {
  readonly correlationId: string;
  readonly organizationId: string;
  readonly actorProfileId: string;
  readonly resourceType: ResourceType;
  readonly action: ResourceAction;
  readonly decisionCode: ResourceAuthorizationCode;
  readonly policyVersion: string;
  /** Whether normalized facts were obtained ("loaded") or absent ("absent"). */
  readonly factsStage: "loaded" | "absent";
  readonly allowed: boolean;
}

export interface AuthorizationTelemetry {
  record(event: AuthorizationTelemetryEvent): void;
}

/** Default: record nothing. */
export const noopAuthorizationTelemetry: AuthorizationTelemetry = { record() {} };

/** A safe structured logger (single line of allow-listed fields). Never logs
 *  titles, names, confidential text, reviewer ids, or DB errors. */
export const consoleAuthorizationTelemetry: AuthorizationTelemetry = {
  record(event: AuthorizationTelemetryEvent): void {
    console.log(JSON.stringify({ tag: "authz.decision", ...event }));
  },
};
