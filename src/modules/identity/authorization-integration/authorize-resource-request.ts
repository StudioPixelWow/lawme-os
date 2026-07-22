/**
 * Resource authorization ORCHESTRATION (Capability 0.8, Slice 0.8.4).
 *
 * The canonical runtime path: select the correct fact loader, load normalized
 * facts under RLS, treat null as a safe deny (rendered as "not available"),
 * invoke the ONE canonical pure policy, and record safe telemetry. It contains
 * NO policy branches (no role/owner/membership/confidentiality logic) — every
 * semantic decision comes from the Slice 0.8.3 policy engine.
 *
 * Null facts (absent / cross-tenant / RLS-hidden) are represented as
 * RESOURCE_TENANT_MISMATCH, which the error layer renders as the uniform
 * RESOURCE_NOT_AVAILABLE — indistinguishable from a resource in another tenant.
 */
import type { AuthDb } from "../infrastructure/supabase-auth-client.ts";
import type { ActorContext } from "../actor-context.ts";
import {
  authorizeAudit,
  authorizeContact,
  authorizeDocument,
  authorizeEvidence,
  authorizeIntakeDraft,
  authorizeMatter,
  type ResourceAction,
  type ResourceAuthorizationDecision,
  type ResourceType,
} from "../authorization-policy/index.ts";
import { denied } from "../authorization-policy/decision.ts";
import { createMatterPolicyFactsRepository } from "../infrastructure/matter-policy-facts-repository.ts";
import { createIntakeDraftPolicyFactsRepository } from "../infrastructure/intake-policy-facts-repository.ts";
import { createDocumentPolicyFactsRepository } from "../infrastructure/document-policy-facts-repository.ts";
import { createContactPolicyFactsRepository } from "../infrastructure/contact-policy-facts-repository.ts";
import { createEvidencePolicyFactsRepository } from "../infrastructure/evidence-policy-facts-repository.ts";
import { createAuditPolicyFactsRepository } from "../infrastructure/audit-policy-facts-repository.ts";
import { noopAuthorizationTelemetry, type AuthorizationTelemetry, type ResourceRequest } from "./contracts.ts";

export interface ResourceAuthorizationService {
  authorizeResourceRequest(actor: ActorContext, request: ResourceRequest): Promise<ResourceAuthorizationDecision>;
}

/** Build the orchestration service over an authenticated (RLS) client. */
export function createResourceAuthorizationService(
  db: AuthDb,
  telemetry: AuthorizationTelemetry = noopAuthorizationTelemetry,
): ResourceAuthorizationService {
  const matters = createMatterPolicyFactsRepository(db);
  const drafts = createIntakeDraftPolicyFactsRepository(db);
  const documents = createDocumentPolicyFactsRepository(db);
  const contacts = createContactPolicyFactsRepository(db);
  const evidence = createEvidencePolicyFactsRepository(db);
  const audit = createAuditPolicyFactsRepository(db);

  function emit(actor: ActorContext, decision: ResourceAuthorizationDecision, factsStage: "loaded" | "absent"): ResourceAuthorizationDecision {
    telemetry.record({
      correlationId: decision.correlationId,
      organizationId: actor.organization.id,
      actorProfileId: actor.actor.profileId,
      resourceType: decision.resourceType,
      action: decision.action,
      decisionCode: decision.code,
      policyVersion: decision.policyVersion,
      factsStage,
      allowed: decision.allowed,
    });
    return decision;
  }

  function unavailable(action: ResourceAction, resourceType: ResourceType, correlationId: string): ResourceAuthorizationDecision {
    // absent/cross-tenant/RLS-hidden → tenant-mismatch → uniform not-available
    return denied("RESOURCE_TENANT_MISMATCH", action, resourceType, correlationId);
  }

  return {
    async authorizeResourceRequest(actor: ActorContext, request: ResourceRequest): Promise<ResourceAuthorizationDecision> {
      const cid = actor.request.correlationId;

      switch (request.resourceType) {
        case "matter": {
          const facts = await matters.loadMatterPolicyFacts(actor, request.matterIdOrSlug);
          if (!facts) return emit(actor, unavailable(request.action, "matter", cid), "absent");
          return emit(actor, authorizeMatter(actor, request.action, facts), "loaded");
        }
        case "intake_draft": {
          const facts = await drafts.loadIntakeDraftPolicyFacts(actor, request.draftId);
          if (!facts) return emit(actor, unavailable(request.action, "intake_draft", cid), "absent");
          return emit(actor, authorizeIntakeDraft(actor, request.action, facts), "loaded");
        }
        case "document": {
          const facts = await documents.loadDocumentPolicyFacts(actor, request.matterId, request.documentId);
          if (!facts) return emit(actor, unavailable(request.action, "document", cid), "absent");
          return emit(actor, authorizeDocument(actor, request.action, facts), "loaded");
        }
        case "evidence": {
          const facts = await evidence.loadEvidencePolicyFacts(actor, request.matterId, request.evidenceId);
          if (!facts) return emit(actor, unavailable(request.action, "evidence", cid), "absent");
          return emit(actor, authorizeEvidence(actor, request.action, facts), "loaded");
        }
        case "audit": {
          const facts = await audit.loadAuditPolicyFacts(actor, { classification: request.classification, matterId: request.matterId });
          if (!facts) return emit(actor, unavailable(request.action, "audit", cid), "absent");
          return emit(actor, authorizeAudit(actor, request.action, facts), "loaded");
        }
        case "contact": {
          if (request.action === "contact.create") {
            // organization-scoped — no Contact object is loaded (no fake id).
            return emit(actor, authorizeContact(actor, "contact.create", { organizationId: actor.organization.id }), "loaded");
          }
          const contactFacts = request.contactId ? await contacts.loadContactPolicyFacts(actor, request.contactId) : null;
          if (!contactFacts) return emit(actor, unavailable(request.action, "contact", cid), "absent");

          if (request.action === "contact.link_to_matter") {
            // Compose the target-Matter decision; the Contact policy never
            // recomputes matter access from partial facts.
            let related: ResourceAuthorizationDecision | undefined;
            if (request.targetMatter) {
              const mf = await matters.loadMatterPolicyFacts(actor, request.targetMatter.matterIdOrSlug);
              related = mf
                ? authorizeMatter(actor, request.targetMatter.action, mf)
                : unavailable(request.targetMatter.action, "matter", cid);
            }
            return emit(actor, authorizeContact(actor, "contact.link_to_matter", contactFacts, related), "loaded");
          }
          return emit(actor, authorizeContact(actor, request.action, contactFacts), "loaded");
        }
      }
    },
  };
}
