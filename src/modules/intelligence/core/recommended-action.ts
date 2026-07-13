/**
 * Shared intelligence primitive — Recommended Action contract (Epic 4.1).
 * Neutral cross-domain shape of "something a human/role should do". Domain-
 * specific action LOGIC stays in the domain; only the shape is shared.
 */
import type { Severity } from "./severity.ts";
import type { Provenance } from "./provenance.ts";

export type ActionStatus = "proposed" | "accepted" | "in_progress" | "done" | "rejected" | "blocked";

export interface RecommendedAction {
  id: string;
  /** stable action type/code */
  type: string;
  titleHe: string;
  reasonHe: string;
  /** role or actor expected to own it (domain defines its own role vocabulary) */
  ownerRole: string;
  dueHint?: string | null;
  priority: Severity;
  /** ids of other actions this depends on */
  dependencies?: string[];
  requiresHumanApproval: boolean;
  relatedFindingIds?: string[];
  provenance?: Provenance | null;
  status?: ActionStatus;
}
