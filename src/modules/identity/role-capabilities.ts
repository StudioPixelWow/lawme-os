/**
 * Organization role → capability map (Capability 0.8, Slice 0.8.1).
 *
 * The ONLY place role→capability defaults live. A role is a DEFAULT CAPABILITY
 * BUNDLE, never the final authorization decision:
 *   - a role grants organization-level capabilities only; resource authorization
 *     is a separate layer (see capabilities.ts `resourceAuthorizationRequired`);
 *   - `admin` is firm administration, NOT legal authority — it does not receive
 *     intake.confirm / evidence.approve / documents.approve / ai.review_high_risk
 *     and encodes no confidentiality bypass;
 *   - legal-authority capabilities (confirm/approve/high-risk-AI review) belong to
 *     `owner`/`partner` only;
 *   - `lawyer` (a review-capable role) does NOT automatically receive intake.confirm;
 *   - owner assignment (matters.assign_owner) is a distinct capability;
 *   - ai.use is independent of matter visibility (resource ai_policy still applies).
 *
 * Roles are the ACTUAL org-membership roles from the schema
 * (organization_memberships.role CHECK): owner | partner | admin | lawyer | paralegal.
 * These v1 bundles are deliberately conservative (deny-by-default); they are
 * refined as resource authorization lands. Custom per-actor grants are NOT in
 * this slice.
 */
import type { Capability } from "./capabilities.ts";

/** Actual organization_memberships.role values (schema CHECK). */
export type OrganizationRole = "owner" | "partner" | "admin" | "lawyer" | "paralegal";

/** Version of THIS role→capability map. Changes when a bundle changes. */
export const CAPABILITY_MAP_VERSION = "role-capabilities-v1";
/** Version of the authorization decision policy (resolver + helpers). */
export const AUTHORIZATION_POLICY_VERSION = "authorization-policy-v1";

const ORGANIZATION_ROLES: readonly OrganizationRole[] = ["owner", "partner", "admin", "lawyer", "paralegal"];

export function isOrganizationRole(value: string): value is OrganizationRole {
  return (ORGANIZATION_ROLES as readonly string[]).includes(value);
}

// Reusable capability groups (kept explicit for auditability).
const LEGAL_AUTHORITY: readonly Capability[] = [
  "intake.confirm", "documents.approve", "evidence.approve", "ai.review_high_risk",
];
const LAWYER_WORK: readonly Capability[] = [
  "organization.read",
  "contacts.read", "contacts.create", "contacts.link", "contacts.update",
  "matters.read", "matters.create", "matters.update",
  "intake.create", "intake.read", "intake.review",
  "documents.read", "documents.upload", "documents.update", "documents.review",
  "evidence.read", "evidence.create_requirement", "evidence.review",
  "workflow.read", "workflow.transition",
  "ai.use",
];
const PARTNER_EXTRA: readonly Capability[] = [
  "matters.assign_owner", "matters.assign_members",
  "intake.assign_reviewers", "intake.assign_owner",
  "workflow.manage", "audit.read",
];
const ADMIN_BUNDLE: readonly Capability[] = [
  "organization.read", "organization.manage_members", "administration.manage",
  "contacts.read", "contacts.create", "contacts.update",
  "matters.read", "matters.create", "matters.update", "matters.assign_owner", "matters.assign_members",
  "audit.read",
];
const PARALEGAL_BUNDLE: readonly Capability[] = [
  "organization.read",
  "contacts.read", "contacts.create",
  "matters.read",
  "intake.create", "intake.read",
  "documents.read", "documents.upload",
  "evidence.read",
  "workflow.read",
  "ai.use",
];

const PARTNER_BUNDLE: readonly Capability[] = [...LAWYER_WORK, ...PARTNER_EXTRA, ...LEGAL_AUTHORITY];
// owner = partner's legal authority + firm administration (the full org surface).
const OWNER_BUNDLE: readonly Capability[] = [
  ...PARTNER_BUNDLE,
  "organization.manage_members", "administration.manage",
];

/** The canonical role→capability map. Compiler enforces completeness. */
export const ROLE_CAPABILITIES: Readonly<Record<OrganizationRole, readonly Capability[]>> = {
  owner: OWNER_BUNDLE,
  partner: PARTNER_BUNDLE,
  admin: ADMIN_BUNDLE,
  lawyer: LAWYER_WORK,
  paralegal: PARALEGAL_BUNDLE,
};

/**
 * Effective capabilities for a role. Returns null for an UNKNOWN role so the
 * resolver can fail closed (never a partial or default grant).
 */
export function capabilitiesForRole(role: string): ReadonlySet<Capability> | null {
  if (!isOrganizationRole(role)) return null;
  return new Set<Capability>(ROLE_CAPABILITIES[role]);
}
