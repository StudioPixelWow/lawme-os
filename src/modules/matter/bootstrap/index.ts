/**
 * Capability 1 · Slice 1.0.1 — Bootstrap Validation Engine: public surface.
 *
 * The ONLY entry point other layers import. Exposes the pure engine, the
 * canonical contracts, the frozen issue/warning/info taxonomies, and the result
 * value. Deliberately exports NO persistence, NO planner (1.0.2), NO RPC.
 */

export { BOOTSTRAP_VALIDATION_VERSION } from "./contracts.ts";
export type {
  ContactKind,
  RawBootstrapDraft,
  ResolvedBootstrapReferenceFacts,
  ResolvedOrganizationFact,
  ResolvedMemberFact,
  ResolvedContactFact,
  BootstrapValidationContext,
  ValidatedBootstrapDraft,
  NormalizedMatterHeader,
  NormalizedParticipant,
  NormalizedFact,
  NormalizedDeadline,
  NormalizedEvidence,
  NormalizedMetadata,
  NormalizedProvenance,
  NormalizedSpan,
} from "./contracts.ts";

export {
  BOOTSTRAP_ISSUE_CODES,
  BOOTSTRAP_WARNING_CODES,
  BOOTSTRAP_INFO_CODES,
  isBootstrapIssueCode,
  isBootstrapWarningCode,
  isBootstrapInfoCode,
} from "./issues.ts";
export type {
  BootstrapIssueCode,
  BootstrapWarningCode,
  BootstrapInfoCode,
  BootstrapValidationIssue,
  BootstrapValidationWarning,
  BootstrapValidationInfo,
} from "./issues.ts";

export type { BootstrapValidationResult, ValidationStatistics, SectionStat } from "./validation-result.ts";

export { validateBootstrapDraft } from "./validate.ts";

// ── Matter Aggregate Planner (Slice 1.0.2) ──
export {
  MATTER_AGGREGATE_VERSION,
  MATTER_AGGREGATE_PLANNER_VERSION,
  SUPPORTED_VALIDATION_VERSIONS,
  AggregatePlanningError,
} from "./aggregate-contracts.ts";
export type {
  MatterAggregatePlan,
  PlannedMatter,
  PlannedMember,
  PlannedParticipant,
  PlannedContact,
  PlannedFact,
  PlannedDeadline,
  PlannedEvidence,
  PlannedAudit,
  AggregateCounts,
  AggregatePlanMetadata,
  ContactClassification,
} from "./aggregate-contracts.ts";
export { planMatterAggregate } from "./plan-matter-aggregate.ts";
