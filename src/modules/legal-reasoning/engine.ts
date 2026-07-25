/**
 * Legal Reasoning Engine (Capability 4, Slice 4.0.0). PURE + DETERMINISTIC.
 *
 * `buildLegalOpinion(input)` performs element-by-element (IRAC) legal analysis
 * over the matter's facts and the verified research, classifies the authorities,
 * assesses legal & practical risk, states its assumptions, ACTIVELY CHALLENGES
 * its own conclusion (contrary authority, alternative interpretation, procedural
 * obstacles, jurisdictional limits, statutory exceptions, factual weaknesses),
 * and only then reaches a PROVISIONAL, fully-traceable conclusion. Every
 * statement references supporting authority — or is listed as unsupported. It
 * never writes prose and never concludes on insufficient support. Deep-frozen.
 */
import type { FactRecord as MiFact } from "../matter/intelligence/types.ts";
import type { CanonicalSource } from "../legal-research/types.ts";
import type {
  LegalOpinion, LegalReasoningInput, Issue, IssueType, FactRef, MissingElement,
  ElementAnalysis, ElementStatus, AuthorityRef, JurisprudenceAssessment, LegalRisk,
  Assumption, RequiredClarification, Challenge, PreliminaryConclusion, ConclusionDirection,
  OpinionConfidence, OpinionConfidenceLevel, SupportMapping, UnsupportedStatement, ConflictRef,
} from "./types.ts";
import { resolveGoverningProcedure, FACT_KEY_HE } from "./catalog.ts";

export const LEGAL_REASONING_VERSION = "legal-reasoning-v1";

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const k of Object.keys(value as Record<string, unknown>)) deepFreeze((value as Record<string, unknown>)[k]);
  }
  return value;
}

function toAuthorityRef(s: CanonicalSource): AuthorityRef {
  return {
    recordId: s.recordId, kind: s.sourceKind === "legislation" ? "legislation" : "case_law",
    citationHe: s.citationHe, sectionHe: s.sectionHe, bindingClass: s.bindingClass,
    verification: s.verification, usableForClaim: s.usableForClaim, url: s.url,
  };
}

function toFactRef(f: MiFact): FactRef {
  return { id: f.id, factKey: f.factKey, statementHe: f.statementHe, epistemic: f.epistemic, established: f.established, sourceHe: f.sourceHe };
}

const ELEMENT_STATUS_HE: Record<ElementStatus, string> = {
  satisfied: "מבוסס על עובדה מאומתת",
  contested: "נסמך על עובדה שאינה מבוססת (טענה/מחלוקת)",
  missing: "לא הוזנה עובדה לרכיב זה",
};

export function buildLegalOpinion(input: LegalReasoningInput): LegalOpinion {
  const mi = input.matterIntelligence ?? null;
  const cc = input.conversationContext;
  const lr = input.legalResearch;
  const nowISO = input.nowISO ?? mi?.meta.generatedAtISO ?? lr.meta.generatedAtISO;

  const topics = lr.entities.topics;
  const procedureType = mi?.identity.procedureType ?? null;
  const gov = resolveGoverningProcedure(procedureType, topics);

  /* ---- authorities ---------------------------------------------------- */
  const applicableLegislation = lr.matchedLegislation.map(toAuthorityRef);
  const applicableCaseLaw = lr.matchedCases.map(toAuthorityRef);
  const bindingAuthorities = [...applicableLegislation, ...applicableCaseLaw].filter((a) => a.bindingClass === "binding");
  const persuasiveAuthorities = [...applicableLegislation, ...applicableCaseLaw].filter((a) => a.bindingClass !== "binding");
  const conflictingAuthorities: ConflictRef[] = lr.conflicts.map((c) => ({ kind: c.kind, severity: c.severity, descriptionHe: c.descriptionHe, recordIds: c.recordIds }));
  const governingAuthorityIds = applicableLegislation
    .filter((a) => gov.governingRefIds.includes(a.recordId))
    .map((a) => a.recordId);
  const hasVerifiedBinding = applicableLegislation.some((a) => a.bindingClass === "binding" && a.usableForClaim);

  const authorityHierarchyHe = bindingAuthorities.some((a) => a.kind === "legislation")
    ? "החקיקה המחייבת גוברת; הפסיקה מפרשת את החוק וכפופה לו, ואין להעדיף הלכה על פני הוראת חוק מפורשת."
    : "לא אותרה חקיקה מחייבת ישירה — יש לאתר את מקור החובה בטרם הסקת מסקנה.";

  /* ---- jurisprudence (settled / divided / …) -------------------------- */
  const usableCases = applicableCaseLaw.filter((a) => a.usableForClaim);
  const hasRulingConflict = conflictingAuthorities.some((c) => c.kind === "conflicting_ruling" || c.kind === "overruled_precedent");
  let jurisprudence: JurisprudenceAssessment;
  if (applicableCaseLaw.length === 0) jurisprudence = { state: "undetermined", reasonHe: "לא אותרה פסיקה רלוונטית בקורפוס." };
  else if (hasRulingConflict) jurisprudence = { state: "divided", reasonHe: "אותרה פסיקה סותרת/מוגבלת — ההלכה אינה מיושבת." };
  else if (usableCases.length === 0) jurisprudence = { state: "undetermined", reasonHe: "הפסיקה שאותרה טעונה אימות — לא ניתן לקבוע אם ההלכה מיושבת." };
  else if (usableCases.length >= 2) jurisprudence = { state: "settled", reasonHe: "מספר פסקי דין מאומתים תואמים." };
  else jurisprudence = { state: "unsettled", reasonHe: "פסק דין מאומת יחיד — אין לראות בכך הלכה מיושבת." };

  /* ---- facts + element (IRAC) analysis -------------------------------- */
  const allFacts: FactRef[] = mi ? mi.facts.map(toFactRef) : [];
  const factByKey = new Map<string, FactRef>();
  for (const f of allFacts) if (!factByKey.has(f.factKey)) factByKey.set(f.factKey, f);

  const elementKeys = gov.requiredElements.map((e) => e.key);
  const relevantFacts = elementKeys.length ? allFacts.filter((f) => elementKeys.includes(f.factKey)) : allFacts;
  const establishedFacts = relevantFacts.filter((f) => f.epistemic === "established");
  const allegedFacts = relevantFacts.filter((f) => f.epistemic === "alleged");
  const disputedFacts = relevantFacts.filter((f) => f.epistemic === "disputed" || f.epistemic === "unknown");

  const elements: ElementAnalysis[] = gov.requiredElements.map((el) => {
    const fact = factByKey.get(el.key) ?? null;
    let status: ElementStatus;
    if (!fact) status = "missing";
    else if (fact.epistemic === "established") status = "satisfied";
    else status = "contested";
    return {
      key: el.key, labelHe: el.labelHe, status, factId: fact?.id ?? null, epistemic: fact?.epistemic ?? null,
      authorityIds: status === "missing" ? [] : governingAuthorityIds,
      noteHe: ELEMENT_STATUS_HE[status],
    };
  });

  const missingFacts: MissingElement[] = gov.requiredElements
    .filter((el) => !factByKey.has(el.key))
    .map((el) => ({ key: el.key, labelHe: el.labelHe, whyRequiredHe: el.whyRequiredHe }));

  const satisfied = elements.filter((e) => e.status === "satisfied");
  const contested = elements.filter((e) => e.status === "contested");
  const missing = elements.filter((e) => e.status === "missing");

  /* ---- risks ---------------------------------------------------------- */
  const legalRisks: LegalRisk[] = [];
  gov.legalRisksHe.forEach((r, i) => legalRisks.push({ code: `PROC_RISK_${i + 1}`, severity: "medium", statementHe: r, basisHe: `סיכון על פי מסלול ההליך ${gov.titleHe ?? ""}`.trim(), refs: governingAuthorityIds }));
  for (const el of contested) legalRisks.push({ code: `CONTESTED_${el.key}`, severity: "high", statementHe: `רכיב "${el.labelHe}" נשען על עובדה שאינה מבוססת — סיכון הוכחתי.`, basisHe: "נדרשת הוכחה של הרכיב", refs: el.authorityIds });
  for (const el of missing) legalRisks.push({ code: `MISSING_${el.key}`, severity: "high", statementHe: `רכיב "${el.labelHe}" חסר — לא ניתן לבסס את העילה ללא השלמתו.`, basisHe: "רכיב הכרחי בעילה", refs: [] });

  const practicalRisks: LegalRisk[] = [];
  if (mi) {
    for (const issue of mi.outstandingIssues) {
      if (["OVERDUE_STRICT_DEADLINE", "OVERDUE_DEADLINE", "UNSCHEDULED_STRICT_DEADLINE", "MISSING_MANDATORY_EVIDENCE", "DORMANT_MATTER"].includes(issue.code)) {
        const severity = issue.severity === "critical" ? "critical" : issue.severity === "warning" ? "high" : "medium";
        practicalRisks.push({ code: issue.code, severity, statementHe: issue.labelHe + (issue.detailHe ? ` — ${issue.detailHe}` : ""), basisHe: "מצב התיק (Matter Intelligence)", refs: issue.relatedIds });
      }
    }
  }

  /* ---- assumptions ---------------------------------------------------- */
  const assumptions: Assumption[] = [];
  assumptions.push({ code: "JURISDICTION", statementHe: "ההערכה מבוססת על הדין הישראלי בתחום דיני העבודה ועל סמכות בית הדין לעבודה.", materiality: "medium", basisHe: "תחום הכיסוי של המערכת" });
  if (!factByKey.get("employment_relationship") || factByKey.get("employment_relationship")?.epistemic !== "established") {
    assumptions.push({ code: "EMPLOYMENT_RELATIONSHIP", statementHe: "מונח שמתקיימים יחסי עובד–מעסיק; הנחה זו טעונה אימות.", materiality: "high", basisHe: "רכיב יסוד שלא בוסס" });
  }
  for (const f of allegedFacts) assumptions.push({ code: `ALLEGED_${f.factKey}`, statementHe: `בהיעדר אימות, מונחת אמיתות הטענה בנוגע ל"${FACT_KEY_HE[f.factKey] ?? f.factKey}"; טעונה הוכחה.`, materiality: "high", basisHe: "עובדה במעמד טענה בלבד" });
  if (applicableLegislation.some((a) => a.verification !== "verified")) assumptions.push({ code: "STATUTE_CURRENCY", statementHe: "מונח שנוסח החקיקה שאותר עדכני; טעון אימות מול הנוסח המחייב.", materiality: "medium", basisHe: "חקיקה שאותרה טעונת אימות" });

  /* ---- adversarial self-challenge ------------------------------------ */
  const challenges: Challenge[] = [];
  // statutory exceptions
  for (const ex of gov.statutoryExceptionsHe) {
    challenges.push({ category: "statutory_exception", argumentHe: `ייתכן שחל חריג: ${ex}`, basisRefs: governingAuthorityIds, disposition: "unresolved", effectHe: "לא ניתן לשלול על סמך הרשומה הנוכחית — מחליש את המסקנה." });
  }
  // procedural obstacles (from deadlines)
  const overdueStrict = mi?.deadlines.some((d) => d.bucket === "overdue" && d.strict) ?? false;
  const unscheduledStrict = mi?.deadlines.some((d) => d.bucket === "unscheduled" && d.strict) ?? false;
  if (overdueStrict) challenges.push({ category: "procedural_obstacle", argumentHe: "מועד מחייב חלף — עלול לחסום את ההליך.", basisRefs: [], disposition: "accepted", effectHe: "מהווה מכשול דיוני ממשי — עלול לחסום את התביעה." });
  else if (unscheduledStrict) challenges.push({ category: "procedural_obstacle", argumentHe: "קיים מועד מחייב שתאריכו טרם נקבע.", basisRefs: [], disposition: "unresolved", effectHe: "יש לקבוע ולוודא את המועד בטרם הסתמכות." });
  else challenges.push({ category: "procedural_obstacle", argumentHe: "בחינת מניעות דיוניות (התיישנות/מועדים).", basisRefs: [], disposition: "rebutted", effectHe: "לא אותרה מניעה דיונית ברשומה — בכפוף לאימות מועדים." });
  // jurisdictional limitation
  if (mi?.identity.forumHe) challenges.push({ category: "jurisdictional_limitation", argumentHe: `יש לוודא סמכות עניינית ומקומית (${mi.identity.forumHe}).`, basisRefs: [], disposition: "rebutted", effectHe: "הפורום שצוין הולם את מסלול ההליך — בכפוף לאימות." });
  else challenges.push({ category: "jurisdictional_limitation", argumentHe: "לא צוין פורום — יש לוודא סמכות בית הדין.", basisRefs: [], disposition: "unresolved", effectHe: "טרם נקבע פורום — מחליש את הוודאות הדיונית." });
  // contrary authority
  if (hasRulingConflict) {
    for (const c of conflictingAuthorities.filter((x) => x.kind === "conflicting_ruling" || x.kind === "overruled_precedent")) {
      challenges.push({ category: "contrary_authority", argumentHe: c.descriptionHe, basisRefs: c.recordIds, disposition: "accepted", effectHe: "קיימת סתירה בפסיקה — מונע מסקנה חד-משמעית." });
    }
  } else {
    challenges.push({ category: "contrary_authority", argumentHe: "לא אותרה פסיקה סותרת בקורפוס — אך הקורפוס חלקי ואינו ממצה.", basisRefs: [], disposition: "unresolved", effectHe: "היעדר סתירה אינו מבוסס דיו נוכח כיסוי חלקי." });
  }
  // alternative interpretation
  if (applicableLegislation.some((a) => a.verification !== "verified") || jurisprudence.state === "undetermined" || jurisprudence.state === "divided") {
    challenges.push({ category: "alternative_interpretation", argumentHe: "ייתכנו פרשנויות חלופיות לסעיפים; הפסיקה המפרשת לא אומתה/מיושבת.", basisRefs: governingAuthorityIds, disposition: "unresolved", effectHe: "פרשנות אינה מיושבת — המסקנה מותנית." });
  }
  // factual weaknesses
  for (const el of [...contested, ...missing]) {
    challenges.push({ category: "factual_weakness", argumentHe: `העילה נשענת על רכיב שאינו מבוסס: "${el.labelHe}".`, basisRefs: el.authorityIds, disposition: "accepted", effectHe: "חולשה עובדתית — המסקנה מותנית בהשלמת/הוכחת הרכיב." });
  }
  const acceptedAdverse = challenges.filter((c) => c.disposition === "accepted");
  const unresolvedChallenges = challenges.filter((c) => c.disposition === "unresolved");

  /* ---- required clarifications --------------------------------------- */
  const requiredClarifications: RequiredClarification[] = [];
  for (const c of cc.clarificationQuestions) requiredClarifications.push({ code: c.code, questionHe: c.questionHe, whyHe: c.reasonHe, blocking: c.blocking });
  for (const el of missing) requiredClarifications.push({ code: `NEED_${el.key}`, questionHe: `יש לברר ולתעד: ${el.labelHe}.`, whyHe: "רכיב עובדתי הכרחי לעילה", blocking: true });
  for (const el of contested) requiredClarifications.push({ code: `VERIFY_${el.key}`, questionHe: `יש לאמת/להוכיח: ${el.labelHe} (כיום במעמד טענה/מחלוקת).`, whyHe: "רכיב שאינו מבוסס", blocking: false });

  /* ---- answerability -------------------------------------------------- */
  const canAnswerNow = lr.domain.inScope && missing.length === 0 && !overdueStrict && hasVerifiedBinding;
  const answerReason = !lr.domain.inScope
    ? "השאלה מחוץ לתחום הכיסוי — לא ניתן להסיק."
    : missing.length > 0
      ? "חסרים רכיבים עובדתיים הכרחיים — ניתן לתת חוות דעת ראשונית ומותנית בלבד."
      : !hasVerifiedBinding
        ? "לא אותרה חקיקה מחייבת מאומתת — המסקנה מותנית."
        : overdueStrict
          ? "קיים מכשול דיוני (מועד שחלף) — נדרשת בחינה בטרם מסקנה."
          : "ניתן לגבש חוות דעת ראשונית על סמך הרשומה.";

  /* ---- preliminary conclusion ---------------------------------------- */
  let direction: ConclusionDirection;
  if (!lr.domain.inScope) direction = "cannot_conclude";
  else if (missing.length > 0 || !hasVerifiedBinding) direction = "cannot_conclude";
  else if (contested.length > 0 || acceptedAdverse.length > 0) direction = "indeterminate";
  else direction = "supports_position";

  const reasoningHe: string[] = [
    `סוגיה: ${gov.titleHe ?? lr.domain.labelHe}.`,
    `רכיבי העילה: ${satisfied.length} מבוססים, ${contested.length} שנויים/טענה, ${missing.length} חסרים.`,
    ...elements.map((e) => `• ${e.labelHe}: ${e.noteHe}.`),
    hasVerifiedBinding ? "קיים בסיס חקיקתי מחייב ומאומת." : "אין בסיס חקיקתי מחייב מאומת — המסקנה מותנית.",
    `יושמה בחינה נגדית: ${acceptedAdverse.length} טענות נגד התקבלו, ${unresolvedChallenges.length} נותרו פתוחות.`,
  ];
  const conclusionStatementHe = direction === "cannot_conclude"
    ? "לא ניתן להסיק מסקנה משפטית על סמך הרשומה הנוכחית — חסרים רכיבים ו/או בסיס מאומת. חוות דעת ראשונית ומותנית בלבד."
    : direction === "indeterminate"
      ? "חוות דעת ראשונית ומותנית: חלק מרכיבי העילה מבוססים, אך רכיבים שנויים/טענות ובחינה נגדית פתוחה מונעים מסקנה מחייבת. אין להסתמך ללא השלמת עובדות ואימות פסיקה."
      : "חוות דעת ראשונית: רכיבי העילה מבוססים על בסיס חקיקתי מחייב, בכפוף לאימות הפסיקה המפרשת. אינה תחליף לבדיקת עורך דין.";

  const preliminaryConclusion: PreliminaryConclusion = {
    direction, statementHe: conclusionStatementHe, isProvisional: true, reasoningHe,
    supportingAuthorityIds: direction === "cannot_conclude" ? [] : governingAuthorityIds,
  };

  /* ---- confidence (anchored to an explicit scale) -------------------- */
  const essentialTotal = elements.length || 1;
  const factorsHe: string[] = [
    hasVerifiedBinding ? "בסיס חקיקתי מחייב ומאומת: קיים" : "בסיס חקיקתי מחייב מאומת: חסר",
    `ודאות עובדתית: ${satisfied.length}/${essentialTotal} רכיבים מבוססים`,
    `פסיקה: ${jurisprudence.state === "settled" ? "מיושבת" : jurisprudence.state === "divided" ? "חלוקה" : "לא נקבעה/טעונת אימות"}`,
    `בחינה נגדית: ${acceptedAdverse.length} טענות נגד התקבלו`,
  ];
  let level: OpinionConfidenceLevel;
  if (!lr.domain.inScope) level = "none";
  else if (!hasVerifiedBinding || missing.length > 0 || acceptedAdverse.length > 0) level = "low";
  else if (contested.length === 0 && jurisprudence.state !== "divided") level = "moderate";
  else level = "low";
  const score = level === "none" ? 0.1 : level === "low" ? 0.35 : 0.6;
  const scaleHe = level === "moderate"
    ? "בינוני = בסיס חקיקתי מחייב ומאומת וכל הרכיבים העובדתיים מבוססים, אך הפסיקה המפרשת טעונת אימות — אינו ודאות."
    : level === "low"
      ? "נמוך = חסרים רכיבים עובדתיים ו/או בסיס מאומת ו/או קיימות טענות נגד שהתקבלו — חוות דעת ראשונית בלבד."
      : "אין בסיס להערכת ביטחון בתחום זה.";
  const confidence: OpinionConfidence = { level, score, factorsHe, scaleHe };

  /* ---- supporting authorities + unsupported statements --------------- */
  const supportingAuthorities: SupportMapping[] = [
    { claim: "מסקנה מקדמית", authorityIds: preliminaryConclusion.supportingAuthorityIds, supported: preliminaryConclusion.supportingAuthorityIds.length > 0 && hasVerifiedBinding },
    ...elements.map((e) => ({ claim: e.labelHe, authorityIds: e.authorityIds, supported: e.authorityIds.length > 0 })),
  ];

  const unsupportedStatements: UnsupportedStatement[] = [];
  for (const e of elements) {
    if (e.status !== "missing" && e.authorityIds.length === 0) unsupportedStatements.push({ statementHe: `רכיב "${e.labelHe}"`, reasonHe: "אין אסמכתה משפטית מאומתת התומכת ברכיב." });
  }
  if (applicableLegislation.some((a) => a.verification !== "verified")) unsupportedStatements.push({ statementHe: "הבסיס החקיקתי", reasonHe: "חלק מאזכורי החקיקה טעונים אימות מול הנוסח המחייב." });
  if (applicableCaseLaw.length > 0 && usableCases.length === 0) unsupportedStatements.push({ statementHe: "ההסתמכות על הפסיקה שאותרה", reasonHe: "הפסיקה לגילוי בלבד — טעונה אימות מספר הליך; אין להסתמך עליה כהלכה." });

  /* ---- issue --------------------------------------------------------- */
  const issueType: IssueType = !lr.domain.inScope ? "unclear"
    : (cc.intent === "prepare_for_hearing" || cc.intent === "explain_deadlines" || lr.entities.courts.length > 0) ? "procedural"
      : cc.intent === "draft_request" ? "mixed" : "substantive";
  const issue: Issue = {
    questionHe: cc.userMessage,
    issueStatementHe: `הסוגיה: ${gov.titleHe ?? lr.domain.labelHe} — ${cc.userMessage}`,
    issueType, topic: topics[0] ?? null, procedureType: gov.procedureType,
    procedureTitleHe: gov.titleHe, domainInScope: lr.domain.inScope,
  };

  const opinion: LegalOpinion = {
    meta: { version: LEGAL_REASONING_VERSION, engine: "legal-reasoning-engine", generatedAtISO: nowISO },
    issue,
    relevantFacts, establishedFacts, allegedFacts, disputedFacts, missingFacts,
    elements,
    applicableLegislation, applicableCaseLaw, conflictingAuthorities, bindingAuthorities, persuasiveAuthorities,
    authorityHierarchyHe, jurisprudence,
    requiredClarifications, answerability: { canAnswerNow, reasonHe: answerReason },
    legalRisks, practicalRisks, assumptions, challenges,
    preliminaryConclusion, confidence, supportingAuthorities, unsupportedStatements,
  };
  return deepFreeze(opinion);
}
