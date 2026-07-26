/**
 * Authority classification + ranking (Maximum Open Corpus, Phase 1).
 *
 * Exposes the founder's presentation authority taxonomy and a deterministic
 * rank so retrieval always knows each source's authority and ranks HIGHER
 * authority above lower. Breadth never merges sources: provenance and authority
 * stay attached to every record.
 */
import type { CanonicalSourceRecord, AuthorityTier, WorkstreamId } from "./types.ts";
import { sourceByKey } from "./registry.ts";

export type AuthorityClass =
  | "primary_authority"      // legislation (binding primary law)
  | "official_publication"   // gazette, memoranda, protocols
  | "court_decision"         // judgments (binding or persuasive)
  | "public_guidance"        // regulator guidance / official ministry publications
  | "professional_commentary"
  | "academic_source"
  | "secondary_source"
  | "firm_internal";

export const AUTHORITY_CLASS_LABEL_HE: Record<AuthorityClass, string> = {
  primary_authority: "אסמכתה ראשית",
  official_publication: "פרסום רשמי",
  court_decision: "פסיקה",
  public_guidance: "הנחיה רשמית",
  professional_commentary: "פרשנות מקצועית",
  academic_source: "מקור אקדמי",
  secondary_source: "מקור משני",
  firm_internal: "פנימי-משרד",
};

const COURT_WORKSTREAMS = new Set<WorkstreamId>([
  "D_supreme_court", "E_labour_court", "F_district_admin", "G_magistrates_tribunals",
]);

/** Derive the presentation authority class from the record + its source. */
export function authorityClassOf(r: CanonicalSourceRecord): AuthorityClass {
  const src = sourceByKey(r.sourceKey);
  const ws = src?.workstream;
  if (ws && COURT_WORKSTREAMS.has(ws)) return "court_decision";
  switch (r.authorityTier) {
    case "binding_primary": return "primary_authority";
    case "persuasive_primary": return "court_decision";
    case "official_regulatory":
      return ws === "I_legislative_history" ? "official_publication" : "public_guidance";
    case "academic": return "academic_source";
    case "professional_commentary": return "professional_commentary";
    case "licensed_editorial": return "secondary_source";
    case "secondary_explanation": return "secondary_source";
    case "discovery_material": return "secondary_source";
    case "firm_internal": return "firm_internal";
    default: return "secondary_source";
  }
}

/** Base rank per class (higher = more authority). */
const CLASS_RANK: Record<AuthorityClass, number> = {
  primary_authority: 100,
  official_publication: 80,
  court_decision: 75, // adjusted by binding/persuasive below
  public_guidance: 65,
  professional_commentary: 45,
  academic_source: 40,
  secondary_source: 30,
  firm_internal: 25,
};

/** Deterministic authority rank for a record. Binding court > persuasive. */
export function authorityRankOf(r: CanonicalSourceRecord): number {
  const cls = authorityClassOf(r);
  if (cls === "court_decision") {
    return r.authorityTier === "binding_primary" ? 90 : 70;
  }
  return CLASS_RANK[cls];
}

/** Sort a record list by authority, highest first (stable, non-mutating). */
export function rankByAuthority(
  records: readonly CanonicalSourceRecord[],
): readonly CanonicalSourceRecord[] {
  return [...records]
    .map((r, i) => ({ r, i, rank: authorityRankOf(r) }))
    .sort((a, b) => (b.rank - a.rank) || (a.i - b.i))
    .map((x) => x.r);
}

/** Distribution of records across authority classes (coverage reporting). */
export function authorityClassCounts(
  records: readonly CanonicalSourceRecord[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of records) {
    const c = authorityClassOf(r);
    out[c] = (out[c] ?? 0) + 1;
  }
  return out;
}

export type { AuthorityTier };
