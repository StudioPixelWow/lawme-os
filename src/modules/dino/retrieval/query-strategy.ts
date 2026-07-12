/**
 * DinoQueryStrategyEngine (Epic 3A, Phase 9).
 * Controlled, auditable retrieval strategies per legal issue. Reuses the
 * reviewed expansion dictionary (research/expansion.ts) — every expansion
 * is visible, typed and risk-annotated. NO uncontrolled broad expansion.
 */
import { expandQuery } from "../../legal-knowledge/research/expansion.ts";
import { normalizeText } from "../../legal-knowledge/extraction/normalize-text.ts";
import type { IssueGraph, LegalIssue } from "../issues/types.ts";

export const QUERY_STRATEGY_VERSION = "query-strategy-1.0.0";

export type ExpansionType =
  | "exact_phrase"
  | "statute_name"
  | "section_number"
  | "synonym"
  | "common_language"
  | "abbreviation"
  | "procedural_term"
  | "fact_pattern"
  | "negative_authority"
  | "limiting_term";

export interface QueryExpansion {
  canonicalTerm: string;
  expansion: string;
  expansionType: ExpansionType;
  confidence: number;
  source: string;                 // which dictionary/rule produced it
  meaningDriftRisk: "none" | "low" | "medium";
}

export interface IssueQueryStrategy {
  issueId: string;
  primaryQuery: string;
  queryTerms: string[];
  expansions: QueryExpansion[];
  negativeAuthorityTerms: string[];
  exclusionTerms: string[];
}

export interface QueryStrategySet {
  strategies: IssueQueryStrategy[];
  engineVersion: string;
}

const ISSUE_TERMS: Record<string, { terms: string[]; negative: string[] }> = {
  protected_status: { terms: ["חוק עבודת נשים", "סעיף 9", "שישה חודשים", "התקופה המוגנת"], negative: ["אינה מוגנת", "לא הושלמו שישה חודשים"] },
  permit_requirement: { terms: ["היתר פיטורים", "משרד העבודה", "סעיף 9"], negative: ["ניתן היתר", "אישור הממונה"] },
  hearing_duty: { terms: ["חובת השימוע", "זימון לשימוע", "פגם דיוני", "תום לב"], negative: ["שימוע מאוחר ריפא", "אין חובת שימוע"] },
  discrimination: { terms: ["הפליה מחמת היריון", "חוק שוויון ההזדמנויות", "נטל ההוכחה"], negative: ["טעם ענייני לפיטורים"] },
  remedies: { terms: ["פיצוי", "אובדן השתכרות", "פיצוי ללא הוכחת נזק", "נזק לא ממוני"], negative: ["הפחתת פיצוי", "אשם תורם"] },
  entitlement: { terms: ["פיצויי פיטורים", "שנת עבודה", "חוק פיצויי פיטורים"], negative: ["שלילת פיצויים"] },
  constructive: { terms: ["התפטרות בדין מפוטר", "הרעה מוחשית", "סעיף 11(א)"], negative: ["לא ניתנה הזדמנות לתקן"] },
  duty_scope: { terms: ["חובת השימוע", "רכיבי השימוע", "זימון מראש"], negative: ["חריגים לחובת השימוע"] },
  breach_remedy: { terms: ["פיצוי בגין פגם בשימוע", "סעד עצמאי"], negative: ["פיצוי נבלע"] },
  general: { terms: [], negative: [] },
};

export function buildQueryStrategies(question: string, issueGraph: IssueGraph): QueryStrategySet {
  const normalized = normalizeText(question);
  const base = expandQuery(normalized);

  const strategies = issueGraph.issues.map((issue: LegalIssue) => {
    const key = issue.id.split("-").at(-1) ?? "general";
    const custom = ISSUE_TERMS[key] ?? ISSUE_TERMS.general;

    const expansions: QueryExpansion[] = [
      ...base.expansions.map((e) => ({
        canonicalTerm: normalized.slice(0, 40),
        expansion: e,
        expansionType: (e.startsWith("חוק") || e.startsWith("צו") ? "statute_name" : /סעיף|תיקון/.test(e) ? "section_number" : "synonym") as ExpansionType,
        confidence: 0.9,
        source: "legal-knowledge/research/expansion.ts (מילון סגור)",
        meaningDriftRisk: "low" as const,
      })),
      ...custom.terms.map((t) => ({
        canonicalTerm: issue.titleHe,
        expansion: t,
        expansionType: (t.startsWith("חוק") || t.startsWith("צו") ? "statute_name" : /סעיף/.test(t) ? "section_number" : "exact_phrase") as ExpansionType,
        confidence: 0.95,
        source: "dino/retrieval/query-strategy.ts (טבלת סוגיות סגורה)",
        meaningDriftRisk: "none" as const,
      })),
    ];

    return {
      issueId: issue.id,
      primaryQuery: normalized,
      queryTerms: [normalized, ...custom.terms, ...base.expansions],
      expansions,
      negativeAuthorityTerms: custom.negative,
      exclusionTerms: [],
    };
  });

  return { strategies, engineVersion: QUERY_STRATEGY_VERSION };
}
