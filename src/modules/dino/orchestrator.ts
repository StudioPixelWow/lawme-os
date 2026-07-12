/**
 * DinoOrchestrator (Epic 3A, Phase 25-26).
 * Runs the 26-stage pipeline in order, stops on blocking conditions,
 * skips irrelevant stages, records provider + rule versions, returns a
 * typed result, never swallows warnings, never converts failure into a
 * confident answer.
 */
import { randomUUID } from "node:crypto";
import type { DinoRequest } from "./core/request.ts";
import { POC_ALLOWED_INTENTS } from "./core/request.ts";
import type { DinoPipelineContext, DinoRunMode } from "./core/pipeline-context.ts";
import type { DinoRunResult, DinoRunOutcome } from "./core/pipeline-result.ts";
import { DINO_ENGINE_VERSION } from "./core/pipeline-types.ts";
import { executeStage, isBlocking, DETERMINISTIC_PROVENANCE } from "./core/pipeline-stage.ts";
import type { Repositories } from "../legal-knowledge/repositories/types.ts";

import { classifyIntent, INTENT_RULES_VERSION } from "./classification/intent-classifier.ts";
import { assembleMatterContext, CONTEXT_ASSEMBLER_VERSION } from "./context/matter-context-assembler.ts";
import type { SyntheticMatterFixture } from "./context/matter-context-assembler.ts";
import { classifyQuestion, QUESTION_CLASSIFIER_VERSION } from "./classification/question-classifier.ts";
import { runClarificationGate, CLARIFICATION_RULES_VERSION } from "./clarification/clarification-gate.ts";
import { decomposeIssues, ISSUE_DECOMPOSER_VERSION } from "./issues/issue-decomposer.ts";
import { buildResearchPlan, RESEARCH_PLANNER_VERSION } from "./planning/research-planner.ts";
import { planRequiredSources, SOURCE_PLANNER_VERSION } from "./sources/required-source-planner.ts";
import { buildQueryStrategies, QUERY_STRATEGY_VERSION } from "./retrieval/query-strategy.ts";
import { orchestrateRetrieval, RETRIEVAL_ORCHESTRATOR_VERSION } from "./retrieval/retrieval-orchestrator.ts";
import { validateAuthority, AUTHORITY_VALIDATOR_VERSION } from "./authority/authority-validator.ts";
import { findContradictions, CONTRADICTION_ENGINE_VERSION } from "./contradictions/contradiction-engine.ts";
import { evaluateCoverage, COVERAGE_EVALUATOR_VERSION } from "./coverage/coverage-evaluator.ts";
import { assembleEvidence, EVIDENCE_ASSEMBLER_VERSION } from "./evidence/evidence-assembler.ts";
import { planClaims, CLAIM_PLANNER_VERSION } from "./claims/claim-planner.ts";
import { buildControlledDraft, DRAFTER_VERSION } from "./drafting/controlled-drafting-engine.ts";
import { verifyCitations, CITATION_VERIFIER_VERSION } from "./citations/citation-verifier.ts";
import { runLegalQa, LEGAL_QA_VERSION } from "./qa/legal-qa.ts";
import { runRedTeam, RED_TEAM_VERSION } from "./red-team/red-team.ts";
import { evaluateConfidence, CONFIDENCE_ENGINE_VERSION } from "./confidence/confidence-engine.ts";
import { routeHumanReview, REVIEW_ROUTER_VERSION } from "./review/human-review-router.ts";

export interface DinoRunOptions {
  mode?: DinoRunMode;
  matterFixture?: SyntheticMatterFixture | null;
}

export async function runDinoPipeline(
  repositories: Repositories,
  request: DinoRequest,
  options: DinoRunOptions = {},
): Promise<DinoRunResult> {
  const runId = randomUUID();
  const correlationId = randomUUID();
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  const ctx: DinoPipelineContext = {
    runId, correlationId,
    mode: options.mode ?? "development",
    request, repositories,
    artifacts: {},
    stageRecords: [],
    stopConditions: [],
    decisionLog: [],
    startedAt,
  };
  const log = (stageId: string, decisionHe: string) =>
    ctx.decisionLog.push({ at: new Date().toISOString(), stageId, decisionHe });

  const legalDomain = request.legalDomain ?? "labor";
  const orgCtx = { organizationId: request.organizationId ?? null, actorProfileId: request.userId ?? null, correlationId };

  const finish = (outcome: DinoRunOutcome, statusLineHe: string): DinoRunResult => ({
    runId, correlationId, engineVersion: DINO_ENGINE_VERSION, mode: ctx.mode,
    request, outcome, stages: ctx.stageRecords, artifacts: ctx.artifacts,
    stopConditions: ctx.stopConditions, decisionLog: ctx.decisionLog, statusLineHe,
    startedAt, completedAt: new Date().toISOString(), durationMs: Date.now() - t0,
    warnings: ctx.stageRecords.flatMap((s) => s.warnings),
  });

  /* 1. request intake */
  await executeStage(ctx, {
    stageId: "request_intake", purposeHe: "קליטת בקשה ותיקוף מבנה",
    provenance: DETERMINISTIC_PROVENANCE([{ name: "request-intake", version: "1.0" }], ["dino.core.no-untrusted-instructions"]),
    inputSummaryHe: "שאלת משתמש", run: () => ({ status: "passed", outputSummaryHe: "בקשה נקלטה", confidence: 1 }),
  });

  /* 2. intent detection */
  const intentRec = await executeStage(ctx, {
    stageId: "intent_detection", purposeHe: "זיהוי כוונת המשתמש (כללים דטרמיניסטיים)",
    provenance: DETERMINISTIC_PROVENANCE([{ name: "intent-rules", version: INTENT_RULES_VERSION }], ["dino.task.intent-classification"]),
    inputSummaryHe: "שאלת משתמש",
    run: () => {
      const intent = classifyIntent(request);
      ctx.artifacts.intent = intent;
      const supported = POC_ALLOWED_INTENTS.has(intent.primaryIntent);
      if (!supported) {
        return {
          status: "blocked_by_policy", outputSummaryHe: `כוונה לא נתמכת: ${intent.primaryIntent}`,
          stopConditions: [{ code: "unsupported_intent", messageHe: `סוג הבקשה (${intent.primaryIntent}) אינו נתמך בשלב ה-POC`, recommendedActionHe: "נסח כשאלת מחקר משפטי, או פנה למייסד להרחבת הצינור" }],
        };
      }
      return { status: "passed", confidence: intent.confidence, outputSummaryHe: `כוונה: ${intent.primaryIntent}`, artifactType: "intent" };
    },
  });
  if (isBlocking(intentRec)) { log("intent_detection", "עצירה — כוונה לא נתמכת"); return finish("stopped_unsupported_intent", "הבקשה אינה נתמכת בשלב זה"); }

  /* 3. matter-context assembly */
  await executeStage(ctx, {
    stageId: "matter_context_assembly", purposeHe: "הרכבת חבילת הקשר תיק (טענות ≠ עובדות)",
    provenance: DETERMINISTIC_PROVENANCE([{ name: "matter-context", version: CONTEXT_ASSEMBLER_VERSION }]),
    inputSummaryHe: "בקשה + fixture סינתטי",
    run: () => {
      const mc = assembleMatterContext(request, options.matterFixture ?? null);
      ctx.artifacts.matterContext = mc;
      // AI policy check — a prohibited matter never proceeds to retrieval
      if (request.aiPolicy === "prohibited") {
        return {
          status: "blocked_by_policy", outputSummaryHe: "מדיניות AI אוסרת עיבוד",
          stopConditions: [{ code: "ai_prohibited", messageHe: "מדיניות הלקוח/תיק אוסרת שימוש ב-AI", recommendedActionHe: "אין לאחזר תוכן פרטי; נדרש אישור אנושי מפורש" }],
        };
      }
      return { status: "passed", confidence: 0.7, outputSummaryHe: `${mc.items.length} פריטי הקשר`, artifactType: "matterContext" };
    },
  });
  if (ctx.stopConditions.some((s) => s.code === "ai_prohibited")) { log("matter_context_assembly", "עצירה — מדיניות AI"); return finish("stopped_policy", "מדיניות הלקוח אוסרת שימוש ב-AI לבקשה זו"); }

  /* 4-5. question + domain classification */
  const clsRec = await executeStage(ctx, {
    stageId: "question_classification", purposeHe: "סיווג שאלה + תחום (מנוע השער)",
    provenance: DETERMINISTIC_PROVENANCE([{ name: "question-classifier", version: QUESTION_CLASSIFIER_VERSION }]),
    inputSummaryHe: "שאלה",
    run: async () => {
      const cls = await classifyQuestion(request);
      ctx.artifacts.questionClassification = cls;
      return { status: "passed", confidence: cls.confidence, outputSummaryHe: `תחום: ${cls.domain}, תת: ${cls.subdomain ?? "—"}`, artifactType: "questionClassification" };
    },
  });
  const classification = ctx.artifacts.questionClassification!;
  await executeStage(ctx, {
    stageId: "domain_classification", purposeHe: "בדיקת התאמת תחום לקורפוס הפעיל",
    provenance: DETERMINISTIC_PROVENANCE([{ name: "question-classifier", version: QUESTION_CLASSIFIER_VERSION }]),
    inputSummaryHe: "סיווג שאלה",
    run: () => {
      const match = classification.domain === "employment";
      if (!match) {
        return {
          status: "domain_mismatch", outputSummaryHe: `תחום ${classification.domainLabelHe} מחוץ לקורפוס`,
          stopConditions: [{ code: "domain_mismatch", messageHe: `השאלה זוהתה כ"${classification.domainLabelHe}" — הקורפוס הפעיל הוא דיני עבודה בלבד`, recommendedActionHe: "שנה תחום מחקר או הוסף קורפוס מתאים" }],
        };
      }
      return { status: "passed", confidence: classification.confidence, outputSummaryHe: "התחום תואם את הקורפוס" };
    },
  });
  void clsRec;
  if (ctx.stopConditions.some((s) => s.code === "domain_mismatch")) {
    log("domain_classification", "עצירה — אי-התאמת תחום");
    return finish("stopped_domain_mismatch", "לא נמצאו בקורפוס הנוכחי מקורות ברמת רלוונטיות מספקת לשאלה זו.");
  }

  /* 6. clarification gate */
  const clarRec = await executeStage(ctx, {
    stageId: "clarification_gate", purposeHe: "בדיקת עובדות קריטיות חסרות",
    provenance: DETERMINISTIC_PROVENANCE([{ name: "clarification-rules", version: CLARIFICATION_RULES_VERSION }]),
    inputSummaryHe: "שאלה + הקשר",
    run: () => {
      const clar = runClarificationGate(request, ctx.artifacts.matterContext!);
      ctx.artifacts.clarification = clar;
      if (!clar.canProceed) {
        return {
          status: "requires_clarification", outputSummaryHe: `${clar.missingCriticalFields.length} עובדות קריטיות חסרות`,
          artifactType: "clarification",
          stopConditions: [{ code: "clarification_required", messageHe: "חסרות עובדות מכריעות למסקנה לתיק זה", recommendedActionHe: "השב על שאלות ההבהרה הקריטיות" }],
        };
      }
      return { status: "passed", confidence: 0.8, outputSummaryHe: "אין חסמי הבהרה", artifactType: "clarification" };
    },
  });
  if (isBlocking(clarRec)) { log("clarification_gate", "עצירה — נדרשת הבהרה"); return finish("stopped_clarification", "נדרשות הבהרות עובדתיות לפני מסקנה משפטית"); }

  /* 7-9. issue decomposition → research plan → source plan → query strategy */
  await executeStage(ctx, {
    stageId: "issue_decomposition", purposeHe: "פירוק לסוגיות משפטיות (גרף)",
    provenance: DETERMINISTIC_PROVENANCE([{ name: "issue-decomposer", version: ISSUE_DECOMPOSER_VERSION }]),
    inputSummaryHe: "סיווג + הקשר",
    run: () => {
      const g = decomposeIssues(classification, ctx.artifacts.matterContext!);
      ctx.artifacts.issueGraph = g;
      return { status: "passed", confidence: 0.8, outputSummaryHe: `${g.issues.length} סוגיות, ${g.edges.length} תלויות`, artifactType: "issueGraph" };
    },
  });
  const issueGraph = ctx.artifacts.issueGraph!;
  await executeStage(ctx, {
    stageId: "research_plan", purposeHe: "בניית תוכנית מחקר מובנית (לא תשובה)",
    provenance: DETERMINISTIC_PROVENANCE([{ name: "research-planner", version: RESEARCH_PLANNER_VERSION }]),
    inputSummaryHe: "סיווג + גרף סוגיות",
    run: () => {
      const plan = buildResearchPlan(request, classification, issueGraph);
      ctx.artifacts.researchPlan = plan;
      return { status: "passed", confidence: 0.8, outputSummaryHe: `${plan.steps.length} צעדי מחקר`, artifactType: "researchPlan" };
    },
  });
  await executeStage(ctx, {
    stageId: "required_source_planning", purposeHe: "הגדרת מינימום ראיות נדרש לכל סוגיה",
    provenance: DETERMINISTIC_PROVENANCE([{ name: "source-planner", version: SOURCE_PLANNER_VERSION }]),
    inputSummaryHe: "גרף סוגיות",
    run: () => {
      const sp = planRequiredSources(issueGraph);
      ctx.artifacts.sourcePlan = sp;
      return { status: "passed", confidence: 0.85, outputSummaryHe: `${sp.requirements.length} דרישות מקור`, artifactType: "sourcePlan" };
    },
  });
  await executeStage(ctx, {
    stageId: "query_strategy", purposeHe: "אסטרטגיות אחזור מבוקרות לכל סוגיה",
    provenance: DETERMINISTIC_PROVENANCE([{ name: "query-strategy", version: QUERY_STRATEGY_VERSION }]),
    inputSummaryHe: "גרף סוגיות",
    run: () => {
      const qs = buildQueryStrategies(request.question, issueGraph);
      ctx.artifacts.queryStrategies = qs;
      return { status: "passed", confidence: 0.8, outputSummaryHe: `${qs.strategies.length} אסטרטגיות`, artifactType: "queryStrategies" };
    },
  });

  /* 10-11. retrieval per issue */
  const retrievalRec = await executeStage(ctx, {
    stageId: "retrieval", purposeHe: "אחזור לכל סוגיה מול המנוע הקיים + שער רלוונטיות",
    provenance: DETERMINISTIC_PROVENANCE([{ name: "retrieval-orchestrator", version: RETRIEVAL_ORCHESTRATOR_VERSION }]),
    inputSummaryHe: "אסטרטגיות אחזור",
    run: async () => {
      const bundle = await orchestrateRetrieval(repositories, issueGraph, ctx.artifacts.queryStrategies!, legalDomain);
      ctx.artifacts.retrieval = bundle;
      if (bundle.allGatesFailed) {
        return {
          status: "insufficient_evidence", outputSummaryHe: "כל שערי הרלוונטיות נכשלו",
          warnings: ["שער הרלוונטיות נכשל לכל הסוגיות"],
          stopConditions: [{ code: "no_relevant_source", messageHe: "לא נמצאו בקורפוס הנוכחי מקורות ברמת רלוונטיות מספקת לשאלה זו.", recommendedActionHe: "חפש במאגר רחב יותר / הוסף מקור / נסח מחדש" }],
        };
      }
      return { status: "passed", confidence: bundle.anyGatePassed ? 0.7 : 0.3, outputSummaryHe: `${bundle.allEvidence.length} ראיות עברו שער`, artifactType: "retrieval" };
    },
  });
  if (isBlocking(retrievalRec)) { log("retrieval", "עצירה — אין מקור רלוונטי"); return finish("stopped_insufficient_evidence", "לא נמצאו בקורפוס הנוכחי מקורות ברמת רלוונטיות מספקת לשאלה זו."); }
  const retrieval = ctx.artifacts.retrieval!;

  /* 12. authority validation */
  await executeStage(ctx, {
    stageId: "authority_validation", purposeHe: "אימות סמכות לכל מקור (לא משודרג לפי ביטחון מודל)",
    provenance: DETERMINISTIC_PROVENANCE([{ name: "authority-validator", version: AUTHORITY_VALIDATOR_VERSION }]),
    inputSummaryHe: "ראיות שאוחזרו",
    run: () => {
      const a = validateAuthority(retrieval.allEvidence);
      ctx.artifacts.authority = a;
      return { status: "passed", confidence: 0.8, outputSummaryHe: `${a.assessments.length} הערכות סמכות`, artifactType: "authority" };
    },
  });

  /* 13. contradiction search */
  await executeStage(ctx, {
    stageId: "contradiction_search", purposeHe: "חיפוש עמדות מנוגדות (סתירות אינן מוסתרות)",
    provenance: DETERMINISTIC_PROVENANCE([{ name: "contradiction-engine", version: CONTRADICTION_ENGINE_VERSION }]),
    inputSummaryHe: "ראיות שאוחזרו",
    run: () => {
      const c = findContradictions(retrieval.allEvidence);
      ctx.artifacts.contradictions = c;
      return {
        status: "passed", confidence: 0.75,
        warnings: c.unresolvedMaterialCount > 0 ? [`${c.unresolvedMaterialCount} סתירות מהותיות בלתי פתורות`] : [],
        outputSummaryHe: `${c.records.length} סתירות`, artifactType: "contradictions",
      };
    },
  });

  /* 14. coverage evaluation */
  await executeStage(ctx, {
    stageId: "coverage_evaluation", purposeHe: "הערכת כיסוי מול תוכנית המקורות (כיסוי ≠ רלוונטיות)",
    provenance: DETERMINISTIC_PROVENANCE([{ name: "coverage-evaluator", version: COVERAGE_EVALUATOR_VERSION }]),
    inputSummaryHe: "ראיות + סמכות + סתירות",
    run: () => {
      const cov = evaluateCoverage(issueGraph, ctx.artifacts.sourcePlan!, retrieval, ctx.artifacts.authority!, ctx.artifacts.contradictions!);
      ctx.artifacts.coverage = cov;
      return { status: "passed", confidence: 0.75, outputSummaryHe: `כיסוי: ${cov.overallState} (${cov.issuesSupported}/${cov.issuesIdentified})`, artifactType: "coverage" };
    },
  });

  /* 15. relevance-gate integration (dual gate: gate PASS + coverage plan met) */
  const gateRec = await executeStage(ctx, {
    stageId: "relevance_gate", purposeHe: "שער כפול: רלוונטיות + עמידה בתוכנית המקורות",
    provenance: DETERMINISTIC_PROVENANCE([{ name: "relevance-gate", version: "1.0" }, { name: "coverage-evaluator", version: COVERAGE_EVALUATOR_VERSION }]),
    inputSummaryHe: "כיסוי + שערים לכל סוגיה",
    run: () => {
      const cov = ctx.artifacts.coverage!;
      const gatePassedSomewhere = retrieval.anyGatePassed;
      const anyIssueSupported = cov.issuesSupported > 0;
      // A relevant passage without required authority ≠ answer; a
      // high-authority source that is irrelevant ≠ answer. Need both.
      if (!gatePassedSomewhere || !anyIssueSupported) {
        return {
          status: "insufficient_evidence", outputSummaryHe: "השער הכפול לא התקיים",
          warnings: ["רלוונטיות ללא סמכות נדרשת, או סמכות ללא רלוונטיות"],
          stopConditions: [{ code: "dual_gate_failed", messageHe: "לא מתקיימים גם שער רלוונטיות וגם עמידה בתוכנית המקורות", recommendedActionHe: "נדרש מקור ראשי רלוונטי; הפלט לגילוי בלבד" }],
        };
      }
      return { status: "passed", confidence: 0.7, outputSummaryHe: "השער הכפול התקיים" };
    },
  });
  const dualGateFailed = isBlocking(gateRec);
  if (dualGateFailed) log("relevance_gate", "השער הכפול נכשל — ממשיכים לגילוי בלבד, ללא מסקנה");

  /* 16. evidence assembly */
  await executeStage(ctx, {
    stageId: "evidence_assembly", purposeHe: "בניית פנקס ראיות (ללא עוגן תקין — נשמט)",
    provenance: DETERMINISTIC_PROVENANCE([{ name: "evidence-assembler", version: EVIDENCE_ASSEMBLER_VERSION }]),
    inputSummaryHe: "ראיות + סמכות + סתירות",
    run: () => {
      const led = assembleEvidence(retrieval, ctx.artifacts.authority!, ctx.artifacts.contradictions!);
      ctx.artifacts.evidence = led;
      return {
        status: "passed", confidence: 0.8,
        warnings: led.invalidAnchorCount > 0 ? [`${led.invalidAnchorCount} עוגנים פסולים נשמטו`] : [],
        outputSummaryHe: `${led.items.length} פריטי ראיה`, artifactType: "evidence",
      };
    },
  });

  /* 17. claim planning */
  await executeStage(ctx, {
    stageId: "claim_planning", purposeHe: "תכנון טענות אטומיות (safe_to_state)",
    provenance: DETERMINISTIC_PROVENANCE([{ name: "claim-planner", version: CLAIM_PLANNER_VERSION }]),
    inputSummaryHe: "פנקס ראיות + סתירות",
    run: () => {
      const cp = planClaims(issueGraph, ctx.artifacts.evidence!, ctx.artifacts.contradictions!);
      ctx.artifacts.claims = cp;
      return { status: "passed", confidence: 0.75, outputSummaryHe: `${cp.safeCount} בטוחות / ${cp.unsafeCount} לא-בטוחות`, artifactType: "claims" };
    },
  });

  /* 18-19. answer planning + controlled drafting */
  await executeStage(ctx, {
    stageId: "answer_planning", purposeHe: "תכנון מבנה הפלט המובנה",
    provenance: DETERMINISTIC_PROVENANCE([{ name: "answer-planning", version: "1.0" }]),
    inputSummaryHe: "טענות + כיסוי",
    run: () => ({ status: "passed", confidence: 0.8, outputSummaryHe: dualGateFailed ? "פלט לגילוי בלבד (ללא מסקנה)" : "פלט מחקר מובנה" }),
  });
  await executeStage(ctx, {
    stageId: "controlled_drafting", purposeHe: "ניסוח מבוקר (סיכום מחקר בלבד, תווית חובה)",
    provenance: DETERMINISTIC_PROVENANCE([{ name: "controlled-drafting", version: DRAFTER_VERSION }], ["dino.task.controlled-drafting", "dino.safety.extractive-only"]),
    inputSummaryHe: "טענות בטוחות + פנקס ראיות",
    run: () => {
      const draft = buildControlledDraft(issueGraph, ctx.artifacts.claims!, ctx.artifacts.evidence!, ctx.artifacts.coverage!, ctx.artifacts.contradictions!);
      ctx.artifacts.draft = draft;
      return { status: "passed", confidence: 0.75, outputSummaryHe: `${draft.paragraphs.length} פסקאות, ${draft.omittedClaimIds.length} טענות הושמטו`, artifactType: "draft" };
    },
  });

  /* 20. citation verification */
  const citeRec = await executeStage(ctx, {
    stageId: "citation_verification", purposeHe: "אימות ציטוטים מול המקור השמור (חוסם טענה בכשל)",
    provenance: DETERMINISTIC_PROVENANCE([{ name: "citation-verifier", version: CITATION_VERIFIER_VERSION }]),
    inputSummaryHe: "פנקס ראיות + טענות",
    run: async () => {
      const cv = await verifyCitations(repositories, ctx.artifacts.evidence!, ctx.artifacts.claims!, orgCtx);
      ctx.artifacts.citations = cv;
      const draftedClaims = new Set((ctx.artifacts.draft?.paragraphs ?? []).flatMap((p) => p.claimIds));
      const blockedInDraft = cv.blockedClaimIds.filter((c) => draftedClaims.has(c));
      if (blockedInDraft.length > 0) {
        return {
          status: "failed", outputSummaryHe: `${blockedInDraft.length} ציטוטים חוסמים טענות בטיוטה`,
          stopConditions: [{ code: "citation_failure", messageHe: "אימות ציטוט נכשל לטענה שנוסחה — הטענה נחסמת", recommendedActionHe: "הסר את הטענה או תקן את הציטוט; אין להוציא פלט עם ציטוט שבור" }],
        };
      }
      return { status: "passed", confidence: 0.85, outputSummaryHe: `${cv.checks.length} ציטוטים נבדקו`, artifactType: "citations" };
    },
  });
  if (isBlocking(citeRec)) { log("citation_verification", "עצירה — כשל אימות ציטוט"); return finish("stopped_citation_failure", "אימות ציטוט נכשל — הפלט נחסם"); }

  /* 21. legal QA */
  const qaRec = await executeStage(ctx, {
    stageId: "legal_qa", purposeHe: "בקרת איכות משפטית (חוסמת פלט בכשל)",
    provenance: DETERMINISTIC_PROVENANCE([{ name: "legal-qa", version: LEGAL_QA_VERSION }]),
    inputSummaryHe: "טיוטה + טענות + ציטוטים + כיסוי",
    run: () => {
      const qa = runLegalQa(ctx.artifacts.draft!, ctx.artifacts.claims!, ctx.artifacts.evidence!, ctx.artifacts.coverage!, ctx.artifacts.citations!, ctx.artifacts.contradictions!);
      ctx.artifacts.qa = qa;
      if (!qa.passed) {
        return {
          status: "failed", outputSummaryHe: `${qa.blockingFindings.length} ממצאי QA חוסמים`,
          stopConditions: [{ code: "qa_failure", messageHe: "בקרת האיכות המשפטית נכשלה", recommendedActionHe: "תקן את הממצאים החוסמים לפני פלט" }],
        };
      }
      return { status: "passed", confidence: 0.85, outputSummaryHe: "QA עבר", artifactType: "qa" };
    },
  });
  if (isBlocking(qaRec)) { log("legal_qa", "עצירה — QA נכשל"); return finish("stopped_qa_failure", "בקרת האיכות המשפטית נכשלה — הפלט נחסם"); }

  /* 22. red team */
  const redRec = await executeStage(ctx, {
    stageId: "red_team_review", purposeHe: "ביקורת יריב (נפרדת מהניסוח)",
    provenance: DETERMINISTIC_PROVENANCE([{ name: "red-team", version: RED_TEAM_VERSION }]),
    inputSummaryHe: "גרף + כיסוי + סתירות + טענות",
    run: () => {
      const rt = runRedTeam(request, issueGraph, ctx.artifacts.coverage!, ctx.artifacts.contradictions!, ctx.artifacts.claims!, ctx.artifacts.evidence!);
      ctx.artifacts.redTeam = rt;
      if (rt.blockingCount > 0) {
        return {
          status: "requires_human_review", outputSummaryHe: `${rt.blockingCount} אתגרי Red Team חוסמים`,
          warnings: [`${rt.blockingCount} ממצאי Red Team חוסמים`],
          stopConditions: [{ code: "red_team_block", messageHe: "Red Team מצא בעיה חוסמת (למשל סתירה מהותית)", recommendedActionHe: "נדרשת הכרעה אנושית לפני פלט סופי" }],
        };
      }
      return { status: "passed", confidence: 0.7, outputSummaryHe: `${rt.challenges.length} אתגרים, ${rt.unresolvedCount} פתוחים`, artifactType: "redTeam" };
    },
  });
  const redTeamBlocked = isBlocking(redRec);

  /* 23. confidence */
  await executeStage(ctx, {
    stageId: "confidence_evaluation", purposeHe: "הערכת ביטחון מפורקת (ללא הסתברות תוצאה)",
    provenance: DETERMINISTIC_PROVENANCE([{ name: "confidence-engine", version: CONFIDENCE_ENGINE_VERSION }]),
    inputSummaryHe: "כל הארטיפקטים",
    run: () => {
      const conf = evaluateConfidence({
        classification, clarification: ctx.artifacts.clarification!, coverage: ctx.artifacts.coverage!,
        authority: ctx.artifacts.authority!, citations: ctx.artifacts.citations!, contradictions: ctx.artifacts.contradictions!,
        qa: ctx.artifacts.qa!, redTeam: ctx.artifacts.redTeam!, gatePassed: retrieval.anyGatePassed, domainMatch: true,
      });
      ctx.artifacts.confidence = conf;
      return { status: "passed", confidence: conf.overallScore, outputSummaryHe: `רמת ביטחון: ${conf.band}`, artifactType: "confidence" };
    },
  });

  /* 24. human-review routing */
  await executeStage(ctx, {
    stageId: "human_review_routing", purposeHe: "ניתוב לבדיקה אנושית",
    provenance: DETERMINISTIC_PROVENANCE([{ name: "human-review-router", version: REVIEW_ROUTER_VERSION }]),
    inputSummaryHe: "סיווג + כיסוי + סתירות + Red Team + ביטחון",
    run: () => {
      const route = routeHumanReview(request, classification, ctx.artifacts.coverage!, ctx.artifacts.contradictions!, ctx.artifacts.redTeam!, ctx.artifacts.confidence!);
      ctx.artifacts.review = route;
      return { status: "passed", confidence: 0.9, outputSummaryHe: `ניתוב: ${route.primaryTarget}`, artifactType: "review" };
    },
  });

  /* 25-26. final output + audit */
  await executeStage(ctx, {
    stageId: "final_output", purposeHe: "הרכבת פלט סופי מובנה",
    provenance: DETERMINISTIC_PROVENANCE([{ name: "final-output", version: "1.0" }]),
    inputSummaryHe: "כל הארטיפקטים",
    run: () => ({ status: "passed", confidence: 0.9, outputSummaryHe: "פלט מובנה מוכן (טעון בדיקת עו\"ד)" }),
  });
  await executeStage(ctx, {
    stageId: "audit_persistence", purposeHe: "רישום ביקורת (התמדה בטוחה — ראה החלטת התמדה)",
    provenance: DETERMINISTIC_PROVENANCE([{ name: "audit", version: "1.0" }]),
    inputSummaryHe: "תיעוד ריצה",
    run: () => ({ status: "passed", confidence: 1, outputSummaryHe: "ארטיפקטים בטוחים מוכנים להתמדה (לא נשמר אוטומטית ב-POC)" }),
  });

  if (redTeamBlocked) {
    log("red_team_review", "עצירה רכה — נדרשת בדיקה אנושית לפני פלט סופי");
    return finish("stopped_red_team", "הושלם עם ממצא Red Team חוסם — נדרשת הכרעה אנושית לפני פלט סופי");
  }

  log("final_output", "הצינור הושלם — פלט מחקר מובנה, טעון בדיקת עורך דין");
  return finish("completed", "טיוטת מחקר משפטי מובנה הושלמה — נדרשת בדיקת עורך דין");
}
