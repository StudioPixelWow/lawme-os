import type { Status } from "@/design-system/primitives/indicators";

/* ============================================================
   V8 — Office intelligence, typed mock data only.
   The Morning Workspace is the live operational map of the firm.
   Every model is presentation-independent; דינו items always carry
   provenance. No business logic, no live sources.
   ============================================================ */

export type Severity = "critical" | "attention" | "info" | "ok";

/* ── 1. Office Attention ──────────────────────────────────── */

export type OfficeAttentionItem = {
  id: string;
  text: string;
  /** the leading number, extracted for typographic emphasis */
  figure: string;
  severity: Severity;
  status: Status;
  icon: "matter" | "deadline" | "client" | "document" | "billing" | "message";
  owner?: string;
  /** id of the workspace section the item focuses */
  target: string;
  /** small week-over-week trend, when relevant */
  trend?: string;
};

export const OFFICE_ATTENTION: OfficeAttentionItem[] = [
  {
    id: "oa-risk",
    figure: "2",
    text: "מועדים בסיכון",
    severity: "critical",
    status: "urgent",
    icon: "deadline",
    owner: "מיכל",
    target: "risks",
  },
  {
    id: "oa-matters",
    figure: "7",
    text: "תיקים דורשים טיפול היום",
    severity: "attention",
    status: "today",
    icon: "matter",
    target: "matters",
    trend: "↑ 10% מהשבוע שעבר",
  },
  {
    id: "oa-clients",
    figure: "3",
    text: "לקוחות ללא עדכון מעל 5 ימים",
    severity: "attention",
    status: "waiting",
    icon: "client",
    target: "clients",
  },
  {
    id: "oa-docs",
    figure: "6",
    text: "מסמכים ממתינים לאישור",
    severity: "info",
    status: "progress",
    icon: "document",
    target: "documents",
  },
  {
    id: "oa-billing",
    figure: "18.5",
    text: "שעות טרם חויבו",
    severity: "info",
    status: "scheduled",
    icon: "billing",
    target: "finance",
    trend: "↑ 8% מהשבוע שעבר",
  },
  {
    id: "oa-messages",
    figure: "4",
    text: "הודעות WhatsApp ממתינות",
    severity: "attention",
    status: "new",
    icon: "message",
    target: "clients",
    trend: "↓ 12% מהשבוע שעבר",
  },
];

/* ── 2. Deadline & legal risk intelligence ────────────────── */

export type DeadlineRisk = {
  id: string;
  kind:
    | "filing-not-ready"
    | "response-required"
    | "missing-document"
    | "limitation-period"
    | "no-owner"
    | "calendar-conflict";
  kindLabel: string;
  matter: string;
  deadline: string;
  timeLeft: string;
  owner: string;
  why: string;
  action: string;
  status: Status;
};

export const DEADLINE_RISKS: DeadlineRisk[] = [
  {
    id: "risk-1",
    kind: "filing-not-ready",
    kindLabel: "הגשה לא מוכנה",
    matter: "לוי נ׳ שיכון הצפון",
    deadline: "היום · 16:00",
    timeLeft: "5:18 שעות",
    owner: "מיכל",
    why: "הסיכומים ב־70% — חסרים 2 נספחים וחוות דעת מהנדס שטרם התקבלה.",
    action: "השלם סיכומים",
    status: "urgent",
  },
  {
    id: "risk-2",
    kind: "response-required",
    kindLabel: "החלטה דורשת תגובה",
    matter: "כהן נ׳ לוי",
    deadline: "24.7",
    timeLeft: "14 ימים",
    owner: "דניאל",
    why: "החלטה חדשה מהבוקר קובעת מועד תגובה. דינו כבר יצר שלוש משימות.",
    action: "פתח החלטה",
    status: "today",
  },
];

/* ── 3. Team capacity ─────────────────────────────────────── */

export type TeamCapacity = {
  id: string;
  name: string;
  initial: string;
  role: string;
  /** 0–1 workload */
  load: number;
  state: "overloaded" | "in-hearing" | "available" | "blocked";
  stateLabel: string;
  status: Status;
  matters: number;
  criticalDeadlines: number;
  overdueTasks: number;
  /** the one line that matters */
  line: string;
  blocker?: string;
  suggestion?: string;
};

export const TEAM_CAPACITY: TeamCapacity[] = [
  {
    id: "tc-1",
    name: "דניאל",
    initial: "ד",
    role: "שותף מנהל",
    load: 0.92,
    state: "overloaded",
    stateLabel: "עומס גבוה",
    status: "urgent",
    matters: 6,
    criticalDeadlines: 2,
    overdueTasks: 0,
    line: "92% עומס · שני מועדים קריטיים · דיון ב־11:30",
    suggestion: "דינו ממליץ להעביר את תצהיר מזרחי למאיה",
  },
  {
    id: "tc-2",
    name: "מיכל",
    initial: "מ",
    role: "עו״ד בכירה",
    load: 0.85,
    state: "blocked",
    stateLabel: "חסימה",
    status: "risk",
    matters: 4,
    criticalDeadlines: 1,
    overdueTasks: 1,
    line: "85% עומס · הגשה ב־16:00 · ממתינה לחוות דעת מהנדס",
    blocker: "חוות דעת מהנדס — הוזמנה לפני 6 ימים",
  },
  {
    id: "tc-3",
    name: "אבי",
    initial: "א",
    role: "עו״ד",
    load: 0.78,
    state: "in-hearing",
    stateLabel: "בדיון עד 13:30",
    status: "scheduled",
    matters: 5,
    criticalDeadlines: 0,
    overdueTasks: 0,
    line: "בדיון עד 13:30 · פנוי אחה״צ",
  },
  {
    id: "tc-4",
    name: "מאיה",
    initial: "מ",
    role: "מתמחה",
    load: 0.63,
    state: "available",
    stateLabel: "פנויה למשימה",
    status: "completed",
    matters: 3,
    criticalDeadlines: 0,
    overdueTasks: 0,
    line: "63% עומס · פנויה למשימה חדשה",
  },
];

/* ── 4. Client communication requiring action ─────────────── */

export type CommChannel = "whatsapp" | "email" | "phone";

export type ClientCommunication = {
  id: string;
  client: string;
  matter: string;
  channel: CommChannel;
  channelLabel: string;
  waiting: string;
  summary: string;
  status: Status;
  /** דינו's prepared response — revealed on selection */
  dinoReply: string;
  action: string;
};

export const CLIENT_COMMS: ClientCommunication[] = [
  {
    id: "cc-1",
    client: "רות אלמוג",
    matter: "TechLine — הסכם מייסדים",
    channel: "whatsapp",
    channelLabel: "WhatsApp",
    waiting: "4 ימים",
    summary: "״מה קורה עם ההסכם? המשקיעים שואלים״",
    status: "urgent",
    dinoReply:
      "שלום רות, גרסה 5 של ההסכם מוכנה וכוללת את סעיפי השליטה שביקשת. נשמח לאישורך לסעיף 7 — ואז נעביר לחתימות עוד השבוע.",
    action: "אשר ושלח",
  },
  {
    id: "cc-2",
    client: "יעקב כהן",
    matter: "כהן נ׳ לוי",
    channel: "phone",
    channelLabel: "שיחה שלא נענתה",
    waiting: "מאתמול 18:40",
    summary: "התקשר אחרי שעות הפעילות — כנראה לקראת הדיון היום",
    status: "today",
    dinoReply:
      "דינו הכין תמצית עדכון לדיון: מועד, אולם, היערכות, ומה צפוי — מוכנה לשיחה או להודעה.",
    action: "חזור ללקוח",
  },
  {
    id: "cc-3",
    client: "משפחת לוי",
    matter: "לוי נ׳ שיכון הצפון",
    channel: "email",
    channelLabel: "אימייל",
    waiting: "יומיים",
    summary: "שאלה על אגרת בית המשפט בחשבונית האחרונה",
    status: "waiting",
    dinoReply:
      "דינו איתר את פירוט האגרה בחשבונית 2216 והכין הסבר קצר עם אסמכתא מנט המשפט.",
    action: "שלח הסבר",
  },
];

/** Compact channel intelligence for the utility rail. */
export const COMM_SUMMARY = [
  { id: "cs-1", channel: "whatsapp" as const, label: "WhatsApp ללא מענה", count: 4 },
  { id: "cs-2", channel: "email" as const, label: "אימיילים חשובים", count: 2 },
  { id: "cs-3", channel: "phone" as const, label: "שיחות שלא נענו", count: 1 },
];

export const COMM_DRAFTS_WAITING = "2 טיוטות מענה של דינו ממתינות לאישור";

/* ── 5. Court & Net-HaMishpat updates ─────────────────────── */

export type CourtUpdate = {
  id: string;
  source: string;
  matter: string;
  receivedAt: string;
  kind: "decision" | "protocol" | "reschedule" | "filing";
  kindLabel: string;
  summary: string;
  deadlineImpact?: string;
  tasksCreated: number;
  clientUpdated: "sent" | "pending";
  dinoAnalysis: string;
  action: string;
  status: Status;
};

export const COURT_UPDATES: CourtUpdate[] = [
  {
    id: "cu-1",
    source: "נט המשפט · בימ״ש השלום ת״א",
    matter: "כהן נ׳ לוי",
    receivedAt: "08:55",
    kind: "decision",
    kindLabel: "החלטה חדשה",
    summary: "בקשת הנתבע לדחיית מועד — נדחתה. הדיון יתקיים כסדרו היום.",
    deadlineImpact: "נדרשת תגובה לסעיף ההוצאות בתוך 14 ימים",
    tasksCreated: 3,
    clientUpdated: "pending",
    dinoAnalysis:
      "דינו זיהה שנדרשת תגובה בתוך 14 ימים, חישב מועד מוצע (22.7) ויצר שלוש משימות: טיוטת תגובה, אסמכתאות, ותיאום מול הלקוח.",
    action: "פתח את ההחלטה",
    status: "new",
  },
  {
    id: "cu-2",
    source: "נט המשפט · מחוזי חיפה",
    matter: "לוי נ׳ שיכון הצפון",
    receivedAt: "07:40",
    kind: "protocol",
    kindLabel: "פרוטוקול",
    summary: "פורסם פרוטוקול קדם המשפט מ־6.7.",
    tasksCreated: 1,
    clientUpdated: "sent",
    dinoAnalysis:
      "דינו סימן שתי הצהרות של ב״כ הנתבעת שסותרות את כתב ההגנה — רלוונטי לסיכומים של היום.",
    action: "פתח סימונים",
    status: "reviewed",
  },
  {
    id: "cu-3",
    source: "רשם הירושה",
    matter: "מזרחי — צו ירושה",
    receivedAt: "אתמול",
    kind: "filing",
    kindLabel: "עדכון סטטוס",
    summary: "הבקשה הועברה לבחינת רשם — צפי החלטה בשבועיים.",
    tasksCreated: 0,
    clientUpdated: "sent",
    dinoAnalysis: "אין פעולה נדרשת. דינו יעקוב ויתריע עם קבלת ההחלטה.",
    action: "לתיק",
    status: "scheduled",
  },
];

/* ── 6. Leads & new business ──────────────────────────────── */

export type LeadOpportunity = {
  id: string;
  name: string;
  topic: string;
  source: string;
  sinceLastResponse: string;
  value?: string;
  status: Status;
  statusLabel: string;
  action: string;
};

export const LEADS_SUMMARY = {
  newLeads: 4,
  unanswered: 2,
  consultationsToday: 3,
};

export const LEAD_ITEMS: LeadOpportunity[] = [
  {
    id: "ld-1",
    name: "חברת נתיב אנרגיה",
    topic: "ליווי עסקה מסחרית",
    source: "המלצת לקוח",
    sinceLastResponse: "לא נענה · 26 שעות",
    value: "₪80,000",
    status: "urgent",
    statusLabel: "ליד חם",
    action: "חזור עכשיו",
  },
  {
    id: "ld-2",
    name: "אורי ומיטל שגב",
    topic: "מקרקעין — ליקויי בנייה",
    source: "אתר המשרד",
    sinceLastResponse: "נענה · פגישה היום 15:00",
    status: "scheduled",
    statusLabel: "ייעוץ היום",
    action: "פתח תדריך",
  },
  {
    id: "ld-3",
    name: "הצעת שכ״ט — קבוצת ברק",
    topic: "הסכם ההתקשרות ממתין לחתימה",
    source: "הצעה נשלחה 3.7",
    sinceLastResponse: "6 ימים",
    value: "₪48,000",
    status: "waiting",
    statusLabel: "ממתין לחתימה",
    action: "תזכר חתימה",
  },
];

/* ── 7. Finance snapshot ──────────────────────────────────── */

export const FINANCE_SENTENCE =
  "החודש חויבו ₪184,500, נגבו ₪152,300 ו־₪48,200 עדיין פתוחים.";

export const FINANCE_DINO = {
  text: "דינו זיהה 18.5 שעות עבודה שטרם חויבו בשלושה תיקים.",
  action: "בדוק ורשום",
  updatedAt: "07:20",
  source: "יומן פעילות המשרד",
};

export const FINANCE_FLAGS = [
  { id: "ff-1", text: "2 לקוחות עם חוב בפיגור מעל 45 יום", status: "risk" as Status },
  { id: "ff-2", text: "תיק ברקוביץ׳ מתחת ליעד הרווחיות", status: "waiting" as Status },
];

/* ── 8. דינו — office-wide intelligence ───────────────────── */

export type DinoOfficeInsight = {
  id: string;
  kind: "precedent" | "clients" | "risk" | "capacity" | "billing" | "churn";
  kindLabel: string;
  finding: string;
  why: string;
  related: string[];
  evidence: string;
  action: string;
  updatedAt: string;
  status: Status;
};

export const DINO_OFFICE_INSIGHTS: DinoOfficeInsight[] = [
  {
    id: "do-1",
    kind: "precedent",
    kindLabel: "תקדים רוחבי",
    finding: "ע״א 4881/25 משפיע על שלושה תיקים פעילים",
    why: "מחזק טענת התיישנות בכהן, בלוי ובברקוביץ׳ — כדאי לאזכר עוד היום בדיון.",
    related: ["כהן נ׳ לוי", "לוי נ׳ שיכון הצפון", "ברקוביץ׳ נ׳ מגדל"],
    evidence: "נט המשפט · פס״ד מ־8.7 · השוואה ל־14 מסמכי תיק",
    action: "פתח ניתוח רוחבי",
    updatedAt: "07:20",
    status: "reviewed",
  },
  {
    id: "do-2",
    kind: "capacity",
    kindLabel: "עומס צוות",
    finding: "דניאל ב־92% עומס עם שני מועדים קריטיים",
    why: "סיכון לאיכות ההכנה לדיון. מאיה ב־63% ופנויה למשימה.",
    related: ["דניאל", "מאיה", "מזרחי — צו ירושה"],
    evidence: "יומן המשרד · משימות פתוחות · רישומי זמן",
    action: "הצע חלוקה מחדש",
    updatedAt: "07:20",
    status: "risk",
  },
  {
    id: "do-3",
    kind: "clients",
    kindLabel: "לקוחות ממתינים",
    finding: "שלושה לקוחות ללא עדכון מעל 5 ימים",
    why: "רות אלמוג כבר פנתה פעמיים — סיכון לשחיקת אמון. טיוטות מענה מוכנות.",
    related: ["רות אלמוג", "יעקב כהן", "משפחת לוי"],
    evidence: "WhatsApp · אימייל · יומן שיחות",
    action: "אשר טיוטות מענה",
    updatedAt: "07:15",
    status: "waiting",
  },
  {
    id: "do-4",
    kind: "billing",
    kindLabel: "הכנסה",
    finding: "18.5 שעות עבודה טרם חויבו",
    why: "כ־₪12,900 לפי תעריפי התיקים — ניתן לחייב עוד החודש.",
    related: ["TechLine", "כהן נ׳ לוי", "ברקוביץ׳ נ׳ מגדל"],
    evidence: "רישומי זמן 1–9.7 מול חשבוניות",
    action: "בדוק ורשום",
    updatedAt: "07:20",
    status: "scheduled",
  },
  {
    id: "do-5",
    kind: "churn",
    kindLabel: "סיכון לקוח",
    finding: "קבוצת ברק — הצעה ללא מענה 6 ימים",
    why: "לפי דפוסי המשרד, הצעה שלא נחתמת בתוך שבוע יורדת ב־40% בסיכויי הסגירה.",
    related: ["קבוצת ברק"],
    evidence: "היסטוריית הצעות המשרד · 24 חודשים",
    action: "תזכר היום",
    updatedAt: "07:10",
    status: "today",
  },
];

/* ── 9. Roles & the day's scenario (conditional hierarchy) ── */

export type OfficeRole = "partner" | "lawyer" | "intern";

export const ACTIVE_ROLE: OfficeRole = "partner";

/**
 * Section order per role. The page renders by this priority;
 * sections may still collapse by scenario state below.
 */
export const ROLE_SECTIONS: Record<OfficeRole, string[]> = {
  partner: [
    "focus",
    "attention",
    "matters",
    "team",
    "clients",
    "court",
    "documents",
    "leads",
    "finance",
    "dino",
  ],
  lawyer: [
    "focus",
    "attention",
    "matters",
    "court",
    "documents",
    "clients",
    "team",
    "finance",
    "leads",
    "dino",
  ],
  intern: [
    "focus",
    "attention",
    "documents",
    "matters",
    "court",
    "team",
    "clients",
    "leads",
    "finance",
    "dino",
  ],
};

/**
 * Today's office state — drives conditional expansion. A quiet day
 * collapses modules into one-line confirmations; a loaded day expands
 * them. Today: hearing day, deadline risk, waiting clients, team hot.
 */
export const OFFICE_SCENARIO = {
  risksActive: true,
  clientsWaiting: CLIENT_COMMS.length,
  courtUpdatesUrgent: true,
  teamOverloaded: true,
  highValueLeadUnanswered: true,
  financeException: true,
};

/* ── 10. WhatsApp — the smart inbox (V12) ─────────────────── */

export type WhatsAppStatus = "new" | "urgent" | "waiting";

export type SuggestionStatus =
  | "idle"
  | "generating"
  | "ready"
  | "edited"
  | "error";

export type WhatsAppMessage = {
  id: string;
  contactName: string;
  avatarUrl?: string;
  initials: string;
  timestamp: string;
  messagePreview: string;
  status: WhatsAppStatus;
  clientId?: string;
  clientName?: string;
  caseId?: string;
  caseName?: string;
  /** "client" | "lead" — drives the inbox filters */
  kind: "client" | "lead";
  dinoSuggestion?: string;
  suggestionStatus: SuggestionStatus;
};

export const WHATSAPP_MESSAGES: WhatsAppMessage[] = [
  {
    id: "wa-1",
    contactName: "רות אלמוג",
    initials: "ר",
    timestamp: "10:42",
    messagePreview: "מה קורה עם ההסכם? המשקיעים שואלים ואני צריכה תשובה היום…",
    status: "urgent",
    clientId: "c-almog",
    clientName: "רות אלמוג",
    caseId: "m-3",
    caseName: "TechLine — הסכם מייסדים",
    kind: "client",
    dinoSuggestion:
      "שלום רות, גרסה 5 של ההסכם מוכנה וכוללת את סעיפי השליטה שביקשת. נשמח לאישורך לסעיף 7 — ואז נעביר לחתימות עוד השבוע.",
    suggestionStatus: "ready",
  },
  {
    id: "wa-2",
    contactName: "יעקב כהן",
    initials: "י",
    timestamp: "09:17",
    messagePreview: "בוקר טוב, רציתי לוודא שהכול מוכן לדיון היום ב־11:30…",
    status: "new",
    clientId: "c-cohen",
    clientName: "יעקב כהן",
    caseId: "m-1",
    caseName: "כהן נ׳ לוי",
    kind: "client",
    dinoSuggestion:
      "בוקר טוב יעקב, הכול ערוך לדיון היום: התדריך מוכן, התצהירים הוגשו והצוות ייפגש איתך באולם 304 ב־11:15. נתראה שם.",
    suggestionStatus: "ready",
  },
  {
    id: "wa-3",
    contactName: "אורי שגב",
    initials: "א",
    timestamp: "אתמול",
    messagePreview: "תודה על השיחה! מחכים להצעת שכר הטרחה שדיברנו עליה…",
    status: "waiting",
    kind: "lead",
    caseName: "ליד — מקרקעין, ליקויי בנייה",
    dinoSuggestion: undefined,
    suggestionStatus: "idle",
  },
];
