/**
 * Deterministic prose provider (Slice 3.2.0). PURE. No AI.
 * When no model is configured (or the model call fails), Dino still responds —
 * stating the VERIFIED FINDINGS only, never a legal opinion or speculation.
 */
import type { DinoProvider, ProviderInput, ProviderProse } from "../types.ts";
import type { ConfidenceLevel } from "../../../legal-research/types.ts";

const CONFIDENCE_HE: Record<ConfidenceLevel, string> = {
  high: "גבוהה", moderate: "בינונית", low: "נמוכה", none: "לא ניתנת לקביעה",
};

export const deterministicProvider: DinoProvider = {
  id: "deterministic",
  available: true,
  async generate(input: ProviderInput): Promise<ProviderProse> {
    const r = input.legalResearchResult;
    const legN = r.matchedLegislation.length;
    const caseN = r.matchedCases.length;
    const grounded = r.matchedLegislation.some((s) => s.usableForClaim) || r.matchedCases.some((s) => s.usableForClaim);

    const executiveSummaryHe =
      `זוהו ${legN} מקורות חקיקה ו-${caseN} פסקי דין רלוונטיים. רמת הביטחון של המחקר: ${CONFIDENCE_HE[r.confidence.level]}.` +
      (grounded ? " קיימת אסמכתה מאומתת התומכת בממצאים." : " האסמכתאות שאותרו טעונות אימות ואינן מבססות מסקנה מחייבת.");

    const lines: string[] = [];
    if (legN > 0) {
      lines.push("חקיקה רלוונטית: " + r.matchedLegislation.map((s) => s.citationHe).join("; ") + ".");
    }
    if (caseN > 0) {
      lines.push("פסיקה לגילוי (טעונה אימות מספר הליך): " + r.matchedCases.slice(0, 4).map((s) => s.citationHe).join("; ") + ".");
    }
    if (r.conflicts.length > 0) {
      lines.push("שימו לב לקונפליקטים: " + r.conflicts.map((c) => c.descriptionHe).join("; ") + ".");
    }
    if (lines.length === 0) lines.push("לא אותרו מקורות מאומתים לשאלה זו.");
    lines.push("זהו ריכוז ממצאים בלבד; ניסוח מסקנה משפטית מחייב בדיקה של עורך דין.");

    return {
      executiveSummaryHe,
      legalAnalysisHe: lines.join("\n"),
      usedRecordIds: r.sourceMetadata.map((s) => s.recordId),
      providerId: "deterministic",
    };
  },
};
