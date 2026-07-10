/**
 * Utility rail — typed mock data (visual sprint only).
 * The rail is the persistent daily companion: calendar, countdown,
 * next commitments, reminders, notifications, team.
 */

/** July 2026 — 1.7.2026 falls on Wednesday (offset 3, Sunday-first). */
export const MINI_CALENDAR = {
  title: "יולי 2026",
  weekdays: ["א", "ב", "ג", "ד", "ה", "ו", "ש"],
  startOffset: 3,
  daysInMonth: 31,
  today: 10,
  /** days with commitments */
  marked: [10, 13, 14, 21, 28],
};

export const NEXT_COMMITMENTS = [
  {
    id: "uc-1",
    kind: "hearing" as const,
    time: "11:30",
    countdown: "בעוד 48 דק׳",
    title: "דיון בתיק כהן",
    detail: "אולם 304 · בימ״ש השלום ת״א",
  },
  {
    id: "uc-2",
    kind: "meeting" as const,
    time: "14:00",
    countdown: "היום",
    title: "שיחת עדכון — רות אלמוג",
    detail: "טלפון · TechLine",
  },
];

export const REMINDERS = [
  { id: "r-1", text: "לאשר רישומי זמן מאתמול" },
  { id: "r-2", text: "להחזיר לרות אלמוג עד הצהריים" },
];

export const NOTIFICATIONS = [
  { id: "n-1", time: "07:12", text: "כתב הגנה התקבל — לוי נ׳ שיכון הצפון" },
  { id: "n-2", time: "07:05", text: "עמית סיים את ניתוח הבוקר" },
];

export const TEAM = [
  { id: "t-1", name: "דניאל", initial: "ד", state: "available" as const },
  { id: "t-2", name: "מיכל", initial: "מ", state: "busy" as const },
  { id: "t-3", name: "אבי", initial: "א", state: "available" as const },
];
