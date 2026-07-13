/**
 * Shared intelligence primitive — Confidentiality (Epic 4.1).
 * The confidentiality classification of a matter/artifact. Defined ONCE.
 * (Was duplicated as DinoConfidentiality and MatterClient.confidentiality with
 * byte-identical values.)
 */

export type Confidentiality = "internal" | "client_confidential" | "privileged";

/** Highest-sensitivity — legal professional privilege applies. */
export function isPrivileged(c: Confidentiality): boolean {
  return c === "privileged";
}
