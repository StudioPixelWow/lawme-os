/**
 * Resource action vocabulary (Capability 0.8, Slice 0.8.3).
 *
 * An ACTION is "the specific operation being attempted on a specific resource"
 * (e.g. `matter.read`). It is deliberately distinct from a CAPABILITY (the
 * org-level category permission, e.g. `matters.read`) and from a RESOURCE POLICY
 * (the per-object rules that combine capability + membership + confidentiality).
 *
 *   action      → what the caller wants to do to THIS object
 *   capability  → may the actor do this CATEGORY of thing at all (role bundle)
 *   resource policy → given action + capability + object facts, allow or deny
 *
 * Action strings intentionally use the SINGULAR resource noun (`matter.read`) so
 * they never collide with the plural capability strings (`matters.read`).
 */

export type MatterAction =
  | "matter.read"
  | "matter.update"
  | "matter.assign_owner"
  | "matter.assign_members"
  | "matter.archive"
  | "matter.view_privileged";

export type IntakeDraftAction =
  | "intake.read"
  | "intake.edit"
  | "intake.review"
  | "intake.assign_reviewers"
  | "intake.confirm"
  | "intake.reject";

export type ContactAction =
  | "contact.read"
  | "contact.create"
  | "contact.update"
  | "contact.link_to_matter";

export type DocumentAction =
  | "document.read"
  | "document.upload"
  | "document.update"
  | "document.review"
  | "document.approve"
  | "document.preview";

export type EvidenceAction =
  | "evidence.read"
  | "evidence.create_requirement"
  | "evidence.review"
  | "evidence.approve";

export type AuditAction = "audit.read";

export type ResourceAction =
  | MatterAction
  | IntakeDraftAction
  | ContactAction
  | DocumentAction
  | EvidenceAction
  | AuditAction;

/** The resource families the policy engine reasons about. */
export type ResourceType =
  | "matter"
  | "intake_draft"
  | "contact"
  | "document"
  | "evidence"
  | "audit";
