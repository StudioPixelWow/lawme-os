/**
 * Capability vocabulary (Capability 0.8, Slice 0.8.1).
 *
 * ONE canonical vocabulary of organization-level capabilities. A capability
 * answers "may this actor perform this CATEGORY of action?" — it is NOT, by
 * itself, permission to act on a specific Matter/Draft/Document. Resource
 * authorization (does this actor may act on THIS object) is a separate layer,
 * introduced later; capabilities whose `resourceAuthorizationRequired` is true
 * must be combined with a resource check before an operation proceeds.
 *
 * Deny-by-default: possession of a capability is necessary, never sufficient on
 * its own for a resource-scoped action.
 */

/** Where a capability's authorization is evaluated. */
export type CapabilityScope =
  | "organization_scoped" // org membership + capability is sufficient (no per-object check)
  | "resource_scoped" // decided purely per object (rare; kept for completeness)
  | "organization_and_resource"; // capability gates the category; a resource check also required

/** The owning module of a capability (for boundaries + documentation). */
export type CapabilityModule =
  | "organization"
  | "contacts"
  | "matters"
  | "intake"
  | "documents"
  | "evidence"
  | "workflow"
  | "audit"
  | "ai"
  | "administration";

/** The canonical capability strings. Additive-only; never renamed in place. */
export type Capability =
  | "organization.read"
  | "organization.manage_members"
  | "contacts.read"
  | "contacts.create"
  | "contacts.link"
  | "contacts.update"
  | "matters.read"
  | "matters.create"
  | "matters.update"
  | "matters.assign_owner"
  | "matters.assign_members"
  | "intake.create"
  | "intake.read"
  | "intake.review"
  | "intake.confirm"
  | "intake.assign_reviewers"
  | "intake.assign_owner"
  | "documents.read"
  | "documents.upload"
  | "documents.update"
  | "documents.review"
  | "documents.approve"
  | "evidence.read"
  | "evidence.create_requirement"
  | "evidence.review"
  | "evidence.approve"
  | "workflow.read"
  | "workflow.transition"
  | "workflow.manage"
  | "audit.read"
  | "ai.use"
  | "ai.review_high_risk"
  | "administration.manage";

export interface CapabilityMeta {
  readonly capability: Capability;
  /** Short developer-facing description. */
  readonly description: string;
  readonly scope: CapabilityScope;
  readonly module: CapabilityModule;
  /** True when a per-object resource check is ALSO required before acting. */
  readonly resourceAuthorizationRequired: boolean;
}

/** Version of the capability vocabulary itself. */
export const CAPABILITY_VOCABULARY_VERSION = "capability-vocabulary-v1";

const ORG = "organization_scoped" as const;
const ORG_RES = "organization_and_resource" as const;

/** The canonical capability metadata. Keyed by Capability so the compiler
 *  enforces that every capability is described exactly once. */
export const CAPABILITIES: Readonly<Record<Capability, CapabilityMeta>> = {
  "organization.read": { capability: "organization.read", description: "Read organization profile/settings", scope: ORG, module: "organization", resourceAuthorizationRequired: false },
  "organization.manage_members": { capability: "organization.manage_members", description: "Invite/suspend organization members", scope: ORG, module: "organization", resourceAuthorizationRequired: false },

  "contacts.read": { capability: "contacts.read", description: "Read firm-level contacts", scope: ORG, module: "contacts", resourceAuthorizationRequired: false },
  "contacts.create": { capability: "contacts.create", description: "Create a firm-level contact", scope: ORG, module: "contacts", resourceAuthorizationRequired: false },
  "contacts.link": { capability: "contacts.link", description: "Link a contact as a matter participant", scope: ORG_RES, module: "contacts", resourceAuthorizationRequired: true },
  "contacts.update": { capability: "contacts.update", description: "Update a contact's identity fields", scope: ORG_RES, module: "contacts", resourceAuthorizationRequired: true },

  "matters.read": { capability: "matters.read", description: "Read a matter", scope: ORG_RES, module: "matters", resourceAuthorizationRequired: true },
  "matters.create": { capability: "matters.create", description: "Create a matter (category-level)", scope: ORG, module: "matters", resourceAuthorizationRequired: false },
  "matters.update": { capability: "matters.update", description: "Update a matter's working surface", scope: ORG_RES, module: "matters", resourceAuthorizationRequired: true },
  "matters.assign_owner": { capability: "matters.assign_owner", description: "Assign a matter's responsible owner", scope: ORG_RES, module: "matters", resourceAuthorizationRequired: true },
  "matters.assign_members": { capability: "matters.assign_members", description: "Assign matter members", scope: ORG_RES, module: "matters", resourceAuthorizationRequired: true },

  "intake.create": { capability: "intake.create", description: "Start an intake draft (category-level)", scope: ORG, module: "intake", resourceAuthorizationRequired: false },
  "intake.read": { capability: "intake.read", description: "Read an intake draft", scope: ORG_RES, module: "intake", resourceAuthorizationRequired: true },
  "intake.review": { capability: "intake.review", description: "Review/edit an intake draft's reviewable content", scope: ORG_RES, module: "intake", resourceAuthorizationRequired: true },
  "intake.confirm": { capability: "intake.confirm", description: "Confirm a draft into a Matter (legal authority)", scope: ORG_RES, module: "intake", resourceAuthorizationRequired: true },
  "intake.assign_reviewers": { capability: "intake.assign_reviewers", description: "Assign reviewers to an intake draft", scope: ORG_RES, module: "intake", resourceAuthorizationRequired: true },
  "intake.assign_owner": { capability: "intake.assign_owner", description: "Assign the owner of an intake draft", scope: ORG_RES, module: "intake", resourceAuthorizationRequired: true },

  "documents.read": { capability: "documents.read", description: "Read a matter document", scope: ORG_RES, module: "documents", resourceAuthorizationRequired: true },
  "documents.upload": { capability: "documents.upload", description: "Upload a matter document", scope: ORG_RES, module: "documents", resourceAuthorizationRequired: true },
  "documents.update": { capability: "documents.update", description: "Update document metadata", scope: ORG_RES, module: "documents", resourceAuthorizationRequired: true },
  "documents.review": { capability: "documents.review", description: "Review a document", scope: ORG_RES, module: "documents", resourceAuthorizationRequired: true },
  "documents.approve": { capability: "documents.approve", description: "Approve a document (legal authority)", scope: ORG_RES, module: "documents", resourceAuthorizationRequired: true },

  "evidence.read": { capability: "evidence.read", description: "Read matter evidence", scope: ORG_RES, module: "evidence", resourceAuthorizationRequired: true },
  "evidence.create_requirement": { capability: "evidence.create_requirement", description: "Create an evidence requirement", scope: ORG_RES, module: "evidence", resourceAuthorizationRequired: true },
  "evidence.review": { capability: "evidence.review", description: "Review evidence", scope: ORG_RES, module: "evidence", resourceAuthorizationRequired: true },
  "evidence.approve": { capability: "evidence.approve", description: "Approve evidence → may promote a fact (legal authority)", scope: ORG_RES, module: "evidence", resourceAuthorizationRequired: true },

  "workflow.read": { capability: "workflow.read", description: "Read a matter's workflow state", scope: ORG_RES, module: "workflow", resourceAuthorizationRequired: true },
  "workflow.transition": { capability: "workflow.transition", description: "Advance a matter's workflow", scope: ORG_RES, module: "workflow", resourceAuthorizationRequired: true },
  "workflow.manage": { capability: "workflow.manage", description: "Manage workflow definitions/overrides", scope: ORG_RES, module: "workflow", resourceAuthorizationRequired: true },

  // Audit is org-level and deliberately restricted (oversight roles only). No
  // per-object audit read yet, so it is organization_scoped, not resource.
  "audit.read": { capability: "audit.read", description: "Read the organization's audit trail (restricted)", scope: ORG, module: "audit", resourceAuthorizationRequired: false },

  // AI is independent from matter visibility; using AI on a resource still
  // respects that resource's ai_policy at the resource layer.
  "ai.use": { capability: "ai.use", description: "Use AI assistance (respecting resource ai_policy)", scope: ORG_RES, module: "ai", resourceAuthorizationRequired: true },
  "ai.review_high_risk": { capability: "ai.review_high_risk", description: "Review high-risk AI outputs (legal authority)", scope: ORG_RES, module: "ai", resourceAuthorizationRequired: true },

  "administration.manage": { capability: "administration.manage", description: "Firm administration (non-legal)", scope: ORG, module: "administration", resourceAuthorizationRequired: false },
};

/** All capability strings, deduplicated by construction (record keys). */
export const ALL_CAPABILITIES: readonly Capability[] = Object.keys(CAPABILITIES) as Capability[];

/** Runtime guard — is a string a known capability? */
export function isCapability(value: string): value is Capability {
  return Object.prototype.hasOwnProperty.call(CAPABILITIES, value);
}

/** True when acting on this capability ALSO requires a per-object resource check. */
export function requiresResourceAuthorization(capability: Capability): boolean {
  return CAPABILITIES[capability].resourceAuthorizationRequired;
}
