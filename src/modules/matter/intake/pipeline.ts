/**
 * Capability 2 · Slice 2A — the typed, auditable Intelligent Intake pipeline.
 *
 * 20 deterministic stages. It REUSES the existing legal brain — the Relevance
 * Gate's domain detector (via classifyQuestion), the Triad coverage evaluator,
 * and the Procedure graph/registries — and never builds a second brain and
 * never calls a model (none is wired; the runtime refuses network providers).
 *
 * Output is ALWAYS a MatterIntakeDraft. Nothing is persisted here. Every item
 * is an allegation-or-weaker with a source span, and the whole draft is routed
 * to human review before any Matter can be created.
 */

import { classifyQuestion } from "../../dino/classification/question-classifier.ts";
import type { DinoRequest } from "../../dino/core/request.ts";
import { evaluateTriad, TOPIC_LEGISLATION, TOPIC_PROCEDURE } from "../../legal-knowledge/triad/coverage.ts";
import { EMPLOYMENT_PROCEDURE_GRAPH, findProcedure } from "../../legal-knowledge/procedure/index.ts";
import type { EmploymentProcedureType } from "../../legal-knowledge/procedure/types.ts";

import type {
  ClarificationQuestion,
  ContradictionFinding,
  DraftProvenanceEntry,
  IntakeConfidenceReport,
  IntakeInput,
  IntakePipelineOptions,
  IntakeReviewRoute,
  LegalCoverageAssessment,
  MatterIntakeDraft,
  MissingSource,
} from "./contracts.ts";
import { MATTER_INTAKE_CONTRACT_VERSION } from "./contracts.ts";
import { sanitizeIntakeText } from "./injection-guard.ts";
import {
  deriveEvidenceRequirements,
  deriveLegalIssues,
  detectContradictions,
  SUBDOMAIN_TO_TOPIC,
} from "./extractors.ts";
import { IntakeProviderRouter } from "./providers/router.ts";
import { clamp, stableHash, stableId } from "./util.ts";

export const INTAKE_ENGINE_VERSION = "matter-intake-engine-1.0.0";

const FORUM_BY_PROCEDURE: Partial<Record<EmploymentProcedureType, string>> = {
  pregnancy_dismissal: "בית הדין האזורי לעבודה",
  pre_dismissal_dispute: "בית הדין האזורי לעבודה",
  hearing_before_dismissal: "בית הדין האזורי לעבודה",
  severance_claim: "בית הדין האזורי לעבודה",
  wage_overtime_claim: "בית הדין האזורי לעבודה",
  pension_rights_claim: "בית הדין האזורי לעבודה",
  discrimination_claim: "בית הדין האזורי לעבודה",
  harassment_complaint: "בית הדין האזורי לעבודה",
  regional_labor_court_civil: "בית הדין האזורי לעבודה",
  appeal_to_national_labor_court: "בית הדין הארצי לעבודה",
  national_insurance_claim: "בית הדין האזורי לעבודה (ביטוח לאומי)",
  settlement_enforcement: "בית הדין האזורי לעבודה",
};

function prov(stage: string, ruleOrEngine: string, atISO: string): DraftProvenanceEntry {
  return { stage, ruleOrEngine, atISO };
}

/**
 * Run the intake pipeline. Pure + deterministic given (input, options).
 * Returns a reviewable draft — never persists, never confirms.
 */
export async function runIntakePipeline(
  input: IntakeInput,
  options: IntakePipelineOptions,
): Promise<MatterIntakeDraft> {
  const atISO = options.nowISO;
  const provenance: DraftProvenanceEntry[] = [];
  const warningsHe: string[] = [];

  // Stage 1 — Input validation.
  provenance.push(prov("1.input_validation", "sanitize+length", atISO));
  const storyRaw = (input.storyHe ?? "").trim();
  const pastedRaw = (input.pastedHe ?? "").trim();
  const inputModes: Array<"story" | "pasted"> = [];
  if (storyRaw) inputModes.push("story");
  if (pastedRaw) inputModes.push("pasted");

  const storySan = sanitizeIntakeText(storyRaw, "story");
  const pastedSan = pastedRaw ? sanitizeIntakeText(pastedRaw, "pasted") : null;
  warningsHe.push(...storySan.warningsHe, ...(pastedSan?.warningsHe ?? []));

  // Spans reference each sanitized text independently (source discriminated).
  const story = storySan.clean;
  const pasted = pastedSan?.clean ?? "";
  const combinedForBrain = [story, pasted].filter(Boolean).join("\n");

  const draftId = stableId("draft", input.organizationId, stableHash(combinedForBrain), atISO);
  const rawInputReference = `intake-raw:${draftId}`; // reference only — raw text is NOT logged

  // Guard: empty input → an explicit validation draft (no silent failure).
  if (!combinedForBrain) {
    return emptyValidationDraft(input, atISO, rawInputReference, inputModes, warningsHe);
  }

  // Stage 2 — Intent detection (this slice: always "matter_intake").
  provenance.push(prov("2.intent_detection", "intake-intent", atISO));

  // Stage 3 — Legal-domain classification (REUSE the relevance-gate detector).
  const request: DinoRequest = { question: combinedForBrain, legalDomain: "labor", language: "he" };
  const classification = await classifyQuestion(request);
  provenance.push(prov("3.domain_classification", "dino.classifyQuestion→relevance-gate.detectDomain", atISO));
  const detectedDomain = classification.domain; // "employment" | "unknown" | ...
  const subdomain = classification.subdomain; // e.g. "pregnancy_dismissal" | null
  const domainWithinScope = detectedDomain === "employment";

  // Stages 4-9 — Extraction via the provider seam (deterministic by default).
  // The provider only SUGGESTS; the router re-validates every item (span
  // integrity, intake-only statuses, deadline honesty) before it is used.
  const router = options.router ?? new IntakeProviderRouter(options.providerMode ?? "deterministic");
  const routed = await router.extract({ story, pasted, atISO });
  provenance.push(prov("4-9.extraction", `provider:${routed.providerId}|mode:${routed.mode}`, atISO));
  if (routed.violations.length) {
    warningsHe.push(`המערכת דחתה ${routed.violations.length} פריטים מהחילוץ שלא עמדו באימות דטרמיניסטי.`);
  }

  // Stages 4-5 — Participants (validated).
  const contacts = routed.suggestions.contacts;

  // Stages 6-7 — Material statements + epistemic (validated: intake statuses only).
  let facts = routed.suggestions.facts;

  // Stage 17 (early) — Contradiction detection promotes conflicts to disputed.
  const contra = detectContradictions(facts, atISO);
  facts = contra.updated;
  const contradictions: ContradictionFinding[] = contra.contradictions;
  provenance.push(prov("17.contradictions", "extractors.detectContradictions", atISO));

  // Stage 8 — Dates/deadlines (validated: no invented dates).
  const deadlines = routed.suggestions.deadlines;

  // Stage 9 — Document mentions (validated).
  const mentionedDocuments = routed.suggestions.mentionedDocuments;

  // Stage 10 — Evidence-requirement generation (derived from subdomain).
  const evidenceRequirements = deriveEvidenceRequirements(subdomain, atISO);
  provenance.push(prov("10.evidence_requirements", "extractors.deriveEvidenceRequirements", atISO));

  // Stage 11 — Preliminary legal-issue identification.
  const preliminaryLegalIssues = deriveLegalIssues(subdomain, atISO);
  provenance.push(prov("11.legal_issues", "extractors.deriveLegalIssues", atISO));

  // Stage 12 — Procedure suggestion (REUSE topic→procedure registry + catalog).
  const topic = subdomain ? SUBDOMAIN_TO_TOPIC[subdomain] ?? subdomain : null;
  const suggestedProcedure: EmploymentProcedureType | null = topic ? TOPIC_PROCEDURE[topic] ?? null : null;
  // Confirm the procedure exists in the graph (reuse the catalog as source of truth).
  const procedureKnown = suggestedProcedure ? findProcedure(EMPLOYMENT_PROCEDURE_GRAPH, suggestedProcedure) !== null : false;
  const suggestedForumHe = suggestedProcedure && procedureKnown ? FORUM_BY_PROCEDURE[suggestedProcedure] ?? null : null;
  provenance.push(prov("12.procedure", "triad.TOPIC_PROCEDURE + procedure.catalog", atISO));

  // Stages 13-14 — Required-source planning + Triad coverage evaluation (REUSE).
  const availableLegislationRefIds = topic ? TOPIC_LEGISLATION[topic] ?? [] : [];
  const triad = evaluateTriad({
    topic: topic ?? "unknown",
    availableLegislationRefIds, // governing statute identified by topic; facts NOT confirmed
    procedureType: suggestedProcedure,
    factsConfirmed: false, // intake produces only allegations — never confirmed facts
  });
  provenance.push(prov("13-14.triad_coverage", "triad.evaluateTriad", atISO));

  // Stage 15 — Missing-information analysis.
  const missingSources: MissingSource[] = triad.nextResearchActionsHe.map((a) => ({
    refIdOrLabelHe: a,
    whyNeededHe: "נדרש להשלמת כיסוי משפטי (Triad)",
  }));
  const missingInfoWarnings: string[] = [];
  if (!subdomain && domainWithinScope) missingInfoWarnings.push("לא זוהתה תת-סוגיה מובהקת — נדרשת הבהרה");
  provenance.push(prov("15.missing_info", "triad.nextResearchActions", atISO));

  // Build the honest legal-coverage assessment (preliminary, non-final).
  const coverageStrength: LegalCoverageAssessment["coverageStrength"] =
    !domainWithinScope || triad.state === "insufficient_facts" || triad.state === "insufficient_legislation"
      ? "insufficient"
      : triad.canProduceMatterRecommendation
        ? "sufficient"
        : "partial";
  const legalCoverage: LegalCoverageAssessment = {
    detectedDomain: domainWithinScope ? detectedDomain : "out_of_domain",
    domainWithinScope,
    governingLegislationRefIds: availableLegislationRefIds,
    procedureType: suggestedProcedure,
    // Honest, NEVER a fabricated citation: no binding precedent is asserted at intake.
    caseLawCoverageHe:
      "פסיקה במאגר הנוכחי מסומנת לצורכי גילוי בלבד וטרם אומתה; אין לקבוע הלכה מחייבת בשלב האינטייק.",
    missingPrimarySourceRefsHe: triad.nextResearchActionsHe,
    coverageState: triad.state,
    coverageStrength,
    canProducePreliminaryView: domainWithinScope && subdomain !== null,
    specialistReviewRequired: !domainWithinScope || classification.riskLevel === "high",
    limitationsHe: [
      "הערכה מקדמית בלבד — אינה חוות דעת משפטית.",
      "העובדות הן טענות שטרם אומתו; אין מסקנה משפטית סופית.",
      ...(domainWithinScope ? [] : ["הסיפור אינו בתחום דיני העבודה שבו LawME פועל כיום."]),
    ],
  };
  provenance.push(prov("13.required_sources", "triad.required + coverage", atISO));

  // Stage 16 — Clarification-question generation (≤5, ranked by legal impact).
  const clarificationQuestions = buildClarifications({
    domainWithinScope,
    subdomain,
    facts,
    deadlines,
    contacts,
    atISO,
  });
  provenance.push(prov("16.clarifications", "clarification-engine", atISO));

  // Stage 12/19 — Confidence report (decomposed, non-outcome).
  const confidenceReport = buildConfidence({
    classification,
    coverageStrength,
    factCount: facts.length,
    contradictions,
    domainWithinScope,
  });

  // Human-review routing (mirrors intelligence review-route vocabulary).
  const reviewRoute = buildReviewRoute({
    domainWithinScope,
    riskLevel: classification.riskLevel,
    contradictions,
    aiPolicy: options.aiPolicy,
    coverageStrength,
  });
  provenance.push(prov("19.human_review", "review-router", atISO));

  if (!domainWithinScope) {
    warningsHe.unshift("הסיפור אינו נמצא בתחום המשפטי הנתמך (דיני עבודה). התוצאה מוגבלת להפניה לבדיקת מומחה.");
  }
  warningsHe.push(...missingInfoWarnings);

  // Stage 18 — Intake Draft assembly.
  const status: MatterIntakeDraft["status"] = clarificationQuestions.some((q) => !q.skippable)
    ? "needs_clarification"
    : "ready_for_review";

  return {
    draftId,
    organizationId: input.organizationId,
    createdBy: input.createdBy,
    rawInputReference,
    inputModes,
    detectedDomain: legalCoverage.detectedDomain,
    suggestedProcedure,
    suggestedForumHe,
    contacts,
    matterParticipants: contacts, // participant = contact + role; identical pre-persistence
    facts,
    deadlines,
    mentionedDocuments,
    evidenceRequirements,
    preliminaryLegalIssues,
    clarificationQuestions,
    contradictions,
    legalCoverage,
    missingSources,
    confidenceReport,
    reviewRoute,
    warningsHe: dedupe(warningsHe),
    provenance,
    status,
    engineVersion: `${INTAKE_ENGINE_VERSION}|${MATTER_INTAKE_CONTRACT_VERSION}`,
    assembledAt: atISO,
  };
}

/* ------------------------------------------------------------------ */

function dedupe(a: string[]): string[] {
  return Array.from(new Set(a.filter(Boolean)));
}

function emptyValidationDraft(
  input: IntakeInput,
  atISO: string,
  rawInputReference: string,
  inputModes: Array<"story" | "pasted">,
  warningsHe: string[],
): MatterIntakeDraft {
  return {
    draftId: stableId("draft", input.organizationId, "empty", atISO),
    organizationId: input.organizationId,
    createdBy: input.createdBy,
    rawInputReference,
    inputModes,
    detectedDomain: "unknown",
    suggestedProcedure: null,
    suggestedForumHe: null,
    contacts: [],
    matterParticipants: [],
    facts: [],
    deadlines: [],
    mentionedDocuments: [],
    evidenceRequirements: [],
    preliminaryLegalIssues: [],
    clarificationQuestions: [],
    contradictions: [],
    legalCoverage: {
      detectedDomain: "unknown",
      domainWithinScope: false,
      governingLegislationRefIds: [],
      procedureType: null,
      caseLawCoverageHe: "אין קלט לניתוח.",
      missingPrimarySourceRefsHe: [],
      coverageState: "insufficient_facts",
      coverageStrength: "insufficient",
      canProducePreliminaryView: false,
      specialistReviewRequired: false,
      limitationsHe: ["לא הוזן טקסט לניתוח."],
    },
    missingSources: [],
    confidenceReport: {
      band: "insufficient_evidence",
      overallScore: 0,
      factorsHe: ["אין קלט"],
      blockingUncertaintyHe: ["לא הוזן סיפור או טקסט"],
      requiresHumanReview: true, // invariant: nothing persists without review
    },
    reviewRoute: { primaryTarget: "lawyer_review", targets: ["lawyer_review"], reasonsHe: ["אין קלט"], blocking: false },
    warningsHe: dedupe([...warningsHe, "יש להזין תיאור של המקרה כדי להתחיל בניתוח."]),
    provenance: [prov("1.input_validation", "empty-input", atISO)],
    status: "needs_clarification",
    engineVersion: `${INTAKE_ENGINE_VERSION}|${MATTER_INTAKE_CONTRACT_VERSION}`,
    assembledAt: atISO,
  };
}

function buildClarifications(args: {
  domainWithinScope: boolean;
  subdomain: string | null;
  facts: MatterIntakeDraft["facts"];
  deadlines: MatterIntakeDraft["deadlines"];
  contacts: MatterIntakeDraft["contacts"];
  atISO: string;
}): ClarificationQuestion[] {
  const qs: ClarificationQuestion[] = [];
  const push = (
    q: Omit<ClarificationQuestion, "questionId" | "priority">,
    priority: number,
  ) => qs.push({ ...q, questionId: stableId("clarify", q.questionHe), priority });

  if (!args.domainWithinScope) {
    push(
      {
        questionHe: "האם המקרה נוגע ליחסי עבודה (מעסיק–עובד)? אם לא, באיזה תחום משפטי מדובר?",
        whyItMattersHe: "קובע אם LawME יכול לטפל בתיק ובאיזה גוף דין.",
        expectedAnswerHe: "תחום משפטי / כן־לא",
        skippable: false,
        ifSkippedHe: "לא ניתן לקבוע תחום או דין חל.",
        affects: "domain",
      },
      1,
    );
  }
  if (args.domainWithinScope && !args.subdomain) {
    push(
      {
        questionHe: "מהי הסוגיה המרכזית (פיטורים, שכר, שימוע, פנסיה וכו')?",
        whyItMattersHe: "קובעת את הדין החל, ההליך והראיות הנדרשות.",
        expectedAnswerHe: "סוג הסוגיה",
        skippable: false,
        ifSkippedHe: "לא ניתן להציע הליך או דרישות ראיה.",
        affects: "procedure",
      },
      1,
    );
  }
  const hasClient = args.contacts.some((c) => c.value.suggestedRole === "client");
  if (!hasClient) {
    push(
      {
        questionHe: "מיהו הלקוח שאתם מייצגים בתיק?",
        whyItMattersHe: "זהות הלקוח והתפקיד קובעים ניגוד עניינים וכיוון הטיעון.",
        expectedAnswerHe: "שם הלקוח",
        skippable: true,
        ifSkippedHe: "התיק ייווצר ללא לקוח מזוהה.",
        affects: "participant_role" as ClarificationQuestion["affects"],
      },
      2,
    );
  }
  const relative = args.deadlines.find((d) => d.value.kind === "unknown_ambiguous");
  if (relative) {
    push(
      {
        questionHe: "מהו תאריך העוגן שממנו נספר המועד היחסי שהוזכר?",
        whyItMattersHe: "בלי תאריך עוגן לא ניתן לחשב מועד אחרון ודאי.",
        expectedAnswerHe: "תאריך (יום/חודש/שנה)",
        skippable: true,
        ifSkippedHe: "המועד יישאר לא ודאי ולא יישמר כמועד מחייב.",
        affects: "deadline",
      },
      2,
    );
  }
  if (args.subdomain === "pregnancy_dismissal" && !args.facts.some((f) => f.value.factKey === "employer_knew_pregnancy")) {
    push(
      {
        questionHe: "האם וכיצד נודע למעסיק על ההיריון לפני ההחלטה על הפיטורים?",
        whyItMattersHe: "ידיעת המעסיק היא תנאי מהותי לתחולת ההגנה בחוק עבודת נשים.",
        expectedAnswerHe: "כן/לא + אופן הידיעה",
        skippable: false,
        ifSkippedHe: "לא ניתן להעריך את חוזק העילה.",
        affects: "claim_viability",
      },
      1,
    );
  }
  // Rank by priority, cap at five per round.
  return qs.sort((a, b) => a.priority - b.priority).slice(0, 5);
}

function buildConfidence(args: {
  classification: Awaited<ReturnType<typeof classifyQuestion>>;
  coverageStrength: LegalCoverageAssessment["coverageStrength"];
  factCount: number;
  contradictions: ContradictionFinding[];
  domainWithinScope: boolean;
}): IntakeConfidenceReport {
  const factorsHe: string[] = [];
  const blockingUncertaintyHe: string[] = [];
  let score = 0.5;

  if (!args.domainWithinScope) {
    factorsHe.push("מחוץ לתחום הנתמך");
    blockingUncertaintyHe.push("תחום משפטי לא נתמך");
    score = 0.15;
  } else {
    factorsHe.push(`זיהוי תחום/סוגיה: ${args.classification.confidence}`);
    score = clamp(0.3 + 0.4 * args.classification.confidence, 0, 0.85);
    if (args.factCount === 0) {
      blockingUncertaintyHe.push("לא חולצו אמירות מהותיות");
      score = Math.min(score, 0.3);
    }
    if (args.coverageStrength === "insufficient") {
      blockingUncertaintyHe.push("כיסוי משפטי לא מספק");
      score = Math.min(score, 0.4);
    }
    if (args.contradictions.length) {
      factorsHe.push("קיימות טענות סותרות");
      score = Math.min(score, 0.45);
    }
  }
  const band: IntakeConfidenceReport["band"] = !args.domainWithinScope
    ? "human_review_required"
    : blockingUncertaintyHe.length
      ? "insufficient_evidence"
      : score >= 0.7
        ? "high"
        : score >= 0.45
          ? "moderate"
          : "low";
  return {
    band,
    overallScore: Number(score.toFixed(2)),
    factorsHe,
    blockingUncertaintyHe,
    // Intake ALWAYS requires human review before persistence — non-negotiable.
    requiresHumanReview: true,
  };
}

function buildReviewRoute(args: {
  domainWithinScope: boolean;
  riskLevel: "low" | "medium" | "high";
  contradictions: ContradictionFinding[];
  aiPolicy?: "allowed" | "allowed_with_review" | "prohibited";
  coverageStrength: LegalCoverageAssessment["coverageStrength"];
}): IntakeReviewRoute {
  const reasonsHe: string[] = [];
  const targets = new Set<IntakeReviewRoute["primaryTarget"]>();

  if (args.aiPolicy === "prohibited") {
    return {
      primaryTarget: "do_not_proceed",
      targets: ["do_not_proceed"],
      reasonsHe: ["מדיניות ה-AI של התיק אוסרת עיבוד אוטומטי"],
      blocking: true,
    };
  }
  // Baseline: any legal output requires a lawyer's review.
  targets.add("lawyer_review");
  reasonsHe.push("כל תוצר משפטי טעון בדיקת עורך דין");

  if (!args.domainWithinScope) {
    targets.add("specialist_review");
    reasonsHe.push("מחוץ לתחום הנתמך — נדרשת בדיקת מומחה");
  }
  if (args.riskLevel === "high") {
    targets.add("senior_lawyer_review");
    reasonsHe.push("סוגיה בסיכון גבוה");
  }
  if (args.contradictions.length) {
    targets.add("senior_lawyer_review");
    reasonsHe.push("קיימות טענות סותרות");
  }
  const order: IntakeReviewRoute["primaryTarget"][] = [
    "do_not_proceed",
    "specialist_review",
    "partner_review",
    "senior_lawyer_review",
    "lawyer_review",
  ];
  const primaryTarget = order.find((t) => targets.has(t)) ?? "lawyer_review";
  return { primaryTarget, targets: Array.from(targets), reasonsHe, blocking: false };
}
