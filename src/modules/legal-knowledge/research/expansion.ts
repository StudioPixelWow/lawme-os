/**
 * Controlled Hebrew legal-term expansion — employment-law POC dictionary.
 * DELIBERATELY a closed, reviewable list (no model in the loop): every
 * expansion is visible, logged and auditable. Extending the dictionary is
 * a reviewed change, not a runtime behavior.
 */

export interface ExpansionEntry {
  trigger: string[];      // any of these tokens/phrases in the query…
  add: string[];          // …adds these search terms
  note: string;
}

export const EMPLOYMENT_EXPANSIONS: ExpansionEntry[] = [
  {
    trigger: ["פיצויי פיטורים", "פיצויים"],
    add: ["חוק פיצויי פיטורים", "סעיף 14", "השלמת פיצויים", "התפטרות בדין מפוטר"],
    note: "severance core",
  },
  {
    trigger: ["התפטרות", "הרעת תנאים"],
    add: ["הרעה מוחשית", "סעיף 11(א)", "התפטרות בדין מפוטר", "הזדמנות לתקן"],
    note: "constructive dismissal",
  },
  {
    trigger: ["שימוע"],
    add: ["חובת השימוע", "זימון לשימוע", "פגם דיוני", "תום לב", "פיטורים שלא כדין"],
    note: "hearing duty",
  },
  {
    trigger: ["הריון", "בהיריון", "היריון"],
    add: ["חוק עבודת נשים", "סעיף 9", "היתר פיטורים", "התקופה המוגנת", "הפליה"],
    note: "pregnancy protection",
  },
  {
    trigger: ["שעות נוספות"],
    add: ["חוק שעות עבודה ומנוחה", "גמול שעות נוספות", "תיקון 24", "חוק הגנת השכר", "משרת אמון", "נטל ההוכחה"],
    note: "overtime",
  },
  {
    trigger: ["פרילנסר", "קבלן", "עצמאי"],
    add: ["יחסי עובד מעסיק", "מבחן ההשתלבות", "המבחן המעורב", "מעמד עובד"],
    note: "worker classification",
  },
  {
    trigger: ["פנסיה", "הפרשות"],
    add: ["צו הרחבה", "ביטוח פנסיוני", "הסדר מיטיב", "קופת גמל"],
    note: "pension",
  },
  {
    trigger: ["הודעה מוקדמת"],
    add: ["חוק הודעה מוקדמת", "חלף הודעה מוקדמת"],
    note: "notice period",
  },
  {
    trigger: ["הטרדה מינית", "הטרדה"],
    add: ["החוק למניעת הטרדה מינית", "אחראית למניעת הטרדה", "תקנון", "אחריות מעסיק"],
    note: "harassment",
  },
  {
    trigger: ["מחלה", "דמי מחלה"],
    add: ["חוק דמי מחלה", "צבירת ימי מחלה"],
    note: "sick leave",
  },
  {
    trigger: ["חופשה", "חופשה שנתית"],
    add: ["חוק חופשה שנתית", "פדיון חופשה"],
    note: "vacation",
  },
  {
    trigger: ["הלנת שכר", "שכר"],
    add: ["חוק הגנת השכר", "פיצויי הלנה", "תלוש שכר"],
    note: "wage protection",
  },
  {
    trigger: ["חופשת לידה", "התקופה המוגנת", "לאחר לידה"],
    add: ["חוק עבודת נשים", "היתר פיטורים", "60 ימים", "התקופה המוגנת", "הריון"],
    note: "post-maternity protection",
  },
  {
    trigger: ["שוויון", "הפליה", "אפליה"],
    add: ["חוק שוויון ההזדמנויות בעבודה", "פיצוי ללא הוכחת נזק", "הפליה מחמת היריון", "נטל ההוכחה"],
    note: "equal opportunity",
  },
  {
    trigger: ["הסכם קיבוצי", "צו הרחבה", "צו ההרחבה"],
    add: ["צו הרחבה", "ביטוח פנסיוני", "עיקר העיסוק", "ההוראה המיטיבה", "ילקוט הפרסומים"],
    note: "collective & extension orders",
  },
  {
    trigger: ["קבלנית", "הכרה בדיעבד", "יחסי עבודה"],
    add: ["יחסי עובד מעסיק", "מבחן ההשתלבות", "המבחן המעורב", "קיזוז", "השבה"],
    note: "retroactive employee recognition",
  },
];

export interface ExpandedQuery {
  original: string;
  terms: string[];        // original significant terms
  expansions: string[];   // added terms
  matchedNotes: string[]; // which dictionary entries fired (for the audit log)
}

export function expandQuery(query: string): ExpandedQuery {
  const q = query.trim();
  const expansions = new Set<string>();
  const matchedNotes: string[] = [];
  for (const entry of EMPLOYMENT_EXPANSIONS) {
    if (entry.trigger.some((t) => q.includes(t))) {
      entry.add.forEach((a) => expansions.add(a));
      matchedNotes.push(entry.note);
    }
  }
  return {
    original: q,
    terms: [q],
    expansions: [...expansions],
    matchedNotes,
  };
}
