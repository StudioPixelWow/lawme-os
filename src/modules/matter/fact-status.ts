/**
 * Matter fact-status establishment predicate (Platform 0.7.1).
 *
 * ONE canonical, explicit test for "does this Fact count as an ESTABLISHED
 * fact for a gate that requires established facts?" — used by the state machine
 * and the intelligence engines so the Evidence → Fact confirmation boundary is
 * expressed in exactly one place.
 *
 * The rule of LawME: an allegation is never a fact. Only the two established
 * epistemic states satisfy an established-fact gate:
 *   - `confirmed`         — verified/established.
 *   - `document_derived`  — derived from a document with provenance; the domain
 *                           treats this as an established, provenance-backed
 *                           fact (see intelligence/core `FACT_STATUSES`, and the
 *                           intake boundary which REFUSES to produce either of
 *                           these two states — only Evidence approval may).
 *
 * NEVER established: `client_alleged`, `opposing_alleged`, `disputed`, `unknown`.
 * Do NOT infer establishment by exclusion (e.g. `status !== "unknown"`).
 */
import type { FactStatus } from "./types.ts";

/** The two — and only two — established epistemic states. */
export const ESTABLISHED_FACT_STATUSES: ReadonlySet<FactStatus> = new Set<FactStatus>([
  "confirmed",
  "document_derived",
]);

/** True only for an established fact (confirmed | document_derived). */
export function isEstablishedFactStatus(status: FactStatus): boolean {
  return ESTABLISHED_FACT_STATUSES.has(status);
}
