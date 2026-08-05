/**
 * Scoring (0..100) + final triage verdict. A source whose legal reuse is
 * prohibited/unknown or whose access is blocked can NEVER be OPEN/ready — the
 * verdict is gated by legality and access regardless of a high numeric score.
 */
import type {
  AuditFindings, SourceScores, SourceVerdict, LegalReuseStatus, TechnicalAccessStatus,
} from "./types.ts";

const clamp = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

export interface CoverageInputs {
  estimatedDocuments: number | null;
  yearSpan: number | null;
  courtCount: number | null;
  topicCount: number | null;
  updatesPerMonth: number | null;
}

export function coverageScore(c: CoverageInputs): number {
  let s = 0;
  if (c.estimatedDocuments !== null) s += Math.min(35, Math.log10(Math.max(1, c.estimatedDocuments)) * 7);
  if (c.yearSpan !== null) s += Math.min(25, c.yearSpan * 1.5);
  if (c.courtCount !== null) s += Math.min(20, c.courtCount * 4);
  if (c.topicCount !== null) s += Math.min(10, c.topicCount);
  if (c.updatesPerMonth !== null) s += Math.min(10, c.updatesPerMonth);
  return clamp(s);
}

export function accessScore(f: AuditFindings): number {
  let s = 0;
  if (f.api.hasApi) s += 30;
  if (f.feed.hasRss || f.feed.hasAtom) s += 10;
  if (f.sitemap.found) s += 15;
  if (f.search.hasPublicSearch) s += 10;
  if (f.reachable && !f.requiresLogin) s += 15;
  if (!f.requiresCaptcha) s += 10;
  if (f.technicalAccessStatus === "open") s += 10;
  else if (f.technicalAccessStatus === "partially_open" || f.technicalAccessStatus === "rate_limited") s += 5;
  if (f.technicalAccessStatus === "waf_blocked" || f.technicalAccessStatus === "robots_disallowed") s = Math.min(s, 15);
  return clamp(s);
}

export interface MetadataAvailability {
  caseNumber: boolean; date: boolean; court: boolean; judge: boolean;
  parties: boolean; proceedingType: boolean; stableId: boolean;
}

export function metadataQualityScore(m: MetadataAvailability): number {
  const fields = [m.caseNumber, m.date, m.court, m.judge, m.parties, m.proceedingType, m.stableId];
  const present = fields.filter(Boolean).length;
  return clamp((present / fields.length) * 100);
}

export function legalClarityScore(f: AuditFindings): number {
  const s = f.legalReuseStatus;
  if (s === "open_license" || s === "public_reuse_allowed") return 100;
  if (s === "commercial_permission_required" || s === "written_permission_required") return 55;
  if (s === "personal_use_only") return 30;
  if (s === "automated_access_prohibited" || s === "restricted") return 10;
  return 0; // unknown
}

const WEIGHTS = { coverage: 0.30, access: 0.25, metadata: 0.20, document: 0.15, legal: 0.10 };

export function priorityScore(s: Omit<SourceScores, "priorityScore">): number {
  return clamp(
    s.coverageScore * WEIGHTS.coverage +
    s.accessScore * WEIGHTS.access +
    s.metadataQualityScore * WEIGHTS.metadata +
    s.documentQualityScore * WEIGHTS.document +
    s.legalClarityScore * WEIGHTS.legal,
  );
}

export function computeScores(parts: {
  coverage: number; access: number; metadata: number; document: number; legal: number;
}): SourceScores {
  const base = {
    coverageScore: clamp(parts.coverage),
    accessScore: clamp(parts.access),
    metadataQualityScore: clamp(parts.metadata),
    documentQualityScore: clamp(parts.document),
    legalClarityScore: clamp(parts.legal),
  };
  return { ...base, priorityScore: priorityScore(base) };
}

const LAWFUL_REUSE: LegalReuseStatus[] = ["open_license", "public_reuse_allowed"];
const ASK_REUSE: LegalReuseStatus[] = ["commercial_permission_required", "written_permission_required"];
const BLOCKED_TECH: TechnicalAccessStatus[] = ["waf_blocked", "robots_disallowed", "authentication_required", "unavailable", "captcha"];

/**
 * Final triage bucket. Legality + access GATE the verdict:
 *   BLOCKED — tech blocked / automation prohibited.
 *   ASK     — access ok but reuse needs permission.
 *   REVIEW  — reuse unknown / audit incomplete → manual legal review.
 *   OPEN    — audited, accessible, lawful reuse.
 */
export function classifyVerdict(f: AuditFindings, hasDocumentedPermission: boolean): SourceVerdict {
  if (BLOCKED_TECH.includes(f.technicalAccessStatus) || f.requiresCaptcha || f.requiresLogin) return "BLOCKED";
  if (f.legalReuseStatus === "automated_access_prohibited" || f.legalReuseStatus === "restricted") return "BLOCKED";
  if (f.auditStatus !== "completed") return "REVIEW";
  if (LAWFUL_REUSE.includes(f.legalReuseStatus)) return "OPEN";
  if (ASK_REUSE.includes(f.legalReuseStatus)) return hasDocumentedPermission ? "OPEN" : "ASK";
  if (f.legalReuseStatus === "personal_use_only") return "ASK";
  return "REVIEW"; // unknown reuse
}
