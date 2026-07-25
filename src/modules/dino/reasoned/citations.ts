/**
 * Citation experience + claim-level traceability (Slice 4.1.0). PURE.
 * Builds professional CitationViews from the verified research sources (never
 * fabricating missing metadata), splits verified from discovery-only, and maps
 * every legal claim to its supporting VERIFIED citations — or marks it withheld.
 */
import type { CanonicalSource } from "../../legal-research/types.ts";
import type { LegalOpinion } from "../../legal-reasoning/types.ts";
import type { CitationView, SupportedClaim, ClaimKind } from "./types.ts";

const NO_PINPOINT = "לא קיימת כרגע הפניה נקודתית מאומתת.";

function authorityLabel(bindingClass: string): string {
  return bindingClass === "binding" ? "מחייב" : "מנחה";
}
function verificationLabel(v: string): string {
  return v === "verified" ? "מאומת" : "טעון אימות";
}
function isOfficial(url: string | null): boolean {
  return !!url && (url.includes("knesset.gov.il") || url.includes("court.gov.il") || url.includes("gov.il"));
}

export function toCitationView(s: CanonicalSource): CitationView {
  const kind = s.sourceKind === "legislation" ? "legislation" : "case_law";
  let citationHe = s.citationHe;
  if (kind === "case_law") {
    const year = s.dateISO ? s.dateISO.slice(0, 4) : null;
    citationHe = `${s.court ? s.court + " · " : ""}${s.citationHe}${year ? ` (${year})` : ""}`;
  }
  const hasPinpoint = kind === "legislation" && !!s.sectionHe && s.verification === "verified" && !!s.url;
  return {
    recordId: s.recordId,
    kind,
    citationHe,
    sectionHe: s.sectionHe,
    verification: s.verification,
    verificationLabelHe: verificationLabel(s.verification),
    authorityLabelHe: authorityLabel(s.bindingClass),
    officialSource: isOfficial(s.url),
    url: s.url,
    pinpointHe: hasPinpoint ? s.sectionHe : null,
    pinpointStatusHe: hasPinpoint ? `הפניה נקודתית: ${s.sectionHe}` : NO_PINPOINT,
    usableForClaim: s.usableForClaim,
  };
}

/** Verified (may support a conclusion) vs discovery-only (must never). */
export function splitCitations(sources: readonly CanonicalSource[]): { verified: CitationView[]; discoveryOnly: CitationView[] } {
  const verified: CitationView[] = [];
  const discoveryOnly: CitationView[] = [];
  for (const s of sources) {
    const view = toCitationView(s);
    if (s.verification === "verified" && s.usableForClaim) verified.push(view);
    else discoveryOnly.push(view);
  }
  return { verified, discoveryOnly };
}

/** The set of recordIds that may support a legal conclusion (verified + usable). */
export function verifiedIdSet(sources: readonly CanonicalSource[]): Set<string> {
  return new Set(sources.filter((s) => s.verification === "verified" && s.usableForClaim).map((s) => s.recordId));
}

/** Claim-level traceability: every legal proposition → verified support, or withheld. */
export function buildClaims(opinion: LegalOpinion, verifiedIds: Set<string>): SupportedClaim[] {
  const claims: SupportedClaim[] = [];
  let n = 0;
  const add = (textHe: string, kind: ClaimKind, ids: readonly string[]) => {
    const supportingCitationIds = ids.filter((id) => verifiedIds.has(id));
    claims.push({ claimId: `c${++n}`, textHe, kind, supportingCitationIds, supported: kind === "established_law" && supportingCitationIds.length > 0 });
  };

  // The conclusion.
  const concl = opinion.preliminaryConclusion;
  const conclKind: ClaimKind = concl.direction === "supports_position" ? "established_law"
    : concl.direction === "cannot_conclude" ? "withheld" : "analysis";
  add(concl.statementHe, conclKind, concl.supportingAuthorityIds);

  // Each element of the cause of action.
  for (const el of opinion.elements) {
    const supportedByVerified = el.authorityIds.some((id) => verifiedIds.has(id));
    const kind: ClaimKind = el.status === "missing" ? "withheld"
      : el.status === "contested" ? "unresolved"
        : supportedByVerified ? "established_law" : "inference";
    add(`${el.labelHe}: ${el.noteHe}`, kind, el.authorityIds);
  }

  // Explicitly unsupported statements are withheld, never presented as law.
  for (const u of opinion.unsupportedStatements) add(`${u.statementHe} — ${u.reasonHe}`, "withheld", []);

  return claims;
}
