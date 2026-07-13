/**
 * Evidence Engine (Epic 4). Assesses collection status of evidence, separating
 * mandatory from optional, and surfaces gaps in mandatory evidence as the
 * drivers of the score. Evidence provenance lives in the procedure graph; this
 * engine reasons over what the matter has actually collected.
 */
import type { EngineAssessment, Finding, Matter, MatterEngine, RecommendedAction } from "../types.ts";
import { action, assessment, finding, score01 } from "./framework.ts";

export const EVIDENCE_ENGINE_VERSION = "matter-evidence-1.0.0";

export const evidenceEngine: MatterEngine = {
  name: "matter-evidence",
  version: EVIDENCE_ENGINE_VERSION,
  assess(matter: Matter): EngineAssessment {
    const findings: Finding[] = [];
    const actions: RecommendedAction[] = [];

    const mandatory = matter.evidence.filter((e) => e.mandatory);
    const mandatoryMissing = mandatory.filter((e) => !e.collected);
    const optionalMissing = matter.evidence.filter((e) => !e.mandatory && !e.collected);

    for (const e of mandatoryMissing) {
      findings.push(finding(`evidence-missing:${e.id}`, "high",
        `ראיה מהותית חסרה: ${e.labelHe}`, "what_is_missing"));
      actions.push(action(`collect-evidence:${e.id}`, `לאסוף/לשמר ראיה: ${e.labelHe}`,
        "lawyer", "ראיה מהותית הנדרשת לביסוס העילה טרם נאספה", "high"));
    }
    for (const e of optionalMissing) {
      findings.push(finding(`evidence-optional-missing:${e.id}`, "low",
        `ראיה משלימה שטרם נאספה: ${e.labelHe}`, "what_is_missing"));
    }

    const mandatoryCount = mandatory.length;
    const collectedMandatory = mandatoryCount - mandatoryMissing.length;
    const score = mandatoryCount === 0 ? 1 : score01(collectedMandatory / mandatoryCount);

    return assessment(this.name, this.version, {
      score,
      findings,
      actions,
      data: {
        totalEvidence: matter.evidence.length,
        mandatoryCount,
        collectedMandatory,
        mandatoryMissing: mandatoryMissing.map((e) => e.labelHe),
        optionalMissingCount: optionalMissing.length,
      },
      confidence: 0.85,
      requiresHumanReview: mandatoryMissing.length > 0,
    });
  },
};
