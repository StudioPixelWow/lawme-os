/**
 * Legal Research Orchestrator (Capability 3, Slice 3.1.0). DETERMINISTIC. No AI.
 *
 * The verified legal-research pipeline: classify domain → extract entities →
 * generate deterministic search plans → execute across adapters in parallel →
 * normalize + dedup → rank → detect conflicts → score confidence/coverage →
 * detect missing information + recommend follow-ups → produce ONE immutable
 * `LegalResearchResult`. It NEVER writes a legal conclusion. A future model
 * adapter consumes MatterIntelligence + this object and never queries a database.
 */
import { evaluateTriad, TOPIC_LEGISLATION } from "../legal-knowledge/triad/coverage.ts";
import type { EmploymentProcedureType } from "../legal-knowledge/procedure/types.ts";
import { classifyLegalDomain } from "./domain.ts";
import { extractLegalEntities } from "./entities.ts";
import { buildSearchPlans } from "./plan.ts";
import { rankSources } from "./rank.ts";
import { detectConflicts } from "./conflicts.ts";
import { DEFAULT_ADAPTERS } from "./adapters/index.ts";
import type {
  LegalResearchRequest, LegalResearchResult, KnowledgeSourceAdapter, CanonicalSource,
  ExecutedSearch, ResearchCoverage, PillarCoverage, ResearchConfidence, ConfidenceLevel,
  MissingInformation, RecommendedFollowUp, VerifiedCitation, SourceMetadata, Conflict,
  LegalDomainClassification, ExtractedEntities,
} from "./types.ts";

export const LEGAL_RESEARCH_VERSION = "legal-research-v1";

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value as Record<string, unknown>)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

function dedupe(sources: readonly CanonicalSource[]): CanonicalSource[] {
  const seen = new Set<string>();
  const out: CanonicalSource[] = [];
  for (const s of sources) {
    const key = `${s.sourceKind}:${s.recordId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

function buildCoverage(
  entities: ExtractedEntities,
  request: LegalResearchRequest,
  legislation: CanonicalSource[],
  cases: CanonicalSource[],
): ResearchCoverage {
  const primaryTopic = entities.topics[0] ?? null;
  const legRefIds = legislation.map((s) => s.recordId).filter((id) => id.startsWith("E3B"));

  const triad = primaryTopic
    ? evaluateTriad({
        topic: primaryTopic,
        availableLegislationRefIds: legRefIds,
        procedureType: (request.procedureType as EmploymentProcedureType | undefined) ?? null,
        factsConfirmed: request.factsConfirmed ?? false,
      })
    : null;

  const legislationCov: PillarCoverage = {
    available: legislation.length > 0,
    found: legislation.length,
    usable: legislation.filter((s) => s.usableForClaim).length,
    gapsHe: legislation.length === 0 ? ["לא אותרה חקיקה מחייבת לנושא"] : [],
  };
  const caseLawCov: PillarCoverage = {
    available: cases.length > 0,
    found: cases.length,
    usable: cases.filter((s) => s.usableForClaim).length,
    gapsHe: cases.length === 0 ? ["לא אותרה פסיקה לנושא"] : cases.every((s) => !s.usableForClaim) ? ["הפסיקה שאותרה טעונה אימות"] : [],
  };
  const procedureCov: PillarCoverage = {
    available: triad ? triad.procedure.present : Boolean(request.procedureType),
    found: triad ? triad.procedure.countFound : (request.procedureType ? 1 : 0),
    usable: triad && triad.procedure.usable ? triad.procedure.countFound : 0,
    gapsHe: triad ? triad.procedure.missingHe : [],
  };

  const overall = Math.round(((legislationCov.available ? 0.4 : 0) + (caseLawCov.available ? 0.3 : 0) + (procedureCov.available ? 0.3 : 0)) * 100) / 100;

  return {
    primaryTopic,
    legislation: legislationCov,
    caseLaw: caseLawCov,
    procedure: procedureCov,
    triadState: triad ? triad.state : "insufficient_facts",
    overall,
    noticeHe: triad ? triad.nextResearchActionsHe.join(" · ") || "כיסוי בסיסי אותר" : "לא זוהה נושא מרכזי לחישוב כיסוי",
  };
}

function computeConfidence(
  domain: LegalDomainClassification,
  sources: CanonicalSource[],
  legislation: CanonicalSource[],
  conflicts: Conflict[],
): ResearchConfidence {
  const reasonsHe: string[] = [];
  if (!domain.inScope) {
    return { level: "none", score: 0.1, reasonsHe: ["התחום אינו מכוסה בקורפוס הנוכחי"] };
  }
  if (sources.length === 0) {
    return { level: "none", score: 0.15, reasonsHe: ["לא אותרו מקורות תואמים"] };
  }
  const usable = sources.filter((s) => s.usableForClaim).length;
  const hasBindingLeg = legislation.some((s) => s.usableForClaim && s.bindingClass === "binding");
  const critical = conflicts.some((c) => c.severity === "critical");

  let level: ConfidenceLevel;
  let score: number;
  if (usable === 0) { level = "low"; score = 0.35; reasonsHe.push("כל המקורות טעונים אימות"); }
  else if (hasBindingLeg && !critical) { level = "moderate"; score = 0.65; reasonsHe.push("אותרה חקיקה מחייבת עם קישור רשמי"); }
  else { level = "low"; score = 0.4; reasonsHe.push("אותרו מקורות חלקיים"); }

  if (critical) { level = "low"; score = Math.min(score, 0.3); reasonsHe.push("קיים קונפליקט קריטי (הלכה שבוטלה/חקיקה שאינה בתוקף)"); }
  if (sources.some((s) => s.sourceKind === "case_law")) reasonsHe.push("הסתמכות על פסיקה מחייבת אישור עורך דין");
  return { level, score, reasonsHe };
}

function buildMissingInfo(entities: ExtractedEntities, request: LegalResearchRequest, legislation: CanonicalSource[], cases: CanonicalSource[]): MissingInformation[] {
  const out: MissingInformation[] = [];
  if (entities.topics.length === 0) out.push({ code: "TOPIC_UNRESOLVED", labelHe: "נושא לא זוהה", detailHe: "לא זוהה נושא משפטי ברור מהשאלה" });
  if (legislation.length === 0) out.push({ code: "MISSING_LEGISLATION", labelHe: "חסרה חקיקה", detailHe: "לא אותרה חקיקה מחייבת לנושא" });
  if (cases.length === 0) out.push({ code: "NO_CASE_LAW", labelHe: "אין פסיקה", detailHe: "לא אותרה פסיקה תואמת בקורפוס" });
  else if (cases.every((s) => !s.usableForClaim)) out.push({ code: "CASE_LAW_UNVERIFIED", labelHe: "פסיקה טעונת אימות", detailHe: "יש לאמת מספרי הליך מול המקור הרשמי" });
  if (!(request.factsConfirmed ?? false)) out.push({ code: "FACTS_UNCONFIRMED", labelHe: "עובדות טרם אומתו", detailHe: "המחקר מתבסס על השאלה; יש לאמת את עובדות התיק" });
  return out;
}

function buildFollowUps(entities: ExtractedEntities, adapters: readonly KnowledgeSourceAdapter[], legislation: CanonicalSource[], cases: CanonicalSource[]): RecommendedFollowUp[] {
  const out: RecommendedFollowUp[] = [];
  if (cases.some((s) => !s.usableForClaim)) out.push({ code: "VERIFY_CASE_NUMBERS", sourceKind: "case_law", queryHe: "אימות מספרי הליך ותוקף ההלכה מול מאגר בתי המשפט", reasonHe: "פסיקת הקורפוס היא לגילוי בלבד" });
  if (legislation.some((s) => !s.usableForClaim)) out.push({ code: "VERIFY_STATUTE_CURRENCY", sourceKind: "legislation", queryHe: "אימות נוסח מעודכן ותוקף הסעיפים מול מאגר החקיקה", reasonHe: "חלק מאזכורי החקיקה טעונים אימות" });
  const hasRegulation = adapters.some((a) => a.kind === "regulation" && a.available);
  if (!hasRegulation) out.push({ code: "SEARCH_REGULATIONS", sourceKind: "regulation", queryHe: "חיפוש תקנות וצווי הרחבה רלוונטיים", reasonHe: "מנוע התקנות/צווי ההרחבה טרם חובר" });
  if (entities.topics.length === 0) out.push({ code: "REFINE_QUERY", sourceKind: "legislation", queryHe: "חידוד הנושא המשפטי בשאלה", reasonHe: "לא זוהה נושא ברור" });
  return out;
}

export async function runLegalResearch(
  request: LegalResearchRequest,
  adapters: readonly KnowledgeSourceAdapter[] = DEFAULT_ADAPTERS,
): Promise<LegalResearchResult> {
  const generatedAtISO = request.asOfISO ?? new Date().toISOString();

  // 1–2) domain + entities
  const domain = classifyLegalDomain(request.question, request.legalDomainHint ?? null);
  const entities = extractLegalEntities(request.question, request.procedureType ?? null);

  // 3) plans
  const plans = buildSearchPlans(entities, request, adapters);

  // 4) execute in parallel (5 = normalize is each adapter's responsibility)
  const executions = await Promise.all(plans.map(async (plan) => {
    const adapter = adapters.find((a) => a.id === plan.sourceId);
    if (!adapter || !adapter.available) {
      const executed: ExecutedSearch = { plan, sourceId: plan.sourceId, sourceKind: plan.sourceKind, available: false, matchedCount: 0, normalizedCount: 0, notesHe: ["מקור הידע אינו זמין עדיין"] };
      return { executed, sources: [] as CanonicalSource[] };
    }
    const r = await adapter.search(plan);
    const executed: ExecutedSearch = { plan, sourceId: r.sourceId, sourceKind: r.sourceKind, available: true, matchedCount: r.matchedCount, normalizedCount: r.sources.length, notesHe: r.notesHe };
    return { executed, sources: [...r.sources] };
  }));

  const executedSearches = executions.map((e) => e.executed);
  const allSources = dedupe(executions.flatMap((e) => e.sources));
  const matchedLegislation = allSources.filter((s) => s.sourceKind === "legislation");
  const matchedCases = allSources.filter((s) => s.sourceKind === "case_law");

  // 6–7) rank + conflicts
  const ranking = rankSources(allSources);
  const conflicts = detectConflicts(allSources);

  // coverage + confidence + gaps
  const coverage = buildCoverage(entities, request, matchedLegislation, matchedCases);
  const confidence = computeConfidence(domain, allSources, matchedLegislation, conflicts);
  const missingInformation = buildMissingInfo(entities, request, matchedLegislation, matchedCases);
  const recommendedFollowUps = buildFollowUps(entities, adapters, matchedLegislation, matchedCases);

  const verifiedCitations: VerifiedCitation[] = allSources
    .filter((s) => s.verification === "verified")
    .map((s) => ({ recordId: s.recordId, citationHe: s.citationHe, url: s.url, authorityLevel: s.authorityLevel, sectionHe: s.sectionHe }));

  const sourceMetadata: SourceMetadata[] = allSources.map((s) => ({
    sourceId: s.sourceId, recordId: s.recordId, sourceKind: s.sourceKind,
    verification: s.verification, url: s.url, publisherHe: s.publisherHe, provenanceHe: s.provenanceHe,
  }));

  // 8) assemble immutable result
  const result: LegalResearchResult = {
    meta: { version: LEGAL_RESEARCH_VERSION, engine: "legal-research-orchestrator", generatedAtISO },
    question: request.question,
    domain,
    entities,
    executedSearches,
    matchedLegislation,
    matchedCases,
    ranking,
    conflicts,
    confidence,
    coverage,
    missingInformation,
    recommendedFollowUps,
    verifiedCitations,
    sourceMetadata,
  };
  void TOPIC_LEGISLATION; // referenced for topic vocabulary alignment
  return deepFreeze(result);
}
