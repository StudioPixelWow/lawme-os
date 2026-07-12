/**
 * RELEVANCE GATE — LawME fails closed. (Founder mandate, 2026-07-12.)
 *
 * Purpose: prevent the "least-bad document" failure mode. Relative
 * normalization ranks results; it must NEVER decide whether an answer
 * exists. This gate evaluates ABSOLUTE signals that do not depend on the
 * best result in the current result set, and refuses to answer when the
 * evidence is not good enough:
 *   "לא נמצאו בקורפוס הנוכחי מקורות ברמת רלוונטיות מספקת לשאלה זו."
 *
 * Deterministic by design (no model in the loop, no network):
 * every signal is reproducible, decomposed and testable. When a real
 * embedding provider is approved it plugs into the SEMANTIC signal only;
 * this deterministic gate remains as fallback, safety layer and
 * regression baseline — real embeddings may improve retrieval but must
 * never remove the absolute gate.
 */
import { tokenize } from "../extraction/normalize-text.ts";
import { MockEmbeddingProvider, cosineSimilarity } from "../embeddings/mock-provider.ts";
import type { EmbeddingVector } from "../embeddings/types.ts";

/* ------------------------------------------------------------------ */
/* Domain profiles                                                     */
/* ------------------------------------------------------------------ */

export interface DomainProfile {
  key: string;
  labelHe: string;
  /** controlled legal vocabulary (reviewed, closed list) */
  vocabulary: string[];
  /** statute / instrument references typical of the domain */
  statutes: string[];
  /** institutional legal entities typical of the domain */
  entities: string[];
}

/** The ACTIVE corpus domain of the current POC. */
export const ACTIVE_DOMAIN = "employment";

export const DOMAIN_PROFILES: DomainProfile[] = [
  {
    key: "employment",
    labelHe: "דיני עבודה",
    vocabulary: [
      "פיטורים", "פיטורי", "פוטרה", "פוטר", "מפוטר", "התפטרות", "שימוע",
      "שכר", "הלנת שכר", "שעות נוספות", "הודעה מוקדמת", "דמי הבראה",
      "חופשה שנתית", "פנסיה", "הפרשות", "ביטוח פנסיוני", "היריון", "הריון",
      "חופשת לידה", "הטרדה מינית", "עובד", "עובדת", "מעסיק", "מעביד",
      "יחסי עבודה", "הסכם קיבוצי", "צו הרחבה", "פיצויי פיטורים",
      "הרעת תנאים", "התקופה המוגנת", "היתר פיטורים", "משכורת", "קבלן עצמאי",
      "פרילנסר", "מבחן ההשתלבות", "דיון מהיר", "עוגמת נפש",
      "הפליה", "אפליה", "שוויון הזדמנויות", "דמי מחלה", "ימי מחלה",
      "פדיון חופשה", "נטל ההוכחה", "דוחות נוכחות", "ריאיון עבודה",
      "סעיף 14", "תיקון 24", "יחסי עובד מעסיק", "הכרה בדיעבד",
    ],
    statutes: [
      "חוק עבודת נשים", "חוק פיצויי פיטורים", "חוק שעות עבודה ומנוחה",
      "חוק הגנת השכר", "חוק שוויון ההזדמנויות בעבודה", "חוק שוויון ההזדמנויות",
      "חוק הודעה מוקדמת", "חוק חופשה שנתית", "חוק דמי מחלה",
      "החוק למניעת הטרדה מינית", "חוק בית הדין לעבודה",
      "צו הרחבה לביטוח פנסיוני",
    ],
    entities: [
      "בית הדין לעבודה", "בית הדין הארצי", "בית הדין האזורי",
      "ההסתדרות", "ועד עובדים", "נציבות שוויון הזדמנויות",
    ],
  },
  {
    key: "inheritance",
    labelHe: "ירושה ועיזבון",
    vocabulary: ["ירושה", "ירושת", "יורש", "יורשים", "עיזבון", "צוואה", "צו ירושה", "צו קיום צוואה", "מוריש", "הסתלקות מירושה"],
    statutes: ["חוק הירושה"],
    entities: ["הרשם לענייני ירושה", "בית המשפט לענייני משפחה"],
  },
  {
    key: "criminal",
    labelHe: "משפט פלילי",
    vocabulary: ["מעצר", "מעצר עד תום ההליכים", "כתב אישום", "עבירה", "מאסר", "חקירה משטרתית", "שחרור בערובה", "הרשעה", "זיכוי", "עונש"],
    statutes: ["חוק העונשין", "חוק סדר הדין הפלילי", "חוק המעצרים"],
    entities: ["פרקליטות", "משטרה", "בית משפט השלום", "בית המשפט המחוזי"],
  },
  {
    key: "family",
    labelHe: "דיני משפחה",
    vocabulary: ["גירושין", "גט", "מזונות", "משמורת", "הסדרי ראייה", "כתובה", "ידועים בציבור", "הסכם ממון", "אפוטרופסות"],
    statutes: ["חוק יחסי ממון", "חוק הכשרות המשפטית והאפוטרופסות"],
    entities: ["בית המשפט לענייני משפחה", "בית הדין הרבני"],
  },
  {
    key: "real_estate",
    labelHe: "מקרקעין ונדל\"ן",
    vocabulary: ["מקרקעין", "טאבו", "רישום בית משותף", "שכירות", "דירה", "קניית דירה", "מכר דירה", "ליקויי בנייה", "היטל השבחה", "תמ\"א"],
    statutes: ["חוק המקרקעין", "חוק המכר (דירות)", "חוק השכירות והשאילה"],
    entities: ["רשם המקרקעין", "ועדה מקומית לתכנון ובנייה"],
  },
  {
    key: "tax",
    labelHe: "מיסים",
    vocabulary: ["מס הכנסה", "מס רכישה", "מס שבח", "מע\"מ", "שומה", "ניכוי במקור", "החזר מס", "מקדמות", "פטור ממס"],
    statutes: ["פקודת מס הכנסה", "חוק מיסוי מקרקעין", "חוק מס ערך מוסף"],
    entities: ["רשות המסים", "פקיד השומה"],
  },
  {
    key: "ip",
    labelHe: "קניין רוחני",
    vocabulary: ["פטנט", "רישום פטנט", "סימן מסחר", "זכויות יוצרים", "מדגם", "סוד מסחרי", "הפרת זכויות", "קניין רוחני"],
    statutes: ["חוק הפטנטים", "פקודת סימני מסחר", "חוק זכות יוצרים"],
    entities: ["רשות הפטנטים", "רשם סימני המסחר"],
  },
  {
    key: "administrative",
    labelHe: "משפט מנהלי",
    vocabulary: ["עתירה מנהלית", "מכרז", "רשות מקומית", "רישוי עסקים", "ארנונה", "החלטת רשות", "שימוע מנהלי", "בג\"ץ"],
    statutes: ["חוק בתי משפט לעניינים מינהליים", "חוק חובת המכרזים"],
    entities: ["בית המשפט לעניינים מינהליים", "היועץ המשפטי לממשלה"],
  },
  {
    key: "insolvency",
    labelHe: "חדלות פירעון",
    vocabulary: ["פשיטת רגל", "חדלות פירעון", "כינוס נכסים", "הסדר נושים", "הפטר", "נאמן", "פירוק חברה", "צו פתיחת הליכים"],
    statutes: ["חוק חדלות פירעון ושיקום כלכלי"],
    entities: ["הממונה על הליכי חדלות פירעון", "כונס הנכסים הרשמי"],
  },
];

/* ------------------------------------------------------------------ */
/* Tokens & stopwords                                                  */
/* ------------------------------------------------------------------ */

/** Hebrew function words that carry no legal meaning — excluded from
 * absolute-coverage computations so "מה הדין" doesn't count as a match. */
const HEBREW_STOPWORDS = new Set([
  "של", "על", "עם", "אם", "או", "גם", "כי", "מה", "מי", "איך", "מתי",
  "האם", "הוא", "היא", "הם", "הן", "זה", "זו", "אני", "אתה", "את",
  "לא", "אין", "יש", "כל", "בין", "עד", "רק", "אבל", "כאשר", "כמה",
  "לפי", "אחרי", "לפני", "בגין", "לגבי", "כדי", "אשר", "היה", "היתה",
  "להיות", "את", "ואת", "בו", "בה", "לו", "לה", "שלו", "שלה", "דין",
  "הדין", "חוק", "החוק", "זכות", "זכויות", "זכויותיה", "זכויותיו",
  "משפטי", "משפטית", "תביעה", "לתבוע", "מגיע", "מגיעה",
]);
// NOTE: generic legal words (דין, חוק, זכויות, תביעה) are deliberately
// stopworded for ABSOLUTE coverage: they appear in every legal domain and
// would otherwise let an out-of-domain query "match" any legal text.

/** Light Hebrew prefix stripping for coverage matching (ב/ל/מ/ה/ו/כ/ש). */
function stripPrefix(token: string): string[] {
  const forms = [token];
  if (token.length >= 4 && "בלמהוכש".includes(token[0])) {
    forms.push(token.slice(1));
    if (token.length >= 5 && "בלמהוכש".includes(token[1])) forms.push(token.slice(2));
  }
  return forms;
}

/** Light Hebrew suffix stemming — inflection only (התפטרה/התפטרות → התפטר).
 * Deliberately shallow: it must NEVER merge different roots. */
function stemHe(token: string): string {
  let t = token;
  for (const suf of ["ותיהם", "ותיהן", "יהם", "יהן", "ותיה", "ותיו", "יות", "ים", "ות", "יה", "יו", "ה", "י", "ת"]) {
    if (t.length - suf.length >= 3 && t.endsWith(suf)) { t = t.slice(0, t.length - suf.length); break; }
  }
  return t;
}

export function contentTokens(text: string): string[] {
  return tokenize(text).filter((t) => !HEBREW_STOPWORDS.has(t) && t.length >= 2);
}

/** Does `passage` contain token `t`?
 * Exact match, Hebrew prefix variants, or shared inflection stem (≥3). */
function passageHasToken(passageTokenSet: Set<string>, passageStemSet: Set<string>, t: string): boolean {
  for (const form of stripPrefix(t)) {
    if (passageTokenSet.has(form)) return true;
    for (const p of ["ב", "ל", "מ", "ה", "ו", "כ", "ש"]) {
      if (passageTokenSet.has(p + form)) return true;
    }
    const stem = stemHe(form);
    if (stem.length >= 3 && passageStemSet.has(stem)) return true;
  }
  return false;
}

/**
 * ABSOLUTE lexical relevance of a passage to the query:
 * fraction of the query's content-bearing tokens found in the passage.
 * Independent of every other result — a weak passage stays weak even if
 * it ranks first.
 */
export function absoluteLexicalCoverage(queryContentTokens: string[], passage: string): number {
  if (queryContentTokens.length === 0) return 0;
  const passageTokens = tokenize(passage);
  const passageSet = new Set(passageTokens);
  const passageStems = new Set<string>();
  for (const p of passageTokens) {
    for (const form of stripPrefix(p)) {
      const s = stemHe(form);
      if (s.length >= 3) passageStems.add(s);
    }
  }
  let hits = 0;
  for (const t of queryContentTokens) if (passageHasToken(passageSet, passageStems, t)) hits++;
  return hits / queryContentTokens.length;
}

/* ------------------------------------------------------------------ */
/* Domain detection                                                    */
/* ------------------------------------------------------------------ */

export interface DomainDetection {
  detectedDomain: string;
  detectedDomainLabelHe: string;
  activeDomain: string;
  domainMatch: boolean;
  /** per-signal decomposition — never one opaque number */
  signals: {
    vocabularyScore: Record<string, number>; // domain -> weighted hits
    statuteHit: string | null;               // statute reference detected
    entityHit: string | null;                // institutional entity detected
    semanticBest: string;                    // argmax of mock-semantic centroid
    semanticScores: Record<string, number>;
    retrievalAgreement: number;              // abs. coverage of retrieved top-3
  };
  method: string;
  /** deterministic-gate honesty */
  limitations: string;
}

const provider = new MockEmbeddingProvider();
let centroidCache: Map<string, EmbeddingVector> | null = null;

async function domainCentroids(): Promise<Map<string, EmbeddingVector>> {
  if (centroidCache) return centroidCache;
  const m = new Map<string, EmbeddingVector>();
  for (const d of DOMAIN_PROFILES) {
    const text = [...d.vocabulary, ...d.statutes, ...d.entities].join(" ");
    const [v] = await provider.embed([text]);
    m.set(d.key, v);
  }
  centroidCache = m;
  return m;
}

function phraseHits(queryNorm: string, phrases: string[]): number {
  let n = 0;
  for (const p of phrases) if (queryNorm.includes(p)) n++;
  return n;
}

export async function detectDomain(
  normalizedQuery: string,
  retrievalAgreement: number,
): Promise<DomainDetection> {
  const qTokenList = tokenize(normalizedQuery);
  const qTokens = new Set(qTokenList);
  const qStems = new Set<string>();
  for (const t of qTokenList) {
    for (const form of stripPrefix(t)) {
      const s = stemHe(form);
      if (s.length >= 3) qStems.add(s);
    }
  }
  const vocabularyScore: Record<string, number> = {};
  let statuteHit: string | null = null;
  let entityHit: string | null = null;
  let statuteDomain: string | null = null;
  let entityDomain: string | null = null;

  for (const d of DOMAIN_PROFILES) {
    // vocabulary: phrase containment + token-level containment with prefixes
    let score = phraseHits(normalizedQuery, d.vocabulary) * 1.0;
    for (const v of d.vocabulary) {
      if (v.includes(" ")) continue; // already handled as phrase
      if (passageHasToken(qTokens, qStems, v) || [...qTokens].some((t) => stripPrefix(t).includes(v))) score += 1;
    }
    vocabularyScore[d.key] = score;
    for (const s of d.statutes) if (normalizedQuery.includes(s)) { statuteHit = s; statuteDomain = d.key; }
    for (const e of d.entities) if (normalizedQuery.includes(e)) { entityHit = e; entityDomain = d.key; }
  }

  // deterministic semantic classification (mock trigram centroids)
  const centroids = await domainCentroids();
  const [qv] = await provider.embed([normalizedQuery]);
  const semanticScores: Record<string, number> = {};
  let semanticBest = ACTIVE_DOMAIN;
  let bestSem = -1;
  for (const [k, v] of centroids) {
    const c = Math.max(0, cosineSimilarity(qv, v));
    semanticScores[k] = Number(c.toFixed(4));
    if (c > bestSem) { bestSem = c; semanticBest = k; }
  }

  // combine: statute/entity references are decisive; then vocabulary;
  // semantic classification breaks ties; retrieved-source agreement is a
  // veto (handled by the caller via absolute thresholds, recorded here).
  let detected: string;
  if (statuteDomain) detected = statuteDomain;
  else if (entityDomain) detected = entityDomain;
  else {
    const ranked = Object.entries(vocabularyScore).sort((a, b) => b[1] - a[1]);
    const [firstKey, firstScore] = ranked[0];
    const secondScore = ranked[1]?.[1] ?? 0;
    if (firstScore === 0) detected = "unknown";
    else if (firstScore === secondScore) detected = semanticBest; // tie-break
    else detected = firstKey;
  }

  const profile = DOMAIN_PROFILES.find((d) => d.key === detected);
  return {
    detectedDomain: detected,
    detectedDomainLabelHe: profile?.labelHe ?? "לא זוהה תחום",
    activeDomain: ACTIVE_DOMAIN,
    domainMatch: detected === ACTIVE_DOMAIN,
    signals: {
      vocabularyScore,
      statuteHit,
      entityHit,
      semanticBest,
      semanticScores,
      retrievalAgreement: Number(retrievalAgreement.toFixed(4)),
    },
    method: "deterministic: controlled vocabulary + statutes + entities + mock-semantic centroids + retrieved-source agreement",
    limitations:
      "שער דטרמיניסטי שמרני (ללא embeddings אמיתיים): אוצר מילים סגור, ישויות, אזכורי חקיקה וסיווג טריגרמות. עלול לסווג 'לא זוהה תחום' בשאלות מעורפלות — התנהגות מכוונת (fail-closed).",
  };
}

/* ------------------------------------------------------------------ */
/* The gate                                                            */
/* ------------------------------------------------------------------ */

/** Calibrated against the 28-question positive benchmark and the
 * negative-query benchmark — change ONLY with both benchmarks green. */
export const GATE_THRESHOLDS = {
  /** min absolute lexical coverage for a passage to count as relevant */
  ABSOLUTE_LEXICAL_MIN: 0.3,
  /** coverage for a passage to count as STRONGLY relevant */
  ABSOLUTE_LEXICAL_STRONG: 0.5,
  /** min passages above ABSOLUTE_LEXICAL_MIN (independent documents) */
  MIN_RELEVANT_PASSAGES: 1,
  /** a single PRIMARY source (legislation/case law) may carry an answer
   * from this coverage up — the domain gate is a second, independent lock
   * (measured negative-set maximum: 0.333; see negative benchmark) */
  PRIMARY_SINGLE_SOURCE_MIN: 0.4,
  /** evidence rule: strong primary OR two independent relevant sources */
  MIN_INDEPENDENT_SOURCES: 2,
  /** raw mock-semantic floor — advisory only (mock quality), never the
   * sole reason to pass; may add a failure reason when near-zero */
  SEMANTIC_FLOOR: 0.05,
} as const;

/** Primary LEGAL sources: legislation and case law of any instance.
 * Secondary (guidance/academic/encyclopedic) alone never carries an answer. */
const PRIMARY_AUTHORITY = new Set(["legislation", "supreme", "national_labor", "regional"]);

export interface GateCandidate {
  documentId: string;
  passage: string;
  authorityClass: string;
  verificationStatus: string;
  rawLexicalRank: number;    // raw ts_rank/trigram score from retrieval
  rawSemantic: number;       // raw mock cosine
  anchorValid: boolean;
}

export interface GateReport {
  status: "pass" | "fail";
  answerState: "answered" | "no_answer";
  confidence: number; // 0..1, decomposed below — never opaque on its own
  activeDomain: string;
  activeDomainLabelHe: string;
  domain: DomainDetection;
  signals: {
    rawLexicalTop: number;          // best ABSOLUTE coverage
    normalizedLexicalTop: number;   // best RELATIVE (ranking) score
    rawSemanticTop: number;
    rawLexicalRankTop: number;      // raw retrieval rank score (ts_rank)
    relevantPassages: number;       // passages ≥ ABSOLUTE_LEXICAL_MIN
    independentRelevantSources: number;
    strongPrimarySources: number;
    primaryRelevantSources: number; // primary passages ≥ PRIMARY_SINGLE_SOURCE_MIN
    scoreSeparation: number;        // top absolute coverage − median
    queryConfidence: number;        // 0..1 (length/Hebrew/legal-terms)
    anchorsValid: boolean;
  };
  failureReasons: { code: string; messageHe: string }[];
  missingSourceTypes: string[];
  suggestedActionsHe: string[];
  thresholds: typeof GATE_THRESHOLDS;
}

export interface GateInput {
  normalizedQuery: string;
  candidates: GateCandidate[];
  normalizedLexicalTop: number;
}

function queryConfidence(normalizedQuery: string, qContent: string[]): number {
  const hebrew = (normalizedQuery.match(/[א-ת]/g) ?? []).length;
  const ratio = normalizedQuery.length ? hebrew / normalizedQuery.length : 0;
  let c = 0;
  if (qContent.length >= 2) c += 0.4;
  else if (qContent.length === 1) c += 0.2;
  if (ratio > 0.5) c += 0.3;
  if (normalizedQuery.length >= 15) c += 0.3;
  return Math.min(1, Number(c.toFixed(2)));
}

export async function runRelevanceGate(input: GateInput): Promise<GateReport> {
  const qContent = contentTokens(input.normalizedQuery);
  const failureReasons: GateReport["failureReasons"] = [];

  // absolute per-candidate coverage (query tokens only — NO expansions:
  // expansions help ranking, they must not manufacture relevance)
  const coverages = input.candidates.map((c) => ({
    c,
    coverage: absoluteLexicalCoverage(qContent, c.passage),
  }));
  coverages.sort((a, b) => b.coverage - a.coverage);

  const rawLexicalTop = coverages[0]?.coverage ?? 0;
  const rawSemanticTop = Math.max(0, ...input.candidates.map((c) => c.rawSemantic), 0);
  const rawLexicalRankTop = Math.max(0, ...input.candidates.map((c) => c.rawLexicalRank), 0);
  const median = coverages.length
    ? coverages[Math.floor(coverages.length / 2)].coverage
    : 0;

  const relevant = coverages.filter((x) => x.coverage >= GATE_THRESHOLDS.ABSOLUTE_LEXICAL_MIN);
  const relevantDocs = new Set(relevant.map((x) => x.c.documentId));
  const strongPrimary = relevant.filter(
    (x) => x.coverage >= GATE_THRESHOLDS.ABSOLUTE_LEXICAL_STRONG && PRIMARY_AUTHORITY.has(x.c.authorityClass),
  );
  const primaryRelevant = relevant.filter(
    (x) => x.coverage >= GATE_THRESHOLDS.PRIMARY_SINGLE_SOURCE_MIN && PRIMARY_AUTHORITY.has(x.c.authorityClass),
  );
  const anchorsValid = input.candidates.every((c) => c.anchorValid);

  // retrieval agreement feeds domain detection (mean coverage of top-3)
  const top3 = coverages.slice(0, 3);
  const agreement = top3.length ? top3.reduce((s, x) => s + x.coverage, 0) / top3.length : 0;
  const domain = await detectDomain(input.normalizedQuery, agreement);

  const qConf = queryConfidence(input.normalizedQuery, qContent);

  /* -------- evaluate rules (collect ALL failure reasons) ----------- */
  if (input.candidates.length === 0) {
    failureReasons.push({ code: "no_candidates", messageHe: "האחזור לא החזיר קטעים כלל" });
  }
  if (rawLexicalTop < GATE_THRESHOLDS.ABSOLUTE_LEXICAL_MIN) {
    failureReasons.push({
      code: "absolute_lexical_below_min",
      messageHe: `הרלוונטיות האבסולוטית הגבוהה ביותר (${rawLexicalTop.toFixed(2)}) נמוכה מהסף (${GATE_THRESHOLDS.ABSOLUTE_LEXICAL_MIN})`,
    });
  }
  if (!domain.domainMatch) {
    failureReasons.push({
      code: domain.detectedDomain === "unknown" ? "domain_unresolved" : "domain_mismatch",
      messageHe:
        domain.detectedDomain === "unknown"
          ? "לא זוהה תחום משפטי מובהק בשאלה"
          : `השאלה זוהתה כ"${domain.detectedDomainLabelHe}" — מחוץ לתחום הקורפוס הפעיל (דיני עבודה)`,
    });
  }
  const evidenceRuleMet =
    strongPrimary.length >= 1 ||
    primaryRelevant.length >= 1 ||
    (relevantDocs.size >= GATE_THRESHOLDS.MIN_INDEPENDENT_SOURCES && relevant.length >= 1);
  if (!evidenceRuleMet && relevant.length > 0) {
    failureReasons.push({
      code: "insufficient_evidence",
      messageHe: "אין מקור ראשי (חקיקה/פסיקה) רלוונטי דיו ואין שני מקורות עצמאיים — מקור משני/הנחיה לבדו אינו מספיק לתשובה משפטית",
    });
  }
  if (relevant.length < GATE_THRESHOLDS.MIN_RELEVANT_PASSAGES) {
    failureReasons.push({
      code: "insufficient_sources",
      messageHe: "אף קטע לא עבר את סף הרלוונטיות האבסולוטי",
    });
  }
  if (!anchorsValid) {
    failureReasons.push({ code: "invalid_anchors", messageHe: "עוגני ציטוט לא תקינים בחלק מהראיות" });
  }
  if (qConf < 0.4) {
    failureReasons.push({ code: "low_query_confidence", messageHe: "השאלה קצרה או עמומה מכדי מחקר אמין — נסח מחדש" });
  }
  if (rawSemanticTop < GATE_THRESHOLDS.SEMANTIC_FLOOR && rawLexicalTop < GATE_THRESHOLDS.ABSOLUTE_LEXICAL_STRONG) {
    failureReasons.push({ code: "semantic_floor", messageHe: "אות סמנטי (mock) אפסי בנוסף ללקסיקלי חלש" });
  }

  const status: GateReport["status"] = failureReasons.length === 0 ? "pass" : "fail";

  // decomposed confidence (documented formula, not opaque)
  const confidence = Number(Math.min(1,
    0.45 * rawLexicalTop +
    0.15 * Math.min(1, rawSemanticTop / 0.3) +
    0.20 * (domain.domainMatch ? 1 : 0) +
    0.10 * Math.min(1, relevantDocs.size / 2) +
    0.10 * qConf,
  ).toFixed(3));

  const missingSourceTypes: string[] = [];
  if (status === "fail") {
    if (!domain.domainMatch && domain.detectedDomain !== "unknown") {
      missingSourceTypes.push(`קורפוס בתחום ${domain.detectedDomainLabelHe} (לא קיים במערכת)`);
    } else {
      if (strongPrimary.length === 0) missingSourceTypes.push("מקור ראשי (חקיקה/פסיקה מחייבת) רלוונטי-חזק");
      if (relevantDocs.size < 2) missingSourceTypes.push("מקורות עצמאיים נוספים מעל סף הרלוונטיות");
    }
  }

  const suggestedActionsHe = status === "fail"
    ? [
        ...(domain.domainMatch ? [] : ["שנה את תחום המחקר"]),
        "חפש במאגר רחב יותר",
        "הוסף מקור משפטי",
        "נסח את השאלה מחדש",
      ]
    : [];

  return {
    status,
    answerState: status === "pass" ? "answered" : "no_answer",
    confidence,
    activeDomain: ACTIVE_DOMAIN,
    activeDomainLabelHe: "דיני עבודה",
    domain,
    signals: {
      rawLexicalTop: Number(rawLexicalTop.toFixed(4)),
      normalizedLexicalTop: Number(input.normalizedLexicalTop.toFixed(4)),
      rawSemanticTop: Number(rawSemanticTop.toFixed(4)),
      rawLexicalRankTop: Number(rawLexicalRankTop.toFixed(4)),
      relevantPassages: relevant.length,
      independentRelevantSources: relevantDocs.size,
      strongPrimarySources: strongPrimary.length,
      primaryRelevantSources: primaryRelevant.length,
      scoreSeparation: Number((rawLexicalTop - median).toFixed(4)),
      queryConfidence: qConf,
      anchorsValid,
    },
    failureReasons,
    missingSourceTypes,
    suggestedActionsHe,
    thresholds: GATE_THRESHOLDS,
  };
}

/** Required Hebrew refusal message — exact founder wording. */
export const NO_ANSWER_MESSAGE_HE =
  "לא נמצאו בקורפוס הנוכחי מקורות ברמת רלוונטיות מספקת לשאלה זו.";
