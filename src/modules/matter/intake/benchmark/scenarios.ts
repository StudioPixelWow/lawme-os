/**
 * Synthetic intake scenarios for the Slice 2A "legal brain proof" benchmark.
 *
 * Each is a realistic Hebrew story plus the expectations the deterministic
 * pipeline must satisfy. Employment scenarios are in-scope; the rest test that
 * the system fails CLOSED (out-of-domain → no preliminary view, specialist
 * routing) rather than hallucinating an answer.
 */

export interface IntakeScenario {
  id: string;
  titleHe: string;
  storyHe: string;
  pastedHe?: string;
  expect: {
    domainWithinScope: boolean;
    subdomain?: string | null;
    minParticipants: number;
    expectsClientRole?: boolean;
    expectsOpposingRole?: boolean;
    minFacts: number;
    expectsContradiction?: boolean;
    expectsRelativeDeadlineNull?: boolean; // a "תוך N ימים" phrase → dueAt must be null
    highRisk?: boolean;
    expectsNoPreliminaryView?: boolean; // out-of-domain / insufficient
  };
}

export const INTAKE_SCENARIOS: IntakeScenario[] = [
  {
    id: "preg-dismissal",
    titleHe: "פיטורי הריון",
    storyHe:
      'הלקוחה שלנו, גב\' רונית לוי, עבדה 3 שנים כמנהלת חשבונות. היא הודיעה למעסיקה חברת טק-לייף בע"מ על ההיריון בחודש הרביעי. שבועיים לאחר מכן, ב-01/06/2026, היא פוטרה. יש ברשותי את מכתב הפיטורים. המעסיקה טוענת שהפיטורים היו על רקע צמצומים.',
    expect: {
      domainWithinScope: true,
      subdomain: "pregnancy_dismissal",
      minParticipants: 2,
      expectsClientRole: true,
      expectsOpposingRole: true,
      minFacts: 3,
      highRisk: true,
    },
  },
  {
    id: "unpaid-wages",
    titleHe: "אי-תשלום שכר",
    storyHe:
      'העובד מר יוסי כהן מועסק בחברת בנייה. בשלושת החודשים האחרונים לא שולם לו שכר בסך 12,000 ₪ לחודש. אין לו תלושי שכר לתקופה. מדובר בהלנת השכר.',
    expect: {
      domainWithinScope: true,
      subdomain: "wage_claims",
      minParticipants: 1,
      expectsClientRole: true,
      minFacts: 1,
    },
  },
  {
    id: "hearing-no-notice",
    titleHe: "פיטורים ללא שימוע כדין",
    storyHe:
      'הלקוח פוטר ב-15/05/2026 ללא שימוע. הוא לא קיבל זימון לשימוע ולא ניתנה לו הזדמנות להשמיע את טענותיו. המעסיקה היא חברת שירותים בע"מ.',
    expect: {
      domainWithinScope: true,
      subdomain: "hearing_duty",
      minParticipants: 1,
      minFacts: 1,
    },
  },
  {
    id: "constructive-dismissal",
    titleHe: "התפטרות עקב הרעת תנאים",
    storyHe:
      'הלקוחה התפטרה לאחר שהמעסיק ביצע הרעת תנאים מוחשית: הורידו לה בשכר והעבירו אותה לתפקיד נחות. היא רואה בכך פיטורים.',
    expect: {
      domainWithinScope: true,
      subdomain: "constructive_dismissal",
      minParticipants: 1,
      minFacts: 1,
    },
  },
  {
    id: "contract-breach",
    titleHe: "הפרת חוזה מסחרי (מחוץ לתחום)",
    storyHe:
      "המרשה חתם על חוזה לאספקת סחורה מול ספק. הספק לא סיפק את הסחורה במועד והפר את החוזה. אנו שוקלים תביעה כספית בגין הפרת ההסכם המסחרי.",
    expect: {
      domainWithinScope: false,
      minParticipants: 0,
      minFacts: 0,
      expectsNoPreliminaryView: true,
    },
  },
  {
    id: "debt-collection",
    titleHe: "גביית חוב (מחוץ לתחום)",
    storyHe:
      "לקוח חייב למרשה סכום כסף עבור שירותים שסופקו. הוא אינו משלם למרות דרישות חוזרות. אנו רוצים לפתוח בהליך גבייה בהוצאה לפועל.",
    expect: {
      domainWithinScope: false,
      minParticipants: 0,
      minFacts: 0,
      expectsNoPreliminaryView: true,
    },
  },
  {
    id: "real-estate",
    titleHe: "סכסוך מקרקעין (מחוץ לתחום)",
    storyHe:
      "מדובר בסכסוך שכנים לגבי גבול מגרש והסגת גבול. השכן בנה גדר על חלק מהמקרקעין של המרשה. אנו שוקלים תביעה לסילוק יד.",
    expect: {
      domainWithinScope: false,
      minParticipants: 0,
      minFacts: 0,
      expectsNoPreliminaryView: true,
    },
  },
  {
    id: "personal-injury",
    titleHe: "נזקי גוף (מחוץ לתחום)",
    storyHe:
      "המרשה נפגע בתאונת דרכים ונגרמו לו נזקי גוף. אנו בוחנים תביעת פיצויים בגין נזק גוף מול חברת הביטוח של הנהג הפוגע.",
    expect: {
      domainWithinScope: false,
      minParticipants: 0,
      minFacts: 0,
      expectsNoPreliminaryView: true,
    },
  },
  {
    id: "partnership-dispute",
    titleHe: "סכסוך שותפים (מחוץ לתחום)",
    storyHe:
      "שני שותפים בעסק מסוכסכים לגבי חלוקת רווחים וניהול. אחד השותפים מבקש לפרק את השותפות ולקבל את חלקו. מדובר בדיני חברות ושותפויות.",
    expect: {
      domainWithinScope: false,
      minParticipants: 0,
      minFacts: 0,
      expectsNoPreliminaryView: true,
    },
  },
  {
    id: "ambiguous-out-of-domain",
    titleHe: "סיפור עמום ומחוץ לתחום",
    storyHe: "היה סכסוך. מישהו חייב למישהו משהו. לא ברור מה קרה בדיוק ואיך להמשיך.",
    expect: {
      domainWithinScope: false,
      minParticipants: 0,
      minFacts: 0,
      expectsNoPreliminaryView: true,
    },
  },
  {
    id: "conflicting-dates",
    titleHe: "מועדים סותרים (עבודה)",
    storyHe:
      "הלקוח פוטר ב-01/03/2026 לטענתו. לפי המעסיק הפיטורים נכנסו לתוקף ב-15/03/2026. שני הצדדים חלוקים על מועד הפיטורים. יש להגיש את התביעה תוך 30 יום.",
    expect: {
      domainWithinScope: true,
      subdomain: null,
      minParticipants: 0,
      minFacts: 2,
      expectsContradiction: true,
      expectsRelativeDeadlineNull: true,
    },
  },
  {
    id: "insufficient-facts",
    titleHe: "עובדות חסרות (עבודה)",
    storyHe: "הלקוח מרגיש שפוטר שלא בצדק מהעבודה. אין פרטים נוספים כרגע.",
    expect: {
      domainWithinScope: true,
      subdomain: null,
      minParticipants: 0,
      minFacts: 0,
      expectsNoPreliminaryView: true,
    },
  },
];
