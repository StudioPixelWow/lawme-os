/**
 * Doctrine coverage map (P1-S1 Phase 13). Honest, doctrine-based coverage.
 * Coverage is NEVER "complete" — the type does not allow it.
 */
import type {
  CoverageLevel,
  DoctrineCoverageRecord,
  DoctrineId,
} from "./types.ts";
import { deepFreeze } from "./deep-freeze.ts";

export function computeCoverageLevel(
  requiredProvisions: string[],
  presentVerifiedProvisions: string[],
): CoverageLevel {
  if (requiredProvisions.length === 0) return "insufficient";
  const present = new Set(presentVerifiedProvisions);
  const have = requiredProvisions.filter((p) => present.has(p)).length;
  const ratio = have / requiredProvisions.length;
  if (ratio >= 1) return "substantial"; // full required set present — still not "complete"
  if (ratio > 0) return "partial";
  return "insufficient";
}

export function buildDoctrineCoverage(input: {
  doctrineId: DoctrineId;
  requiredProvisions: string[];
  presentVerifiedProvisions: string[];
  requiredAuthorities: string[];
  presentVerifiedAuthorities: string[];
  permittedClaimHe: string;
  lastReviewed: string | null;
}): DoctrineCoverageRecord {
  const level = computeCoverageLevel(
    input.requiredProvisions,
    input.presentVerifiedProvisions,
  );
  const present = new Set(input.presentVerifiedProvisions);
  const gaps = input.requiredProvisions.filter((p) => !present.has(p));
  return deepFreeze({
    doctrineId: input.doctrineId,
    requiredProvisions: input.requiredProvisions,
    presentVerifiedProvisions: input.presentVerifiedProvisions,
    requiredAuthorities: input.requiredAuthorities,
    presentVerifiedAuthorities: input.presentVerifiedAuthorities,
    coverageLevel: level,
    gaps,
    permittedClaimHe: input.permittedClaimHe,
    lastReviewed: input.lastReviewed,
  });
}
