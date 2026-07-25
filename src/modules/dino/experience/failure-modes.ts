/**
 * Deterministic failure-mode texts (Slice 3.2.0). PURE. No AI, no model call.
 * These paths NEVER invoke a provider — the honest answer is composed by LawME.
 */
export interface ModeText {
  readonly summaryHe: string;
  readonly analysisHe: string;
  readonly noticeHe: string;
}

export function outOfScopeText(): ModeText {
  return {
    summaryHe: "השאלה חורגת מתחומי הכיסוי הנתמכים.",
    analysisHe: "המערכת מכסה כרגע דיני עבודה בישראל בלבד. ניתן לנסח מחדש שאלה בתחום זה, או לפנות למקור המתאים לתחום הנדון.",
    noticeHe: "מחוץ לתחום הנתמך — אין מענה מבוסס",
  };
}

export function needsFactsText(): ModeText {
  return {
    summaryHe: "כדי לספק מענה מבוסס נדרשים פרטים נוספים.",
    analysisHe: "השב על שאלות ההבהרה שבהמשך כדי שאוכל להמשיך במחקר ולבסס את המענה על עובדות מדויקות.",
    noticeHe: "נדרשים פרטים נוספים לפני מענה",
  };
}

export function noVerifiedAuthorityText(): ModeText {
  return {
    summaryHe: "לא נמצאה אסמכתה מאומתת מספקת לשאלה זו.",
    analysisHe: "אותרו מקורות רלוונטיים (ראה רשימת המקורות), אך הם לגילוי בלבד וטעונים אימות מול המקור הרשמי, ולכן אינם מבססים מסקנה משפטית מחייבת. אין להציג את הממצאים כדין מבוסס ללא אימות ובדיקת עורך דין.",
    noticeHe: "אין אסמכתה מאומתת — הממצאים לגילוי בלבד",
  };
}
