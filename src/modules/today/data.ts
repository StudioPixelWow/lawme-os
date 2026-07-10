import type { Status } from "@/design-system/primitives/indicators";

/**
 * Morning Workspace — typed mock data.
 * Visual-implementation sprint only: realistic Hebrew legal-office
 * content, no business logic, no live sources. Every AI item carries
 * provenance (generatedBy / updatedAt / sources) per docs 11.
 */

export type Priority = "urgent" | "today" | "waiting";

export type AttentionItem = {
  id: string;
  title: string;
  detail: string;
  matter: string;
  action: string;
  time: string;
  priority: Priority;
  kind: "hearing" | "document" | "client";
};

export const PRIORITY_LABELS: Record<Priority, { label: string; status: Status }> =
  {
    urgent: { label: "דחוף", status: "urgent" },
    today: { label: "היום", status: "today" },
    waiting: { label: "ממתין", status: "waiting" },
  };

export const ATTENTION_ITEMS: AttentionItem[] = [
  {
    id: "att-1",
    title: "דיון בתיק כהן",
    detail: "בית משפט השלום ת״א · אולם 304 · השופטת ברק־נבו",
    matter: "כהן נ׳ לוי",
    action: "לתדריך הדיון",
    time: "11:30",
    priority: "urgent",
    kind: "hearing",
  },
  {
    id: "att-2",
    title: "מסמך חדש הגיע",
    detail: "כתב הגנה מטעם הנתבעת",
    matter: "לוי נ׳ שיכון הצפון",
    action: "לצפייה במסמך",
    time: "07:12",
    priority: "today",
    kind: "document",
  },
  {
    id: "att-3",
    title: "לקוח מצפה לעדכון",
    detail: "4 ימים ללא מענה — רות אלמוג",
    matter: "הסכם מייסדים — TechLine",
    action: "לשליחת עדכון",
    time: "מאתמול",
    priority: "waiting",
    kind: "client",
  },
];

/** Static mock "now" for the timeline's day-progress marker. */
export const TIMELINE_NOW = { label: "10:42", position: 0.38 };

/* ============================================================
   Dynamic hero — the day-aware opening experience.
   The hero adapts to the shape of the day: a hearing day leads
   with the hearing; a calm day leads with drafts and clients;
   a high-load day narrows to three priorities; a quiet day turns
   inspirational. Today's mock is a hearing day.
   ============================================================ */

export type HeroMode = "hearing" | "calm" | "high-load" | "quiet";

export const HERO_DAY: {
  mode: HeroMode;
  signature: string;
  aiLine: string;
} = {
  mode: "hearing",
  signature: "יום דיונים · המיקוד: כהן נ׳ לוי",
  aiLine:
    "יום ממוקד־דיון. ההיערכות כמעט הושלמה — נותרו שני נספחים וסקירת הפסיקה החדשה, והדרך פנויה עד 11:30.",
};

export type HeroChecklistState = "ready" | "suggested" | "missing";

export const HERO_FOCUS = {
  countdown: "בעוד 48 דק׳",
  time: "11:30",
  title: "דיון הוכחות — כהן נ׳ לוי",
  location: "בימ״ש השלום ת״א · אולם 304 · השופטת ברק־נבו",
  readiness: 0.85,
  checklist: [
    { id: "hc-1", label: "תדריך הדיון", state: "ready" as HeroChecklistState },
    {
      id: "hc-2",
      label: "תצהיר עדות מעודכן",
      state: "ready" as HeroChecklistState,
    },
    {
      id: "hc-3",
      label: "אזכור ע״א 4881/25 בטיעון",
      state: "suggested" as HeroChecklistState,
    },
    {
      id: "hc-4",
      label: "2 נספחים לכתב התשובה",
      state: "missing" as HeroChecklistState,
    },
  ],
  documents: ["תצהיר עדות ראשית", "כתב הגנה — הנתבעת"],
  team: ["דניאל", "מיכל"],
  cta: "פתח את תדריך הדיון",
};

export type AIFinding = {
  id: string;
  kind: "precedent" | "opportunity" | "risk" | "ready";
  label: string;
  count: number;
  detail: string;
  action: string;
};

export const AI_STATUS = {
  statusLine: "ניתוח הבוקר הושלם · מעקב רציף פעיל",
  progress: 72,
  progressLabel: "קריאת כתב ההגנה שהתקבל",
  updatedAt: "07:20",
  sources: "14 מסמכים · נט המשפט · יומן המשרד",
};

export const AI_FINDINGS: AIFinding[] = [
  {
    id: "f-1",
    kind: "precedent",
    label: "פסק דין חדש",
    count: 1,
    detail: "ע״א 4881/25 — מחזק את טענת ההתיישנות בתיק כהן",
    action: "לניתוח",
  },
  {
    id: "f-2",
    kind: "opportunity",
    label: "הזדמנויות",
    count: 2,
    detail: "פתח לפשרה · 3.5 שעות שטרם חויבו",
    action: "לפירוט",
  },
  {
    id: "f-3",
    kind: "risk",
    label: "סיכונים",
    count: 1,
    detail: "מועד הגשת סיכומים — נותרו 5 שעות",
    action: "לבדיקה",
  },
  {
    id: "f-4",
    kind: "ready",
    label: "משימות מוכנות",
    count: 4,
    detail: "טיוטות ורישומי זמן ממתינים לאישורך",
    action: "לאישור",
  },
];

export type TimelineStatus = "done" | "next" | "upcoming";

export type TimelineEvent = {
  id: string;
  time: string;
  title: string;
  kind: "internal" | "hearing" | "call" | "deadline" | "meeting";
  kindLabel: string;
  matter?: string;
  location: string;
  status: TimelineStatus;
  /** 0–1 preparation readiness (next/upcoming only) */
  prep?: number;
};

export const TIMELINE_EVENTS: TimelineEvent[] = [
  {
    id: "ev-1",
    time: "08:30",
    title: "סקירת בוקר",
    kind: "internal",
    kindLabel: "פנימי",
    location: "המשרד",
    status: "done",
  },
  {
    id: "ev-2",
    time: "09:15",
    title: "שיחת צוות",
    kind: "internal",
    kindLabel: "פנימי",
    location: "חדר ישיבות",
    status: "done",
  },
  {
    id: "ev-3",
    time: "11:30",
    title: "דיון בתיק כהן",
    kind: "hearing",
    kindLabel: "דיון",
    matter: "כהן נ׳ לוי",
    location: "בימ״ש השלום ת״א · אולם 304",
    status: "next",
    prep: 0.85,
  },
  {
    id: "ev-4",
    time: "14:00",
    title: "שיחת לקוח",
    kind: "call",
    kindLabel: "שיחה",
    matter: "אלמוג — הסכם מייסדים",
    location: "טלפון",
    status: "upcoming",
    prep: 0.4,
  },
  {
    id: "ev-5",
    time: "16:00",
    title: "הגשת מסמכים",
    kind: "deadline",
    kindLabel: "מועד",
    matter: "לוי נ׳ שיכון הצפון",
    location: "נט המשפט",
    status: "upcoming",
    prep: 0.7,
  },
  {
    id: "ev-6",
    time: "17:30",
    title: "פגישה עם עו״ד רון",
    kind: "meeting",
    kindLabel: "פגישה",
    location: "קפה נמרוד, שד׳ רוטשילד",
    status: "upcoming",
  },
];

export type Matter = {
  id: string;
  name: string;
  client: string;
  practiceArea: string;
  owner: string;
  stage: string;
  status: Status;
  statusLabel: string;
  nextEvent: string;
  nextTask: string;
  lastUpdate: string;
  /** 0–1 readiness toward the next milestone */
  progress: number;
  action: string;
  /* ---- Matter Health ---- */
  risk: "נמוך" | "בינוני" | "גבוה";
  riskStatus: Status;
  missingDocs: number;
  waitingOn: string | null;
  waitingStatus: Status;
  team: string[];
  files: number;
  workload: string;
  aiNote: string;
};

export const ACTIVE_MATTERS: Matter[] = [
  {
    id: "m-1",
    name: "כהן נ׳ לוי",
    client: "יעקב כהן",
    practiceArea: "ליטיגציה",
    owner: "דניאל",
    stage: "הוכחות",
    status: "urgent",
    statusLabel: "דיון היום",
    nextEvent: "דיון · 11:30",
    nextTask: "עדכון תצהיר לפי הפסיקה החדשה",
    lastUpdate: "לפני שעה",
    progress: 0.85,
    action: "לתדריך הדיון",
    risk: "בינוני",
    riskStatus: "today",
    missingDocs: 0,
    waitingOn: null,
    waitingStatus: "completed",
    team: ["דניאל", "מיכל"],
    files: 34,
    workload: "≈4 שעות היום",
    aiNote: "התדריך מוכן. מומלץ לאזכר את ע״א 4881/25 — מחזק את טענת ההתיישנות.",
  },
  {
    id: "m-2",
    name: "לוי נ׳ שיכון הצפון",
    client: "משפחת לוי",
    practiceArea: "מקרקעין",
    owner: "מיכל",
    stage: "כתבי טענות",
    status: "today",
    statusLabel: "הגשה היום",
    nextEvent: "סיכומים · 16:00",
    nextTask: "השלמת סיכומים — סעיף הליקויים",
    lastUpdate: "07:12",
    progress: 0.7,
    action: "לסיכומים",
    risk: "גבוה",
    riskStatus: "risk",
    missingDocs: 2,
    waitingOn: "חוות דעת מהנדס",
    waitingStatus: "waiting",
    team: ["מיכל"],
    files: 27,
    workload: "≈3 שעות עד 16:00",
    aiNote: "בכתב ההגנה אין מענה לסעיף 14 — כדאי לחדד בסיכומים. חסרים 2 נספחים.",
  },
  {
    id: "m-3",
    name: "הסכם מייסדים — TechLine",
    client: "רות אלמוג",
    practiceArea: "מסחרי",
    owner: "דניאל",
    stage: "טיוטה",
    status: "progress",
    statusLabel: "בעבודה",
    nextEvent: "שיחת לקוח · 14:00",
    nextTask: "גרסה 5 להסכם — סעיפי שליטה",
    lastUpdate: "אתמול",
    progress: 0.45,
    action: "לטיוטה",
    risk: "נמוך",
    riskStatus: "completed",
    missingDocs: 1,
    waitingOn: "אישור הלקוחה לסעיף 7",
    waitingStatus: "waiting",
    team: ["דניאל"],
    files: 12,
    workload: "≈שעה",
    aiNote: "הלקוחה ממתינה לעדכון 4 ימים — טיוטת מייל עדכון מוכנה לאישורך.",
  },
  {
    id: "m-4",
    name: "מזרחי — צו ירושה",
    client: "דוד מזרחי",
    practiceArea: "ירושה",
    owner: "אבי",
    stage: "רשם הירושה",
    status: "waiting",
    statusLabel: "ממתין לרשם",
    nextEvent: "מעקב · יום ג׳",
    nextTask: "מעקב מול רשם הירושה",
    lastUpdate: "לפני יומיים",
    progress: 0.9,
    action: "למעקב",
    risk: "נמוך",
    riskStatus: "completed",
    missingDocs: 0,
    waitingOn: "החלטת הרשם",
    waitingStatus: "scheduled",
    team: ["אבי"],
    files: 8,
    workload: "ללא פעולה נדרשת",
    aiNote: "אין פעולה נדרשת. זמן טיפול ממוצע ברשם: 21 יום — צפי החלטה בשבועיים.",
  },
  {
    id: "m-5",
    name: "ברקוביץ׳ נ׳ מגדל",
    client: "שרה ברקוביץ׳",
    practiceArea: "ביטוח",
    owner: "מיכל",
    stage: "גישור",
    status: "scheduled",
    statusLabel: "גישור 21.7",
    nextEvent: "ישיבת גישור · 21.7",
    nextTask: "מסמך עמדה לישיבת הגישור",
    lastUpdate: "לפני 3 ימים",
    progress: 0.5,
    action: "להיערכות",
    risk: "בינוני",
    riskStatus: "today",
    missingDocs: 1,
    waitingOn: "מסמכי תביעה מהמבטחת",
    waitingStatus: "waiting",
    team: ["מיכל", "אבי"],
    files: 19,
    workload: "≈שעתיים השבוע",
    aiNote: "המגשר מונה לאחרונה ב־3 תיקי ביטוח דומים — ניתוח דפוסי פשרה זמין.",
  },
];

export type Insight = {
  id: string;
  category: "precedent" | "risk" | "billing";
  categoryLabel: string;
  text: string;
  confidence: number;
  source: string;
  matter: string;
  impact: "גבוהה" | "בינונית";
  action: string;
};

export const AI_INSIGHTS: Insight[] = [
  {
    id: "i-1",
    category: "precedent",
    categoryLabel: "תקדים חדש",
    text: "פסק דין חדש בע״א 4881/25 מחזק את טענת ההתיישנות שלך — כדאי לאזכר בדיון היום.",
    confidence: 92,
    source: "נט המשפט · פסקי דין",
    matter: "כהן נ׳ לוי",
    impact: "גבוהה",
    action: "פתח ניתוח מלא",
  },
  {
    id: "i-2",
    category: "risk",
    categoryLabel: "נקודת תורפה",
    text: "בכתב ההגנה שהתקבל הבוקר אין מענה לסעיף 14 (ליקויי בנייה).",
    confidence: 84,
    source: "כתב הגנה · עמ׳ 6–9",
    matter: "לוי נ׳ שיכון הצפון",
    impact: "גבוהה",
    action: "עבור לסעיף",
  },
  {
    id: "i-3",
    category: "billing",
    categoryLabel: "חיוב חסר",
    text: "זוהו 3.5 שעות עבודה מאתמול שטרם חויבו.",
    confidence: 97,
    source: "יומן פעילות המשרד",
    matter: "TechLine",
    impact: "בינונית",
    action: "אשר רישום",
  },
];

export const AI_INSIGHTS_META = {
  generatedBy: "עמית",
  updatedAt: "07:20",
};

export type RecentDocument = {
  id: string;
  name: string;
  matter: string;
  kind: "PDF" | "DOCX";
  owner: string;
  version: string;
  time: string;
  status: Status;
  statusLabel: string;
  action: string;
};

export const RECENT_DOCUMENTS: RecentDocument[] = [
  {
    id: "d-1",
    name: "כתב הגנה — הנתבעת",
    matter: "לוי נ׳ שיכון הצפון",
    kind: "PDF",
    owner: "מיכל",
    version: "v1",
    time: "07:12",
    status: "new",
    statusLabel: "התקבל",
    action: "לקריאה",
  },
  {
    id: "d-2",
    name: "טיוטת תגובה לדיון",
    matter: "כהן נ׳ לוי",
    kind: "DOCX",
    owner: "דניאל",
    version: "v2",
    time: "06:58",
    status: "progress",
    statusLabel: "טיוטה",
    action: "לעריכה",
  },
  {
    id: "d-3",
    name: "הסכם מייסדים v4",
    matter: "TechLine",
    kind: "DOCX",
    owner: "דניאל",
    version: "v4",
    time: "אתמול",
    status: "reviewed",
    statusLabel: "נסקר",
    action: "לחתימות",
  },
  {
    id: "d-4",
    name: "תצהיר עדות ראשית",
    matter: "כהן נ׳ לוי",
    kind: "PDF",
    owner: "דניאל",
    version: "v3",
    time: "אתמול",
    status: "completed",
    statusLabel: "הוגש",
    action: "לצפייה",
  },
  {
    id: "d-5",
    name: "בקשה לצו ירושה",
    matter: "מזרחי",
    kind: "PDF",
    owner: "אבי",
    version: "v1",
    time: "8.7",
    status: "signed",
    statusLabel: "נחתם",
    action: "לצפייה",
  },
];

export type SummaryMetric = {
  id: string;
  label: string;
  value: string;
  /** 0–1, for the gold bar */
  ratio: number;
};

export const DAILY_SUMMARY = {
  generatedBy: "עמית",
  updatedAt: "07:20",
  sources: "יומן · רישומי זמן · נט המשפט",
  headline: "יום ממוקד: דיון אחד, מועד הגשה אחד, ושלוש החלטות שממתינות רק לך.",
  metrics: [
    { id: "s-1", label: "שעות לחיוב אתמול", value: "6.5", ratio: 0.81 },
    { id: "s-2", label: "משימות שהושלמו", value: "9/12", ratio: 0.75 },
    { id: "s-3", label: "תיקים שדורשים פעולה", value: "3", ratio: 0.3 },
  ] satisfies SummaryMetric[],
};

export type Meeting = {
  id: string;
  time: string;
  day: string;
  title: string;
  with: string;
  location: string;
  kind: "call" | "meeting";
};

export const MEETINGS: Meeting[] = [
  {
    id: "mt-1",
    time: "14:00",
    day: "היום",
    title: "שיחת עדכון",
    with: "רות אלמוג",
    location: "טלפון",
    kind: "call",
  },
  {
    id: "mt-2",
    time: "17:30",
    day: "היום",
    title: "תיאום אסטרטגיה",
    with: "עו״ד מיכל רון",
    location: "קפה נמרוד",
    kind: "meeting",
  },
  {
    id: "mt-3",
    time: "09:30",
    day: "מחר",
    title: "פגישת היכרות — לקוח חדש",
    with: "אבי שטרן",
    location: "המשרד",
    kind: "meeting",
  },
  {
    id: "mt-4",
    time: "13:00",
    day: "יום ג׳",
    title: "ישיבת צוות שבועית",
    with: "כל המשרד",
    location: "חדר ישיבות",
    kind: "meeting",
  },
];

export type FinanceMonth = {
  month: string;
  /** billed, in ₪ thousands */
  billed: number;
  current?: boolean;
};

export const FINANCE_MONTHS: FinanceMonth[] = [
  { month: "פבר׳", billed: 128 },
  { month: "מרץ", billed: 145 },
  { month: "אפר׳", billed: 132 },
  { month: "מאי", billed: 158 },
  { month: "יוני", billed: 171 },
  { month: "יולי", billed: 184, current: true },
];

/** Monthly billing goal, ₪ thousands — the subtle target line. */
export const FINANCE_TARGET = 175;

export type FinanceTotal = {
  id: string;
  label: string;
  value: string;
  trend: string;
  /** direction is good → completed; bad → risk; neutral → waiting */
  trendStatus: Status;
};

export const FINANCE_TOTALS: FinanceTotal[] = [
  {
    id: "ft-1",
    label: "חיוב החודש",
    value: "₪184,500",
    trend: "+7.6%",
    trendStatus: "completed",
  },
  {
    id: "ft-2",
    label: "נגבה החודש",
    value: "₪152,300",
    trend: "+4.2%",
    trendStatus: "completed",
  },
  {
    id: "ft-3",
    label: "חוב פתוח",
    value: "₪48,200",
    trend: "−12%",
    trendStatus: "completed",
  },
];
