/**
 * Contact authorization policy (Capability 0.8, Slice 0.8.3).
 *
 * Contacts are organization-scoped identities (no `contacts.matter_id`; the link
 * lives on `matter_participants`). Reading requires `contacts.read` + same org.
 * Linking a Contact to a Matter ADDITIONALLY requires `contacts.link` AND an
 * already-authorized Matter decision (passed in) — the Contact policy never
 * recomputes Matter access from partial facts, and there is no cross-tenant link.
 */
import type { ContactAction } from "./actions.ts";
import type { AuthorizationActor, ContactPolicyFacts } from "./contracts.ts";
import {
  authorized,
  denied,
  type ResourceAuthorizationCode,
  type ResourceAuthorizationDecision,
} from "./decision.ts";
import { asUserActor, denyMissingCapability, denyNonUser, denyTenantMismatch, isNonEmptyString } from "./common.ts";

const RT = "contact" as const;

export function authorizeContact(
  actor: AuthorizationActor,
  action: ContactAction,
  facts: ContactPolicyFacts,
  relatedMatterDecision?: ResourceAuthorizationDecision,
): ResourceAuthorizationDecision {
  const nonUser = denyNonUser(actor, action, RT);
  if (nonUser) return nonUser;
  const user = asUserActor(actor)!;

  if (!isNonEmptyString(facts.organizationId)) {
    return denied("RESOURCE_INVALID_POLICY_FACTS", action, RT, user.request.correlationId);
  }
  const tenant = denyTenantMismatch(user, facts.organizationId, action, RT);
  if (tenant) return tenant;

  const cid = user.request.correlationId;
  // Every action except CREATE operates on an existing Contact object.
  const needsContactId = action !== "contact.create";
  if (needsContactId && !isNonEmptyString(facts.contactId)) {
    return denied("RESOURCE_INVALID_POLICY_FACTS", action, RT, cid);
  }

  switch (action) {
    case "contact.read": {
      const cap = denyMissingCapability(user, "contacts.read", action, RT);
      return cap ?? authorized(action, RT, cid);
    }
    case "contact.create": {
      // Organization-scoped: no Contact object exists yet (no fake id).
      const cap = denyMissingCapability(user, "contacts.create", action, RT);
      return cap ?? authorized(action, RT, cid);
    }
    case "contact.update": {
      const cap = denyMissingCapability(user, "contacts.update", action, RT);
      return cap ?? authorized(action, RT, cid);
    }
    case "contact.link_to_matter": {
      const cap = denyMissingCapability(user, "contacts.link", action, RT);
      if (cap) return cap;
      // The target Matter must ALREADY be authorized by the Matter policy and
      // passed in — never recomputed here from incomplete facts.
      if (!relatedMatterDecision) {
        return denied("RESOURCE_INVALID_POLICY_FACTS", action, RT, cid, [{ requirement: "matter_access_required" }]);
      }
      if (!relatedMatterDecision.allowed) {
        return denied(
          relatedMatterDecision.code as Exclude<ResourceAuthorizationCode, "RESOURCE_AUTHORIZED">,
          action,
          RT,
          cid,
          [{ requirement: "matter_access_required" }],
        );
      }
      return authorized(action, RT, cid);
    }
    default:
      return denied("RESOURCE_ACTION_UNSUPPORTED", action, RT, cid);
  }
}
