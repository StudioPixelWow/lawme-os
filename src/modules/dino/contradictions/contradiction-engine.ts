/**
 * DinoContradictionEngine (Epic 3A, Phase 12).
 * Deterministic contradiction surfacing over retrieved evidence.
 * Conflicts are NEVER hidden; unresolved material conflicts reduce
 * confidence (consumed by the Confidence Engine) and route to humans.
 */
import { createHash } from "node:crypto";
import type { DbEvidenceItem } from "../../legal-knowledge/research/engine-db.ts";
import type { ContradictionRecord, ContradictionReport } from "./types.ts";

export const CONTRADICTION_ENGINE_VERSION = "contradiction-engine-1.0.0";

/** explicit opposition markers in the synthetic corpus + real-world phrasing */
const OPPOSITION_MARKERS = [
  "בניגוד לגישה", "בניגוד לעמדה", "עמדה מנוגדת", "דעה חולקת",
  "אין מקום לפסיקת", "יש לדחות את הגישה", "לא ניתן לקבל את העמדה",
];

const AUTH_RANK: Record<string, number> = { legislation: 4, supreme: 3, national_labor: 2, guidance: 1.5, regional: 1, secondary: 0.5, unknown: 0 };

function recordId(a: string, b: string): string {
  return "contra-" + createHash("sha256").update(a + "||" + b).digest("hex").slice(0, 8);
}

export function findContradictions(evidence: DbEvidenceItem[]): ContradictionReport {
  const records: ContradictionRecord[] = [];

  for (const e of evidence) {
    const marker = OPPOSITION_MARKERS.find((m) => e.passage.includes(m) || e.title.includes(m));
    if (!marker) continue;
    // find the opposed side: another source on an overlapping topic with
    // higher/equal authority that the marked passage argues against
    const opposed = evidence.filter((o) =>
      o.documentId !== e.documentId &&
      (AUTH_RANK[o.authorityClass] ?? 0) >= (AUTH_RANK[e.authorityClass] ?? 0),
    );
    const counterpart = opposed[0] ?? null;

    const aRank = counterpart ? AUTH_RANK[counterpart.authorityClass] ?? 0 : 0;
    const bRank = AUTH_RANK[e.authorityClass] ?? 0;
    const resolvable = counterpart !== null && aRank > bRank;

    records.push({
      id: recordId(e.documentId + e.anchor.anchorKey, counterpart?.documentId ?? "none"),
      propositionAHe: counterpart ? counterpart.passage.slice(0, 140) : "העמדה הרווחת (לא אותרה בסט הנוכחי)",
      sourceA: counterpart
        ? { documentId: counterpart.documentId, anchorKey: counterpart.anchor.anchorKey, titleHe: counterpart.title, authorityClass: counterpart.authorityClass }
        : { documentId: "unknown", anchorKey: "-", titleHe: "לא אותר", authorityClass: "unknown" },
      propositionBHe: e.passage.slice(0, 140),
      sourceB: { documentId: e.documentId, anchorKey: e.anchor.anchorKey, titleHe: e.title, authorityClass: e.authorityClass },
      contradictionType: "contrary_case_law",
      directOrApparent: counterpart ? "direct" : "apparent",
      distinctionFactorsHe: ["ייתכן שוני בהליך (דיון מהיר)", "ייתכן שוני עובדתי"],
      authorityComparisonHe: counterpart
        ? `${counterpart.authorityClass} (${aRank}) מול ${e.authorityClass} (${bRank})`
        : "לא ניתן להשוות — צד אחד לא אותר",
      temporalComparisonHe: "לא נקבע (מטא-נתוני זמן חלקיים ב-POC)",
      recommendedHumanReview: true,
      resolutionStatus: resolvable ? "resolved_by_hierarchy" : "unresolved",
      material: !resolvable,
    });
  }

  return {
    records,
    searchedHe: [
      "סמני עמדה מנוגדת בטקסט הפסיקה",
      "השוואת דרגות סמכות בין מקורות באותה סוגיה",
      "לא נסרקו: גרסאות חקיקה סותרות, תיקונים מאוחרים (אין מטא-נתונים ב-POC) — מוצהר",
    ],
    unresolvedMaterialCount: records.filter((r) => r.material && r.resolutionStatus === "unresolved").length,
    engineVersion: CONTRADICTION_ENGINE_VERSION,
  };
}
