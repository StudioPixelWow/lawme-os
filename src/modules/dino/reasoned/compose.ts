/**
 * Reasoned response composer (Slice 4.1.0). PURE + DETERMINISTIC.
 * Maps the canonical LegalOpinion + LegalResearchResult + validated provider
 * prose into the user-facing ReasonedDinoResponse: bottom-line-first, matter
 * application, governing law, case law, strongest opposing argument, risks,
 * missing facts, an explained confidence + coverage model, claim-level citations
 * and a real research trace. Deep-frozen.
 */
import type { LegalResearchResult, CanonicalSource } from "../../legal-research/types.ts";
import type { LegalOpinion } from "../../legal-reasoning/types.ts";
import type {
  ReasonedDinoResponse, ReasonedProse, ReasonedStatus, ContextKind, CoverageLevel,
  CitationView, OpposingArgumentView, RiskView, FollowUpView, FactView, ElementFinding, ResearchTraceSearch,
} from "./types.ts";
import { toCitationView, splitCitations, verifiedIdSet, buildClaims } from "./citations.ts";

export const REASONED_DINO_VERSION = "reasoned-dino-v1";

const STATUS_LABEL: Record<ReasonedStatus, string> = {
  answered: "מבוסס", provisional: "מותנה", needs_facts: "חסרות עובדות מהותיות",
  no_verified_authority: "אין אסמכתה מאומתת", conflicting_authority: "אסמכתאות סותרות",
  insufficient_coverage: "כיסוי חלקי", out_of_scope: "מחוץ לקורפוס המאומת",
};

// Positioning: when a topic is outside the verified corpus, the limitation
// belongs to the corpus — never to Dino. Dino remains a general legal-research
// engine; this version's verified corpus simply hasn't reached the topic yet.
const OUT_OF_SCOPE_BOTTOM_LINE_HE =
  "נושא משפטי זה נמצא כרגע מחוץ לקורפוס המאומת הזמין בגרסה זו של LawME. דינו יכול עדיין לסייע במחקר וניתוח משפטי כללי, אך נושא זה טרם אומת לרמת הראיה של LawME.";
const CONF_LABEL: Record<string, string> = { high: "גבוה", moderate: "בינוני", low: "נמוך", none: "לא ניתן לקבוע" };
const COVERAGE_LABEL: Record<CoverageLevel, string> = { complete: "מלא", substantial: "משמעותי", partial: "חלקי", insufficient: "לא מספק" };
const CAT_LABEL: Record<string, string> = { contrary_authority: "אסמכתה סותרת", alternative_interpretation: "פרשנות חלופית", procedural_obstacle: "מכשול דיוני", jurisdictional_limitation: "מגבלת סמכות", statutory_exception: "חריג חוקי", factual_weakness: "חולשה עובדתית" };
const DISPOSITION_LABEL: Record<string, string> = { accepted: "התקבלה", rebutted: "נדחתה", unresolved: "לא הוכרעה" };
const SEVERITY_LABEL: Record<string, string> = { low: "נמוך", medium: "בינוני", high: "גבוה", critical: "קריטי" };
const ELEMENT_STATUS_LABEL: Record<string, string> = { satisfied: "מבוסס", contested: "שנוי/טענה", missing: "חסר" };

function deepFreeze<T>(v: T): T {
  if (v && typeof v === "object" && !Object.isFrozen(v)) { Object.freeze(v); for (const k of Object.keys(v as Record<string, unknown>)) deepFreeze((v as Record<string, unknown>)[k]); }
  return v;
}

function deriveStatus(opinion: LegalOpinion, hasVerifiedBinding: boolean, hasUsableCase: boolean, coverage: CoverageLevel): ReasonedStatus {
  if (!opinion.issue.domainInScope) return "out_of_scope";
  if (opinion.conflictingAuthorities.some((c) => c.kind === "conflicting_ruling" || c.kind === "overruled_precedent")) return "conflicting_authority";
  const satisfied = opinion.elements.filter((e) => e.status === "satisfied").length;
  const missing = opinion.missingFacts.length;
  if (!hasVerifiedBinding && !hasUsableCase) return "no_verified_authority";
  if (missing > 0 && satisfied === 0) return "needs_facts";
  if (coverage === "insufficient") return "insufficient_coverage";
  if (opinion.preliminaryConclusion.direction === "supports_position") return "answered";
  return "provisional";
}

function deriveCoverage(opinion: LegalOpinion): CoverageLevel {
  const legOk = opinion.applicableLegislation.some((a) => a.verification === "verified");
  const anySource = opinion.applicableLegislation.length > 0 || opinion.applicableCaseLaw.length > 0;
  const missing = opinion.missingFacts.length;
  if (!anySource) return "insufficient";
  if (legOk && missing === 0) return "substantial"; // corpus is limited — never "complete"
  if (legOk) return "partial";
  return "insufficient";
}

function toFactView(id: string, labelHe: string, statementHe: string, effectHe: string): FactView {
  return { id, labelHe, statementHe, effectHe };
}

export interface ComposeReasonedParams {
  readonly question: string;
  readonly contextKind: ContextKind;
  readonly matterId: string | null;
  readonly opinion: LegalOpinion;
  readonly research: LegalResearchResult;
  readonly prose: ReasonedProse;
  readonly provider: { readonly id: string; readonly available: boolean; readonly usedFallback: boolean; readonly rejected: boolean };
  readonly nowISO: string;
}

export function composeReasonedResponse(p: ComposeReasonedParams): ReasonedDinoResponse {
  const o = p.opinion;
  const r = p.research;
  const allSources: CanonicalSource[] = [...r.matchedLegislation, ...r.matchedCases];
  const verifiedIds = verifiedIdSet(allSources);
  const hasVerifiedBinding = o.bindingAuthorities.some((a) => a.kind === "legislation" && a.verification === "verified" && a.usableForClaim);
  const hasUsableCase = o.applicableCaseLaw.some((a) => a.usableForClaim);
  const coverageLevel = deriveCoverage(o);
  const status = deriveStatus(o, hasVerifiedBinding, hasUsableCase, coverageLevel);

  const legislationCitations: CitationView[] = r.matchedLegislation.map(toCitationView);
  const caseBinding: CitationView[] = r.matchedCases.filter((s) => s.bindingClass === "binding").map(toCitationView);
  const casePersuasive: CitationView[] = r.matchedCases.filter((s) => s.bindingClass !== "binding").map(toCitationView);
  const { verified, discoveryOnly } = splitCitations(allSources);

  const opposingArgument: OpposingArgumentView[] = [...o.challenges]
    .sort((a, b) => rankDisp(a.disposition) - rankDisp(b.disposition))
    .map((c) => ({ category: c.category, categoryLabelHe: CAT_LABEL[c.category] ?? c.category, argumentHe: c.argumentHe, disposition: c.disposition, dispositionLabelHe: DISPOSITION_LABEL[c.disposition] ?? c.disposition, effectHe: c.effectHe }));

  const legalRisks: RiskView[] = o.legalRisks.map((x) => ({ severity: x.severity, severityLabelHe: SEVERITY_LABEL[x.severity], statementHe: x.statementHe, basisHe: x.basisHe }));
  const practicalRisks: RiskView[] = o.practicalRisks.map((x) => ({ severity: x.severity, severityLabelHe: SEVERITY_LABEL[x.severity], statementHe: x.statementHe, basisHe: x.basisHe }));

  const missingFacts: FollowUpView[] = o.requiredClarifications.filter((c) => c.blocking).map((c) => ({ code: c.code, questionHe: c.questionHe, whyHe: c.whyHe }));
  const suggestedFollowUps: FollowUpView[] = [
    ...o.requiredClarifications.filter((c) => !c.blocking).map((c) => ({ code: c.code, questionHe: c.questionHe, whyHe: c.whyHe })),
    ...r.recommendedFollowUps.map((f) => ({ code: f.code, questionHe: f.queryHe, whyHe: f.reasonHe })),
  ];

  const legSearches: ResearchTraceSearch[] = r.executedSearches.filter((e) => e.sourceKind === "legislation").map((e) => ({ sourceKind: e.sourceKind, available: e.available, matchedCount: e.matchedCount, notesHe: e.notesHe }));
  const caseSearches: ResearchTraceSearch[] = r.executedSearches.filter((e) => e.sourceKind === "case_law").map((e) => ({ sourceKind: e.sourceKind, available: e.available, matchedCount: e.matchedCount, notesHe: e.notesHe }));
  const filtersHe: string[] = [];
  for (const e of r.executedSearches) { const f = e.plan.filters; if (f.authorityPreference) filtersHe.push(`עדיפות אסמכתה: ${f.authorityPreference}`); if (f.courtLevels.length) filtersHe.push(`ערכאות: ${f.courtLevels.join(", ")}`); }

  const established: FactView[] = o.establishedFacts.map((f) => toFactView(f.id, o.elements.find((e) => e.factId === f.id)?.labelHe ?? f.factKey, f.statementHe, "משמש לביסוס הרכיב."));
  const alleged: FactView[] = o.allegedFacts.map((f) => toFactView(f.id, o.elements.find((e) => e.factId === f.id)?.labelHe ?? f.factKey, f.statementHe, "טענה — טעונה הוכחה; אינה מבססת מסקנה."));
  const disputed: FactView[] = o.disputedFacts.map((f) => toFactView(f.id, o.elements.find((e) => e.factId === f.id)?.labelHe ?? f.factKey, f.statementHe, "שנוי במחלוקת — מחליש את המסקנה."));
  const elementFindings: ElementFinding[] = o.elements.map((e) => ({ labelHe: e.labelHe, status: e.status, statusLabelHe: ELEMENT_STATUS_LABEL[e.status], noteHe: e.noteHe }));

  const response: ReasonedDinoResponse = {
    meta: { version: REASONED_DINO_VERSION, engine: "reasoned-dino", generatedAtISO: p.nowISO },
    status,
    contextKind: p.contextKind,
    matterId: p.matterId,
    question: p.question,
    bottomLine: { statementHe: status === "out_of_scope" ? OUT_OF_SCOPE_BOTTOM_LINE_HE : p.prose.bottomLineHe, direction: o.preliminaryConclusion.direction, isProvisional: o.preliminaryConclusion.isProvisional, statusLabelHe: STATUS_LABEL[status] },
    legalIssue: { statementHe: o.issue.issueStatementHe, issueType: o.issue.issueType, procedureTitleHe: o.issue.procedureTitleHe },
    applicationToMatter: {
      hasMatter: p.contextKind === "matter",
      summaryHe: p.prose.applicationToMatterHe,
      established, disputed, alleged,
      missing: o.missingFacts.map((m) => ({ labelHe: m.labelHe, whyRequiredHe: m.whyRequiredHe })),
      elementFindings,
    },
    governingLaw: {
      legislation: legislationCitations,
      hierarchyHe: o.authorityHierarchyHe,
      statutoryExceptionsHe: o.challenges.filter((c) => c.category === "statutory_exception").map((c) => c.argumentHe),
      elementsHe: o.elements.map((e) => e.labelHe),
    },
    caseLaw: { binding: caseBinding, persuasive: casePersuasive, contraryHe: o.conflictingAuthorities.map((c) => c.descriptionHe), jurisprudenceHe: o.jurisprudence.reasonHe },
    opposingArgument,
    riskAssessment: { legal: legalRisks, practical: practicalRisks, assumptionsHe: o.assumptions.map((a) => a.statementHe) },
    uncertaintiesHe: [...o.unsupportedStatements.map((u) => `${u.statementHe}: ${u.reasonHe}`), o.confidence.scaleHe],
    missingFacts,
    confidence: { level: o.confidence.level, labelHe: CONF_LABEL[o.confidence.level], score: o.confidence.score, reasonsHe: o.confidence.factorsHe, scaleHe: o.confidence.scaleHe },
    coverage: { level: coverageLevel, labelHe: COVERAGE_LABEL[coverageLevel], overall: r.coverage.overall, searchedHe: r.executedSearches.map((e) => `${e.sourceKind === "legislation" ? "חקיקה" : "פסיקה"}: ${e.matchedCount} התאמות`), uncoveredHe: [...r.missingInformation.map((m) => m.labelHe), ...(hasUsableCase ? [] : ["פסיקה מאומתת"])] },
    citations: { verified, discoveryOnly },
    claims: buildClaims(o, verifiedIds),
    researchTrace: {
      domainHe: r.domain.labelHe,
      concepts: r.entities.concepts,
      legislationSearches: legSearches,
      caseLawSearches: caseSearches,
      filtersHe: [...new Set(filtersHe)],
      sourcesConsidered: r.executedSearches.reduce((n, e) => n + e.matchedCount, 0),
      conflicts: r.conflicts.map((c) => c.descriptionHe),
      recommendedFollowUpsHe: r.recommendedFollowUps.map((f) => f.queryHe),
    },
    suggestedFollowUps,
    provider: {
      id: p.provider.id, available: p.provider.available,
      renderMode: p.provider.usedFallback ? "deterministic_structured" : "model_phrased",
      usedFallback: p.provider.usedFallback, rejectedProviderOutput: p.provider.rejected,
      labelHe: p.provider.usedFallback ? "מענה מובנה המבוסס על מקורות — ללא ניסוח מודל." : "נוסח בסיוע מודל, מבוסס על חוות הדעת המובנית.",
    },
    trustStatementsHe: [
      "דינו אינו מחולל ציטוטים.",
      "כל אסמכתה נבחרת אך ורק מתוך רשומות מקור שאותרו.",
      "כל ציטוט מוצג מאומת מול תוצאת המחקר.",
      "חומר שאינו מאומת אינו יכול לבסס מסקנה משפטית.",
    ],
    prose: {
      bottomLineHe: p.prose.bottomLineHe, applicationToMatterHe: p.prose.applicationToMatterHe,
      governingLawHe: p.prose.governingLawHe, caseLawHe: p.prose.caseLawHe,
      opposingArgumentHe: p.prose.opposingArgumentHe, risksHe: p.prose.risksHe,
    },
  };
  return deepFreeze(response);
}

function rankDisp(d: string): number {
  return d === "accepted" ? 0 : d === "unresolved" ? 1 : 2;
}
