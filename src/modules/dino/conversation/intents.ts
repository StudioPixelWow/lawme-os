/**
 * Dino Conversation Engine — intent catalog + deterministic classifier
 * (Capability 3, Slice 3.0.0). PURE. No AI — keyword/rule matching only.
 */
import type { DinoIntent, ConversationScope, MatterSection } from "./types.ts";

export interface RequiredFactSpec {
  readonly code: string;
  readonly blocking: boolean;
}

export interface IntentConfig {
  readonly scope: ConversationScope;
  readonly sections: readonly MatterSection[];
  readonly required: readonly RequiredFactSpec[];
  readonly taskLabelHe: string;
  readonly directiveHe: string;
}

/** He + En keyword surface for each classifiable intent. Substring match. */
export const INTENT_KEYWORDS: Record<Exclude<DinoIntent, "general_question" | "unknown">, readonly string[]> = {
  prepare_for_hearing: ["הכנה לדיון", "הכן לדיון", "התכונן לדיון", "לדיון", "דיון הוכחות", "לקראת הדיון", "prepare for hearing", "hearing prep", "prep for", "court hearing"],
  draft_request: ["נסח", "ניסוח", "טיוטה", "הכן מכתב", "כתוב מכתב", "מכתב דרישה", "כתב תביעה", "כתב הגנה", "תצהיר", "הכן בקשה", "draft", "write a letter", "prepare a letter", "compose"],
  show_missing_information: ["מה חסר", "חסר", "מידע חסר", "חוסרים", "מה לא ידוע", "מה עוד צריך", "מה נדרש", "פערים", "missing", "what's missing", "whats missing", "gaps", "incomplete", "known unknowns"],
  explain_timeline: ["ציר זמן", "ציר הזמן", "מה קרה", "היסטוריה", "אירועים", "פעילות אחרונה", "כרונולוגיה", "timeline", "chronology", "what happened", "history", "activity"],
  explain_participants: ["מי מעורב", "גורמים", "צדדים", "בעלי דין", "עדים", "צד שכנגד", "מיהם", "מי הצדדים", "participants", "parties", "who is involved", "who's involved", "witnesses"],
  explain_facts: ["עובדות", "עובדה", "מה העובדות", "טענות", "מה ידוע", "facts", "the facts", "what are the facts", "allegations"],
  explain_evidence: ["ראיות", "ראיה", "מוצגים", "אילו ראיות", "evidence", "exhibits", "proof"],
  explain_deadlines: ["מועד", "מועדים", "דדליין", "תאריכים", "מתי", "התיישנות", "מועד אחרון", "deadline", "deadlines", "due date", "when is", "overdue", "limitation"],
  summarize_matter: ["סכם", "סיכום", "תמצת", "תמצית", "מה קורה בתיק", "מצב התיק", "ספר לי על התיק", "תמונת מצב", "summary", "summarize", "overview", "brief me", "status of the matter"],
};

/** Tie-break order — most specific first. */
export const INTENT_PRIORITY: readonly DinoIntent[] = [
  "prepare_for_hearing", "draft_request", "show_missing_information",
  "explain_timeline", "explain_participants", "explain_facts",
  "explain_evidence", "explain_deadlines", "summarize_matter",
  "general_question", "unknown",
];

export const INTENT_CONFIG: Record<DinoIntent, IntentConfig> = {
  summarize_matter: {
    scope: "whole_matter",
    sections: ["identity", "stage", "client", "responsible_lawyer", "health", "scores", "counts", "deadlines", "outstanding_issues"],
    required: [{ code: "CLIENT", blocking: false }, { code: "FACTS", blocking: false }],
    taskLabelHe: "סיכום התיק",
    directiveHe: "הצג תמונת מצב תמציתית: זהות, שלב, מצב בריאות, המועד הקרוב, ומה דורש תשומת לב עכשיו.",
  },
  explain_timeline: {
    scope: "single_section",
    sections: ["timeline", "timing", "counts"],
    required: [{ code: "TIMELINE", blocking: false }],
    taskLabelHe: "הסבר ציר הזמן",
    directiveHe: "תאר את רצף האירועים מהחדש לישן, בקצרה ולפי תאריך.",
  },
  show_missing_information: {
    scope: "whole_matter",
    sections: ["known_unknowns", "outstanding_issues", "completeness", "counts"],
    required: [],
    taskLabelHe: "מה חסר בתיק",
    directiveHe: "מנה את הפערים והשאלות הפתוחות לפי סדר חשיבות, בלי להמציא נתונים.",
  },
  explain_participants: {
    scope: "single_section",
    sections: ["participants", "relationships", "client", "responsible_lawyer"],
    required: [{ code: "PARTICIPANTS", blocking: true }],
    taskLabelHe: "הסבר הגורמים המעורבים",
    directiveHe: "פרט את הגורמים לפי תפקידם, והבחן בין לקוח, צד שכנגד ועדים.",
  },
  explain_facts: {
    scope: "single_section",
    sections: ["facts", "counts"],
    required: [{ code: "FACTS", blocking: true }],
    taskLabelHe: "הסבר העובדות",
    directiveHe: "הצג את העובדות לפי מעמד אפיסטמי, והבחן בין עובדה מבוססת לבין טענה שנויה במחלוקת.",
  },
  explain_evidence: {
    scope: "single_section",
    sections: ["evidence", "counts"],
    required: [{ code: "EVIDENCE", blocking: true }],
    taskLabelHe: "הסבר הראיות",
    directiveHe: "הצג את הראיות לפי חובה/רשות ולפי מצב איסוף, וסמן ראיות חובה חסרות.",
  },
  explain_deadlines: {
    scope: "single_section",
    sections: ["deadlines", "timing"],
    required: [{ code: "DEADLINES", blocking: true }],
    taskLabelHe: "הסבר המועדים",
    directiveHe: "הצג מועדים שחלפו, מתקרבים וללא תאריך; הדגש מועדים מחייבים.",
  },
  prepare_for_hearing: {
    scope: "whole_matter",
    sections: ["identity", "stage", "facts", "evidence", "deadlines", "participants", "documents", "outstanding_issues", "known_unknowns"],
    required: [{ code: "FACTS", blocking: false }, { code: "EVIDENCE", blocking: false }, { code: "DEADLINES", blocking: false }],
    taskLabelHe: "הכנה לדיון",
    directiveHe: "רכז את העובדות, הראיות, הגורמים והמועדים הרלוונטיים לדיון, וסמן פערים; אין להמליץ על פעולה סופית ללא אישור אנושי.",
  },
  draft_request: {
    scope: "single_section",
    sections: ["identity", "client", "facts", "participants", "documents"],
    required: [{ code: "CLIENT", blocking: true }],
    taskLabelHe: "הכנת טיוטה",
    directiveHe: "הכן טיוטה בלבד לבחינת עורך הדין; ניסוח סופי, שליחה או הגשה טעונים אישור אנושי.",
  },
  general_question: {
    scope: "general",
    sections: ["identity", "stage", "health", "counts"],
    required: [],
    taskLabelHe: "שאלה כללית",
    directiveHe: "ענה מתוך נתוני התיק בלבד; אם השאלה חורגת מהנתונים, ציין זאת והצע להבהיר.",
  },
  unknown: {
    scope: "unknown",
    sections: ["identity"],
    required: [],
    taskLabelHe: "לא זוהתה כוונה",
    directiveHe: "בקש הבהרה; אל תנחש את כוונת המשתמש.",
  },
};

const QUESTION_CUES: readonly string[] = ["מה", "מי", "מתי", "איך", "כיצד", "למה", "מדוע", "האם", "כמה", "what", "who", "when", "how", "why", "which", "?"];

export interface Classification {
  readonly intent: DinoIntent;
  readonly confidence: number;
  readonly hits: number;
  readonly runnerUpHits: number;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Deterministic intent classification by keyword scoring + fixed tie-break. */
export function classifyIntent(message: string): Classification {
  const text = message.toLowerCase();
  const trimmed = message.trim();
  const hasLetters = /[a-zא-ת]/i.test(trimmed);

  const scores = new Map<DinoIntent, number>();
  for (const intent of Object.keys(INTENT_KEYWORDS) as (keyof typeof INTENT_KEYWORDS)[]) {
    let n = 0;
    for (const kw of INTENT_KEYWORDS[intent]) if (text.includes(kw.toLowerCase())) n += 1;
    if (n > 0) scores.set(intent, n);
  }

  if (scores.size === 0) {
    if (!hasLetters || trimmed.length < 2) {
      return { intent: "unknown", confidence: 0.1, hits: 0, runnerUpHits: 0 };
    }
    return { intent: "general_question", confidence: 0.5, hits: 0, runnerUpHits: 0 };
  }

  // Highest score; tie-break by fixed priority order.
  let best: DinoIntent = "unknown";
  let bestHits = -1;
  for (const intent of INTENT_PRIORITY) {
    const s = scores.get(intent) ?? 0;
    if (s > bestHits) { best = intent; bestHits = s; }
  }
  // runner-up = highest score among the other intents
  let runnerUpHits = 0;
  for (const [intent, s] of scores) if (intent !== best && s > runnerUpHits) runnerUpHits = s;

  const base = bestHits >= 3 ? 0.95 : bestHits === 2 ? 0.85 : 0.7;
  const margin = bestHits - runnerUpHits;
  const adj = margin >= 2 ? 0.03 : margin === 1 ? 0 : -0.12;
  const confidence = clamp(base + adj, 0.5, 0.98);
  void QUESTION_CUES; // question cues reserved for future scope refinement
  return { intent: best, confidence, hits: bestHits, runnerUpHits };
}

/** A draft target is named when the message references a concrete document. */
const DRAFT_TARGETS: readonly string[] = ["מכתב דרישה", "כתב תביעה", "כתב הגנה", "תצהיר", "מכתב", "בקשה", "הסכם", "letter", "claim", "affidavit", "motion", "agreement"];
export function hasNamedDraftTarget(message: string): boolean {
  const t = message.toLowerCase();
  return DRAFT_TARGETS.some((k) => t.includes(k.toLowerCase()));
}
