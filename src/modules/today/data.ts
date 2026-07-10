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
};

export const PRIORITY_LABELS: Record<
  Priority,
  { label: string; tone: "critical" | "caution" | "neutral" }
> = {
  urgent: { label: "דחוף", tone: "critical" },
  today: { label: "היום", tone: "caution" },
  waiting: { label: "ממתין", tone: "neutral" },
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
  },
  {
    id: "att-2",
    title: "מסמך חדש הגיע",
    detail: "כתב הגנה מטעם הנתבעת",
    matter: "לוי נ׳ שיכון הצפון",
    action: "לצפייה במסמך",
    time: "07:12",
    priority: "today",
  },
  {
    id: "att-3",
    title: "לקוח מצפה לעדכון",
    detail: "4 ימים ללא מענה — רות אלמוג",
    matter: "הסכם מייסדים — TechLine",
    action: "לשליחת עדכון",
    time: "מאתמול",
    priority: "waiting",
  },
];

/** Static mock "now" for the timeline's day-progress marker. */
export const TIMELINE_NOW = { label: "10:42", position: 0.38 };

export type AIFinding = {
  id: string;
  label: string;
  count: number;
  detail: string;
};

export const AI_STATUS = {
  statusLine: "אני מנתח את המידע הרלוונטי…",
  progress: 72,
  updatedAt: "07:20",
  sources: "14 מסמכים · נט המשפט · יומן המשרד",
};

export const AI_FINDINGS: AIFinding[] = [
  { id: "f-1", label: "פסק דין חדש", count: 1, detail: "רלוונטי לתיק כהן — ע״א 4881/25" },
  { id: "f-2", label: "הזדמנויות", count: 2, detail: "פשרה אפשרית · שעות לא מחויבות" },
  { id: "f-3", label: "סיכונים", count: 1, detail: "מועד הגשה מתקרב — סיכומים" },
  { id: "f-4", label: "משימות מוכנות", count: 4, detail: "טיוטות ממתינות לאישורך" },
];

export type TimelineStatus = "done" | "next" | "upcoming";

export type TimelineEvent = {
  id: string;
  time: string;
  title: string;
  kind: string;
  matter?: string;
  location: string;
  status: TimelineStatus;
};

export const TIMELINE_EVENTS: TimelineEvent[] = [
  {
    id: "ev-1",
    time: "08:30",
    title: "סקירת בוקר",
    kind: "פנימי",
    location: "המשרד",
    status: "done",
  },
  {
    id: "ev-2",
    time: "09:15",
    title: "שיחת צוות",
    kind: "פנימי",
    location: "חדר ישיבות",
    status: "done",
  },
  {
    id: "ev-3",
    time: "11:30",
    title: "דיון בתיק כהן",
    kind: "דיון",
    matter: "כהן נ׳ לוי",
    location: "בימ״ש השלום ת״א · אולם 304",
    status: "next",
  },
  {
    id: "ev-4",
    time: "14:00",
    title: "שיחת לקוח",
    kind: "שיחה",
    matter: "אלמוג — הסכם מייסדים",
    location: "טלפון",
    status: "upcoming",
  },
  {
    id: "ev-5",
    time: "16:00",
    title: "הגשת מסמכים",
    kind: "מועד",
    matter: "לוי נ׳ שיכון הצפון",
    location: "נט המשפט",
    status: "upcoming",
  },
  {
    id: "ev-6",
    time: "17:30",
    title: "פגישה עם עו״ד רון",
    kind: "פגישה",
    location: "קפה נמרוד, שד׳ רוטשילד",
    status: "upcoming",
  },
];

export type Matter = {
  id: string;
  name: string;
  client: string;
  stage: string;
  nextEvent: string;
  lastUpdate: string;
  tone: "critical" | "caution" | "positive" | "neutral";
};

export const ACTIVE_MATTERS: Matter[] = [
  {
    id: "m-1",
    name: "כהן נ׳ לוי",
    client: "יעקב כהן",
    stage: "הוכחות",
    nextEvent: "דיון היום · 11:30",
    lastUpdate: "לפני שעה",
    tone: "critical",
  },
  {
    id: "m-2",
    name: "לוי נ׳ שיכון הצפון",
    client: "משפחת לוי",
    stage: "כתבי טענות",
    nextEvent: "הגשת סיכומים · היום 16:00",
    lastUpdate: "07:12",
    tone: "caution",
  },
  {
    id: "m-3",
    name: "הסכם מייסדים — TechLine",
    client: "רות אלמוג",
    stage: "טיוטה",
    nextEvent: "שיחת לקוח · היום 14:00",
    lastUpdate: "אתמול",
    tone: "neutral",
  },
  {
    id: "m-4",
    name: "מזרחי — צו ירושה",
    client: "דוד מזרחי",
    stage: "המתנה לרשם",
    nextEvent: "תזכורת מעקב · יום ג׳",
    lastUpdate: "לפני יומיים",
    tone: "positive",
  },
  {
    id: "m-5",
    name: "ברקוביץ׳ נ׳ מגדל",
    client: "שרה ברקוביץ׳",
    stage: "גישור",
    nextEvent: "ישיבת גישור · 21.7",
    lastUpdate: "לפני 3 ימים",
    tone: "neutral",
  },
];

export type Insight = {
  id: string;
  text: string;
  confidence: number;
  source: string;
  action: string;
};

export const AI_INSIGHTS: Insight[] = [
  {
    id: "i-1",
    text: "פסק דין חדש בע״א 4881/25 מחזק את טענת ההתיישנות שלך בתיק כהן — כדאי לאזכר בדיון היום.",
    confidence: 92,
    source: "נט המשפט · פסקי דין",
    action: "פתח ניתוח מלא",
  },
  {
    id: "i-2",
    text: "בכתב ההגנה שהתקבל הבוקר אין מענה לסעיף 14 (ליקויי בנייה) — נקודת תורפה אפשרית.",
    confidence: 84,
    source: "כתב הגנה · לוי נ׳ שיכון הצפון",
    action: "עבור לסעיף",
  },
  {
    id: "i-3",
    text: "זוהו 3.5 שעות עבודה מאתמול שטרם חויבו בתיק TechLine.",
    confidence: 97,
    source: "יומן פעילות המשרד",
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
  kind: string;
  time: string;
  status: "received" | "draft" | "filed";
};

export const DOC_STATUS_LABELS: Record<
  RecentDocument["status"],
  { label: string; tone: "caution" | "neutral" | "positive" }
> = {
  received: { label: "התקבל", tone: "caution" },
  draft: { label: "טיוטה", tone: "neutral" },
  filed: { label: "הוגש", tone: "positive" },
};

export const RECENT_DOCUMENTS: RecentDocument[] = [
  {
    id: "d-1",
    name: "כתב הגנה — הנתבעת",
    matter: "לוי נ׳ שיכון הצפון",
    kind: "PDF",
    time: "07:12",
    status: "received",
  },
  {
    id: "d-2",
    name: "טיוטת תגובה לדיון",
    matter: "כהן נ׳ לוי",
    kind: "DOCX",
    time: "06:58",
    status: "draft",
  },
  {
    id: "d-3",
    name: "הסכם מייסדים v4",
    matter: "TechLine",
    kind: "DOCX",
    time: "אתמול",
    status: "draft",
  },
  {
    id: "d-4",
    name: "תצהיר עדות ראשית",
    matter: "כהן נ׳ לוי",
    kind: "PDF",
    time: "אתמול",
    status: "filed",
  },
  {
    id: "d-5",
    name: "בקשה לצו ירושה",
    matter: "מזרחי",
    kind: "PDF",
    time: "8.7",
    status: "filed",
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
};

export const MEETINGS: Meeting[] = [
  {
    id: "mt-1",
    time: "14:00",
    day: "היום",
    title: "שיחת עדכון",
    with: "רות אלמוג",
    location: "טלפון",
  },
  {
    id: "mt-2",
    time: "17:30",
    day: "היום",
    title: "תיאום אסטרטגיה",
    with: "עו״ד מיכל רון",
    location: "קפה נמרוד",
  },
  {
    id: "mt-3",
    time: "09:30",
    day: "מחר",
    title: "פגישת היכרות — לקוח חדש",
    with: "אבי שטרן",
    location: "המשרד",
  },
  {
    id: "mt-4",
    time: "13:00",
    day: "יום ג׳",
    title: "ישיבת צוות שבועית",
    with: "כל המשרד",
    location: "חדר ישיבות",
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

export const FINANCE_TOTALS = [
  { id: "ft-1", label: "חיוב החודש", value: "₪184,500", trend: "+7.6%" },
  { id: "ft-2", label: "נגבה החודש", value: "₪152,300", trend: "+4.2%" },
  { id: "ft-3", label: "חוב פתוח", value: "₪48,200", trend: "−12%" },
];
