/**
 * Document Intelligence Engine (Epic 4). Tracks which documents the matter
 * holds, and whether documents required for the current stage are present.
 * Missing stage-required documents block advancement and are surfaced as such.
 */
import type { EngineAssessment, Finding, Matter, MatterEngine, RecommendedAction } from "../types.ts";
import { currentStage } from "../state-machine.ts";
import { action, assessment, finding, score01 } from "./framework.ts";

export const DOCUMENT_ENGINE_VERSION = "matter-document-1.0.0";

export const documentEngine: MatterEngine = {
  name: "matter-document",
  version: DOCUMENT_ENGINE_VERSION,
  assess(matter: Matter): EngineAssessment {
    const stage = currentStage(matter);
    const stageKind = stage?.kind ?? null;
    const findings: Finding[] = [];
    const actions: RecommendedAction[] = [];

    const requiredForStage = matter.documents.filter(
      (d) => d.requiredForStage !== null && d.requiredForStage === stageKind,
    );
    const missingForStage = requiredForStage.filter((d) => !d.present);
    for (const d of missingForStage) {
      findings.push(finding(`document-missing:${d.id}`, "high",
        `מסמך נדרש לשלב חסר: ${d.kindHe}`, "what_is_missing"));
      actions.push(action(`prepare-document:${d.id}`, `להכין/להשיג מסמך: ${d.kindHe}`,
        "lawyer", "המסמך נדרש לשלב הנוכחי בהליך", "high"));
    }

    const otherMissing = matter.documents.filter((d) => !d.present && !missingForStage.includes(d));
    for (const d of otherMissing) {
      findings.push(finding(`document-absent:${d.id}`, "low",
        `מסמך שטרם הושג: ${d.kindHe}`, "what_is_missing"));
    }

    const presentCount = matter.documents.filter((d) => d.present).length;
    const total = matter.documents.length;
    const stageReq = requiredForStage.length;
    const stageHave = stageReq - missingForStage.length;
    const score = stageReq === 0
      ? (total === 0 ? 1 : score01(presentCount / total))
      : score01(stageHave / stageReq);

    return assessment(this.name, this.version, {
      score,
      findings,
      actions,
      data: {
        total,
        presentCount,
        stageKind,
        requiredForStage: requiredForStage.map((d) => d.kindHe),
        missingForStage: missingForStage.map((d) => d.kindHe),
      },
      confidence: 0.8,
      requiresHumanReview: missingForStage.length > 0,
    });
  },
};
