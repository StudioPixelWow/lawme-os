/**
 * Deterministic Hebrew extractors for Intelligent Intake.
 *
 * No LLM (none is wired; the runtime refuses network model providers). These
 * are controlled lexical/pattern rules. Each returns items wrapped in the
 * Extracted<T> envelope with an exact source span, a decomposed confidence, a
 * rule id (provenance), and needsConfirmation = true ALWAYS. Nothing here is
 * ever treated as an established fact.
 */

import type {
  ContactDraft,
  DeadlineDraft,
  EvidenceRequirementDraft,
  Extracted,
  FactDraft,
  IntakeFactStatus,
  MentionedDocumentDraft,
  ParticipantRole,
  PreliminaryLegalIssueDraft,
  SourceSpan,
} from "./contracts.ts";
import { bandFor, clamp, stableId } from "./util.ts";

type Src = "story" | "pasted";

function span(source: Src, start: number, end: number, text: string): SourceSpan {
  return { source, start, end, quoteHe: text.slice(start, end) };
}

function wrap<T>(
  ns: string,
  value: T,
  sp: SourceSpan | null,
  score: number,
  reasonHe: string,
  ruleId: string,
  method: Extracted<T>["provenance"]["method"],
  atISO: string,
  opts: Partial<Pick<Extracted<T>, "extractionStatus" | "missingInformation" | "requiresHumanReview" | "notesHe">> = {},
): Extracted<T> {
  const s = clamp(score, 0, 1);
  return {
    id: stableId(ns, sp ? `${sp.source}:${sp.start}:${sp.end}` : ruleId, JSON.stringify(value)),
    value,
    extractionStatus: opts.extractionStatus ?? (sp ? "extracted" : "inferred"),
    confidence: { score: Number(s.toFixed(2)), band: bandFor(s), reasonHe },
    span: sp,
    provenance: { method, ruleId, extractedAt: atISO },
    needsConfirmation: true, // invariant: NOTHING is auto-confirmed
    missingInformation: opts.missingInformation ?? false,
    requiresHumanReview: opts.requiresHumanReview ?? false,
    notesHe: opts.notesHe,
  };
}

/* ================================================================== */
/* Registries (subdomain-keyed). Small, explicit, auditable.           */
/* ================================================================== */

/** classifier subdomain → triad topic key (single source of truth reused). */
export const SUBDOMAIN_TO_TOPIC: Record<string, string> = {
  pregnancy_dismissal: "pregnancy_dismissal",
  severance: "severance",
  constructive_dismissal: "constructive_dismissal",
  hearing_duty: "hearing_duty",
  overtime: "overtime",
  notice_period: "notice_period",
  pension: "pension",
  worker_classification: "employee_vs_contractor",
  wage_claims: "wage_claims",
  harassment: "workplace_harassment",
};

/** Minimum evidence a matter of this subdomain typically needs (derived gaps). */
const EVIDENCE_BY_SUBDOMAIN: Record<string, Array<{ labelHe: string; provesFactKey?: string; mandatory: boolean }>> = {
  pregnancy_dismissal: [
    { labelHe: "אישור רפואי על ההיריון ומועדו", provesFactKey: "pregnancy_status", mandatory: true },
    { labelHe: "הוכחת ידיעת המעסיק על ההיריון", provesFactKey: "employer_knew_pregnancy", mandatory: true },
    { labelHe: "מכתב הפיטורים ומועדו", provesFactKey: "dismissal_date", mandatory: true },
    { labelHe: "היתר ממשרד העבודה (אם ניתן)", mandatory: false },
  ],
  hearing_duty: [
    { labelHe: "זימון לשימוע ומועדו", provesFactKey: "hearing_notice", mandatory: true },
    { labelHe: "פרוטוקול השימוע", provesFactKey: "hearing_held", mandatory: true },
    { labelHe: "מכתב הפיטורים", provesFactKey: "dismissal_date", mandatory: true },
  ],
  wage_claims: [
    { labelHe: "תלושי שכר לתקופה הרלוונטית", provesFactKey: "unpaid_wages", mandatory: true },
    { labelHe: "הסכם העסקה", mandatory: true },
    { labelHe: "דפי חשבון בנק להוכחת אי-תשלום", provesFactKey: "unpaid_wages", mandatory: false },
  ],
  severance: [
    { labelHe: "חישוב ותק ושכר קובע", provesFactKey: "employment_duration", mandatory: true },
    { labelHe: "מכתב סיום העסקה", provesFactKey: "dismissal_date", mandatory: true },
  ],
  constructive_dismissal: [
    { labelHe: "תיעוד הרעת התנאים", provesFactKey: "worsening_conditions", mandatory: true },
    { labelHe: "מכתב ההתפטרות והנימוקים", provesFactKey: "resignation", mandatory: true },
  ],
  overtime: [
    { labelHe: "דוחות נוכחות/שעון", provesFactKey: "overtime", mandatory: true },
    { labelHe: "תלושי שכר", mandatory: true },
  ],
};

/** Preliminary legal issues by subdomain (questions of law, not conclusions). */
const ISSUES_BY_SUBDOMAIN: Record<string, Array<{ questionHe: string; affects: PreliminaryLegalIssueDraft["affects"] }>> = {
  pregnancy_dismissal: [
    { questionHe: "האם חל האיסור לפטר עובדת בהיריון לפי חוק עבודת נשים, והאם נדרש היתר?", affects: ["claim_viability", "applicable_law"] },
    { questionHe: "האם המעסיק ידע על ההיריון במועד ההחלטה על הפיטורים?", affects: ["claim_viability"] },
  ],
  hearing_duty: [
    { questionHe: "האם קוימה חובת השימוע כדין טרם הפיטורים?", affects: ["claim_viability"] },
  ],
  wage_claims: [
    { questionHe: "האם קמה זכאות לפיצויי הלנת שכר ובאיזה שיעור?", affects: ["claim_viability", "applicable_law"] },
  ],
  severance: [
    { questionHe: "מהו שיעור פיצויי הפיטורים והאם חל סעיף 14?", affects: ["claim_viability"] },
  ],
  constructive_dismissal: [
    { questionHe: "האם מדובר בהתפטרות בדין מפוטר עקב הרעה מוחשית בתנאים?", affects: ["claim_viability"] },
  ],
  overtime: [
    { questionHe: "האם קמה זכאות לגמול שעות נוספות ומהו היקפו?", affects: ["claim_viability"] },
  ],
};

/* ================================================================== */
/* Participant extraction.                                             */
/* ================================================================== */

const ROLE_CUES: Array<{ re: RegExp; role: ParticipantRole; kind: ContactDraft["kind"] }> = [
  { re: /המעסיק(ה|ים)?|מעביד(ה)?|הנתבעת|החברה\b/, role: "opposing_party", kind: "organization" },
  { re: /העובד(ת|ים)?|הלקוח(ה)?|מרש(י|תי|ו)/, role: "client", kind: "person" },
  { re: /העד(ה)?\b|העיד(ה)?/, role: "witness", kind: "person" },
  { re: /המגשר(ת)?/, role: "mediator", kind: "person" },
  { re: /המומחה|חוות דעת/, role: "expert", kind: "person" },
  { re: /חברת ה?ביטוח|המבטח(ת)?/, role: "insurer", kind: "organization" },
  { re: /ב"?כ|עו"?ד|עורך[- ]דין/, role: "counsel", kind: "person" },
];

const ORG_RE = /(חברת\s+[^\s,.;:]+(?:\s+[^\s,.;:]+){0,3}|[^\s,.;:]+\s+בע"?מ)/g;
const NAMED_PERSON_RE = /(?:מר|גב'|הגב'|ד"ר|בשם)\s+([֐-׿]{2,}(?:\s+[֐-׿]{2,}){0,2})/g;

export function extractParticipants(text: string, source: Src, atISO: string): Array<Extracted<ContactDraft>> {
  const out: Array<Extracted<ContactDraft>> = [];
  const seen = new Set<string>();

  // Organizations (companies) — strong signal, likely opposing party unless our client.
  for (const m of text.matchAll(ORG_RE)) {
    const name = m[0].trim();
    const start = m.index ?? 0;
    if (seen.has(name)) continue;
    seen.add(name);
    // role: if the sentence around it names it employer/defendant → opposing.
    const around = text.slice(Math.max(0, start - 25), start + name.length + 15);
    const role: ParticipantRole = /המעסיק|הנתבעת|מעביד/.test(around) ? "opposing_party" : "related_party";
    out.push(
      wrap<ContactDraft>(
        "contact",
        { displayNameHe: name, kind: "organization", suggestedRole: role, duplicatePossibility: false },
        span(source, start, start + name.length, text),
        role === "opposing_party" ? 0.7 : 0.5,
        "זוהה שם ארגון (בע\"מ/חברת)",
        "participant.org",
        "pattern",
        atISO,
      ),
    );
  }

  // Named persons (מר/גב'/בשם ...).
  for (const m of text.matchAll(NAMED_PERSON_RE)) {
    const name = (m[1] ?? "").trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const start = (m.index ?? 0) + m[0].indexOf(name);
    const around = text.slice(Math.max(0, start - 30), start + name.length + 20);
    const cue = ROLE_CUES.find((c) => c.re.test(around));
    const role = cue?.role ?? null;
    out.push(
      wrap<ContactDraft>(
        "contact",
        { displayNameHe: name, kind: "person", suggestedRole: role, duplicatePossibility: false },
        span(source, start, start + name.length, text),
        role ? 0.6 : 0.45,
        role ? "זוהה אדם עם רמז לתפקיד בהקשר" : "זוהה שם אדם ללא תפקיד ברור",
        "participant.person",
        "pattern",
        atISO,
        role ? {} : { missingInformation: true },
      ),
    );
  }

  // Role-word participants without an explicit name (e.g. "המעסיקה") — a role
  // is present but identity is missing; surfaced so the reviewer can name it.
  for (const cue of ROLE_CUES) {
    const m = text.match(cue.re);
    if (!m) continue;
    const label = m[0];
    if (seen.has(label)) continue;
    // skip if we already captured a named entity for opposing/client
    if (out.some((c) => c.value.suggestedRole === cue.role && c.extractionStatus === "extracted")) continue;
    seen.add(label);
    const start = m.index ?? 0;
    out.push(
      wrap<ContactDraft>(
        "contact",
        { displayNameHe: label, kind: cue.kind, suggestedRole: cue.role, duplicatePossibility: false },
        span(source, start, start + label.length, text),
        0.4,
        "זוהה תפקיד ללא שם מפורש — נדרש זיהוי",
        `participant.role.${cue.role}`,
        "lexical_rule",
        atISO,
        { missingInformation: true },
      ),
    );
  }

  return out;
}

/* ================================================================== */
/* Fact extraction.                                                    */
/* ================================================================== */

const FIELD_DETECTORS: Array<{ key: string; re: RegExp }> = [
  { key: "employment_duration", re: /(\d+(?:\.\d+)?)\s*(שנים|שנה|חודשים|חודש)/ },
  { key: "salary", re: /(שכר|משכורת)[^.]{0,25}?([\d,]+)\s*(₪|ש"?ח|שקל)/ },
  { key: "dismissal_date", re: /פוטר(ה|ו)?|הפיטורים|פיטרו/ },
  { key: "pregnancy_status", re: /היריון|הריון|בהריון/ },
  { key: "employer_knew_pregnancy", re: /(הודע|יידע|ידע|סיפר).{0,20}(היריון|הריון)|המעסיק ידע/ },
  { key: "hearing_held", re: /שימוע/ },
  { key: "hearing_notice", re: /זימון לשימוע|זומנ/ },
  { key: "notice_period", re: /הודעה מוקדמת/ },
  { key: "unpaid_wages", re: /לא שול(ם|מו)|הלנת ה?שכר|לא קיבל(תי|ה) שכר/ },
  { key: "resignation", re: /התפטר(תי|ה|ות)/ },
  { key: "worsening_conditions", re: /הרעת ה?תנאים|הרעה מוחשית|הורד(ו|ה) ב?שכר|קיצוץ/ },
  { key: "overtime", re: /שעות נוספות/ },
];

const OPPOSING_MARKERS = /לטענת ה?מעסיק|המעסיק (טוען|טוענת|טענ|גורס)|לדברי ה?חברה|הנתבעת (טוענת|טוען)|לפי ה?מעסיק/;
const UNKNOWN_MARKERS = /לא ידוע|לא ברור|איני יודע|לא בטוח|יתכן|אולי/;

function splitSentences(text: string): Array<{ s: string; start: number }> {
  const out: Array<{ s: string; start: number }> = [];
  const re = /[^.!?\n]+[.!?]?/g;
  for (const m of text.matchAll(re)) {
    const s = m[0].trim();
    if (s.length >= 4) out.push({ s, start: (m.index ?? 0) + m[0].indexOf(s.charAt(0)) });
  }
  return out;
}

export function extractFacts(text: string, source: Src, atISO: string): Array<Extracted<FactDraft>> {
  const out: Array<Extracted<FactDraft>> = [];
  const sentences = splitSentences(text);
  for (const { s, start } of sentences) {
    const detector = FIELD_DETECTORS.find((d) => d.re.test(s));
    if (!detector) continue;
    let status: IntakeFactStatus = "client_alleged";
    let reason = "אמירה מהותית מנקודת מבט הלקוח — טענה, לא עובדה מאומתת";
    if (OPPOSING_MARKERS.test(s)) {
      status = "opposing_alleged";
      reason = "אמירה המיוחסת לצד שכנגד — טענה, לא עובדה מאומתת";
    } else if (UNKNOWN_MARKERS.test(s)) {
      status = "unknown";
      reason = "אמירה עם אי-ודאות מפורשת — סטטוס לא ידוע";
    }
    const score = status === "unknown" ? 0.35 : 0.6;
    out.push(
      wrap<FactDraft>(
        "fact",
        {
          factKey: detector.key,
          statementHe: s,
          suggestedStatus: status,
          speakerHe: status === "opposing_alleged" ? "צד שכנגד" : status === "unknown" ? "לא ידוע" : "לקוח",
          supportingItemIds: [],
          conflictingItemIds: [],
        },
        span(source, start, start + s.length, text),
        score,
        reason,
        `fact.${detector.key}`,
        "lexical_rule",
        atISO,
        { requiresHumanReview: true },
      ),
    );
  }
  return out;
}

/** Mark facts that conflict (same field, client vs opposing) as disputed. */
export function detectContradictions(
  facts: Array<Extracted<FactDraft>>,
  atISO: string,
): { updated: Array<Extracted<FactDraft>>; contradictions: Array<{ contradictionId: string; aboutHe: string; itemIds: string[]; severity: "low" | "moderate" | "high" }> } {
  const byField = new Map<string, Array<Extracted<FactDraft>>>();
  for (const f of facts) {
    const arr = byField.get(f.value.factKey) ?? [];
    arr.push(f);
    byField.set(f.value.factKey, arr);
  }
  const contradictions: Array<{ contradictionId: string; aboutHe: string; itemIds: string[]; severity: "low" | "moderate" | "high" }> = [];
  const disputedIds = new Set<string>();
  for (const [field, arr] of byField) {
    const hasClient = arr.some((f) => f.value.suggestedStatus === "client_alleged");
    const hasOpposing = arr.some((f) => f.value.suggestedStatus === "opposing_alleged");
    if (hasClient && hasOpposing) {
      const ids = arr.map((f) => f.id);
      ids.forEach((id) => disputedIds.add(id));
      contradictions.push({
        contradictionId: stableId("contradiction", field, ...ids),
        aboutHe: `טענות סותרות לגבי «${field}» בין הצדדים`,
        itemIds: ids,
        severity: "moderate",
      });
    }
  }
  const updated = facts.map((f) =>
    disputedIds.has(f.id)
      ? {
          ...f,
          value: { ...f.value, suggestedStatus: "disputed" as IntakeFactStatus, conflictingItemIds: [...f.value.conflictingItemIds] },
          confidence: { ...f.confidence, reasonHe: "טענה שנויה במחלוקת בין הצדדים" },
          provenance: { ...f.provenance, extractedAt: atISO },
        }
      : f,
  );
  return { updated, contradictions };
}

/* ================================================================== */
/* Date / deadline extraction.                                         */
/* ================================================================== */

const ABS_DATE_RE = /(\d{1,2})[./](\d{1,2})[./](\d{2,4})/g;
const REL_DATE_RE = /תוך\s+(\d+)\s+(ימים|יום|שבועות|חודשים)/g;

function toISO(d: number, m: number, y: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const yyyy = y < 100 ? 2000 + y : y;
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T00:00:00+03:00`;
}

export function extractDates(text: string, source: Src, atISO: string): Array<Extracted<DeadlineDraft>> {
  const out: Array<Extracted<DeadlineDraft>> = [];

  for (const m of text.matchAll(ABS_DATE_RE)) {
    const start = m.index ?? 0;
    const around = text.slice(Math.max(0, start - 30), start + m[0].length + 15);
    const iso = toISO(Number(m[1]), Number(m[2]), Number(m[3]));
    let kind: DeadlineDraft["kind"] = "event_date";
    let sourceType: DeadlineDraft["sourceType"] = "user_supplied";
    let label = "תאריך שהוזכר";
    let strict = false;
    if (/דיון|הדיון|נקבע דיון/.test(around)) {
      kind = "hearing_date";
      label = "מועד דיון";
    } else if (/מועד אחרון|יש להגיש|להגיש עד|עד ל|תום המועד/.test(around)) {
      kind = "deadline";
      label = "מועד אחרון להגשה";
      sourceType = /חוק|תקנה|סעיף/.test(around) ? "statute" : "user_supplied";
      strict = true;
    } else if (/פוטר|התחיל|נכנס|אירע|קרה/.test(around)) {
      kind = "event_date";
      label = "מועד אירוע";
    }
    const conf: DeadlineDraft["deadlineConfidence"] = iso ? "known" : "unknown";
    out.push(
      wrap<DeadlineDraft>(
        "deadline",
        {
          labelHe: label,
          kind,
          dueAt: kind === "deadline" || kind === "hearing_date" ? iso : iso, // date captured; persistence gate decides
          timezone: "Asia/Jerusalem",
          sourceType,
          deadlineConfidence: conf,
          basisHe: null,
          strict,
          ambiguityWarningHe: kind === "event_date" ? "תאריך אירוע — אינו מועד אחרון" : null,
        },
        span(source, start, start + m[0].length, text),
        kind === "deadline" ? 0.65 : 0.5,
        kind === "deadline" ? "זוהה מועד אחרון מפורש" : kind === "hearing_date" ? "זוהה מועד דיון" : "זוהה תאריך אירוע (אינו מועד אחרון)",
        `date.${kind}`,
        "pattern",
        atISO,
        { requiresHumanReview: kind === "deadline" },
      ),
    );
  }

  // Relative deadlines ("תוך 30 יום") — NO anchor date → dueAt MUST stay null.
  for (const m of text.matchAll(REL_DATE_RE)) {
    const start = m.index ?? 0;
    out.push(
      wrap<DeadlineDraft>(
        "deadline",
        {
          labelHe: `מועד יחסי: ${m[0]}`,
          kind: "unknown_ambiguous",
          dueAt: null, // never invent a date from a relative phrase
          timezone: "Asia/Jerusalem",
          sourceType: "estimated",
          deadlineConfidence: "unknown",
          basisHe: "מועד יחסי ללא תאריך עוגן",
          strict: false,
          ambiguityWarningHe: "מועד יחסי — לא ניתן לחשב תאריך ודאי ללא נקודת התחלה. נדרש אישור ידני.",
        },
        span(source, start, start + m[0].length, text),
        0.4,
        "מועד יחסי ללא עוגן — תאריך לא חושב",
        "date.relative",
        "pattern",
        atISO,
        { missingInformation: true, requiresHumanReview: true },
      ),
    );
  }

  return out;
}

/* ================================================================== */
/* Document mention extraction.                                        */
/* ================================================================== */

const DOC_CUES: Array<{ re: RegExp; labelHe: string }> = [
  { re: /מכתב ה?פיטורים|הודעת פיטורים/, labelHe: "מכתב פיטורים" },
  { re: /תלוש(י)? ה?שכר|תלוש/, labelHe: "תלושי שכר" },
  { re: /חוזה ה?עסקה|הסכם ה?עסקה|הסכם עבודה/, labelHe: "הסכם העסקה" },
  { re: /זימון לשימוע|מכתב זימון/, labelHe: "זימון לשימוע" },
  { re: /אישור רפואי|אישור הריון/, labelHe: "אישור רפואי" },
  { re: /מייל|אימייל|דוא"ל|הודעת וואטסאפ|ווטסאפ/, labelHe: "תכתובת (מייל/הודעה)" },
];

const HELD_MARKERS = /יש ברשות|צירפ|שמרתי|ברשותי|מצורף/;
const MISSING_MARKERS = /אין ל|לא קיבל|אבד|לא נמסר|לא קיבלתי/;

export function extractDocuments(text: string, source: Src, atISO: string): Array<Extracted<MentionedDocumentDraft>> {
  const out: Array<Extracted<MentionedDocumentDraft>> = [];
  const seen = new Set<string>();
  for (const cue of DOC_CUES) {
    const m = text.match(cue.re);
    if (!m) continue;
    if (seen.has(cue.labelHe)) continue;
    seen.add(cue.labelHe);
    const start = m.index ?? 0;
    const around = text.slice(Math.max(0, start - 25), start + m[0].length + 25);
    let state: MentionedDocumentDraft["state"] = "mentioned";
    if (MISSING_MARKERS.test(around)) state = "reportedly_missing";
    else if (HELD_MARKERS.test(around)) state = "reportedly_held";
    out.push(
      wrap<MentionedDocumentDraft>(
        "doc",
        { labelHe: cue.labelHe, state, authenticityConcern: /מזויף|לא חתום|ספק/.test(around) },
        span(source, start, start + m[0].length, text),
        0.55,
        "אוזכר מסמך — אזכור אינו מסמך שהועלה",
        "doc.mention",
        "lexical_rule",
        atISO,
        { notesHe: "אזכור מסמך אינו ממלא דרישת ראיה" },
      ),
    );
  }
  return out;
}

/* ================================================================== */
/* Derived: evidence requirements + legal issues.                      */
/* ================================================================== */

export function deriveEvidenceRequirements(
  subdomain: string | null,
  atISO: string,
): Array<Extracted<EvidenceRequirementDraft>> {
  const list = subdomain ? EVIDENCE_BY_SUBDOMAIN[SUBDOMAIN_TO_TOPIC[subdomain] ?? subdomain] ?? EVIDENCE_BY_SUBDOMAIN[subdomain] : undefined;
  if (!list) return [];
  return list.map((e) =>
    wrap<EvidenceRequirementDraft>(
      "evreq",
      { labelHe: e.labelHe, provesFactKey: e.provesFactKey ?? null, mandatory: e.mandatory },
      null,
      0.6,
      "דרישת ראיה נגזרת מסוג ההליך",
      `evreq.${subdomain}`,
      "derived",
      atISO,
      { extractionStatus: "inferred" },
    ),
  );
}

export function deriveLegalIssues(
  subdomain: string | null,
  atISO: string,
): Array<Extracted<PreliminaryLegalIssueDraft>> {
  const key = subdomain ? SUBDOMAIN_TO_TOPIC[subdomain] ?? subdomain : null;
  const list = key ? ISSUES_BY_SUBDOMAIN[key] ?? ISSUES_BY_SUBDOMAIN[subdomain ?? ""] : undefined;
  if (!list) return [];
  return list.map((iss, i) =>
    wrap<PreliminaryLegalIssueDraft>(
      "issue",
      { issueId: stableId("issue", subdomain ?? "x", String(i)), questionHe: iss.questionHe, affects: iss.affects },
      null,
      0.55,
      "סוגיה משפטית מקדמית — שאלה, לא מסקנה",
      `issue.${subdomain}`,
      "derived",
      atISO,
      { extractionStatus: "inferred", requiresHumanReview: true },
    ),
  );
}
