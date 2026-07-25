/**
 * Conflict detection (Slice 3.1.0). PURE + DETERMINISTIC. No AI.
 * Detects duplicate authorities, overruled/limited precedents, potentially
 * conflicting rulings on a shared topic, and obsolete legislation.
 */
import type { CanonicalSource, Conflict } from "./types.ts";

export function detectConflicts(sources: readonly CanonicalSource[]): Conflict[] {
  const conflicts: Conflict[] = [];

  // 1) Duplicate authority — identical citation across distinct records.
  const byCitation = new Map<string, string[]>();
  for (const s of sources) {
    const list = byCitation.get(s.citationHe) ?? [];
    if (!list.includes(s.recordId)) list.push(s.recordId);
    byCitation.set(s.citationHe, list);
  }
  for (const [citation, ids] of byCitation) {
    if (ids.length > 1) {
      conflicts.push({ kind: "duplicate_authority", severity: "info", descriptionHe: `אזכור כפול של אותה אסמכתה: ${citation}`, recordIds: ids.sort() });
    }
  }

  // 2) Overruled / limited precedents.
  for (const s of sources) {
    if (s.status === "overruled") {
      conflicts.push({ kind: "overruled_precedent", severity: "critical", descriptionHe: `הלכה שבוטלה בפסיקה מאוחרת: ${s.citationHe} — אין להסתמך`, recordIds: [s.recordId] });
    } else if (s.status === "limited") {
      conflicts.push({ kind: "overruled_precedent", severity: "warning", descriptionHe: `הלכה שצומצמה בפסיקה מאוחרת: ${s.citationHe} — יש להשתמש בזהירות`, recordIds: [s.recordId] });
    }
  }

  // 3) Potentially conflicting rulings — a topic carrying both a standing case
  //    and an overruled/limited one signals later-treatment tension.
  const cases = sources.filter((s) => s.sourceKind === "case_law");
  const topics = new Set<string>();
  for (const c of cases) for (const t of c.topics) topics.add(t);
  for (const topic of [...topics].sort()) {
    const inTopic = cases.filter((c) => c.topics.includes(topic));
    const unstable = inTopic.filter((c) => c.status === "overruled" || c.status === "limited");
    const standing = inTopic.filter((c) => c.status === "unknown" || c.status === "current");
    if (unstable.length > 0 && standing.length > 0) {
      conflicts.push({
        kind: "conflicting_ruling",
        severity: "warning",
        descriptionHe: `בנושא "${topic}" קיימת פסיקה עומדת לצד פסיקה שבוטלה/צומצמה — נדרשת הכרעה על ההלכה המחייבת`,
        recordIds: [...unstable, ...standing].map((c) => c.recordId).sort(),
      });
    }
  }

  // 4) Obsolete legislation.
  for (const s of sources) {
    if (s.sourceKind === "legislation" && (s.status === "repealed" || s.status === "historical")) {
      conflicts.push({ kind: "obsolete_legislation", severity: "critical", descriptionHe: `חקיקה שאינה בתוקף: ${s.citationHe}`, recordIds: [s.recordId] });
    }
  }

  return conflicts;
}
