/**
 * Prompt-injection defense for intake input — especially PASTED text.
 *
 * LawME has no live model in this slice, so there is no prompt to inject into
 * today. But the safety contract is permanent: pasted content (a client email,
 * a WhatsApp dump) is DATA, never instructions. It must never be able to change
 * a policy, a system prompt, a tool permission, or the pipeline's behavior.
 *
 * This module (1) normalizes/sanitizes the raw text (control chars, zero-width
 * and bidi-override characters that could hide instructions), and (2) DETECTS —
 * but does not obey — instruction-like content, returning neutral warnings the
 * reviewer can see. The pipeline treats detected instructions as inert text.
 */

export interface SanitizeResult {
  /** Cleaned text used by every downstream stage. Spans index into THIS. */
  clean: string;
  /** True if any injection-style content was detected (surfaced as a warning). */
  injectionDetected: boolean;
  /** Human-readable, Hebrew warnings for the reviewer. Never executed. */
  warningsHe: string[];
  /** The concrete phrases we neutralized, for audit (kept as data). */
  neutralizedPhrases: string[];
}

// Characters that can smuggle hidden instructions or reverse display order:
// C0 controls (but keeping tab and newline), zero-width chars, BOM, and bidi
// overrides. Built from explicit escapes so no invisible bytes live in source.
// Stripped before any span indexing so spans are honest.
const DANGEROUS_CHARS = new RegExp(
  "[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F" + // C0 controls (minus \t,\n)
    "\\u200B\\u200C\\u200D\\uFEFF" + // zero-width + BOM
    "\\u200E\\u200F\\u202A-\\u202E\\u2066-\\u2069]", // bidi controls/overrides
  "g",
);

// Instruction-injection signatures (English + Hebrew). Detected, not obeyed.
const INJECTION_PATTERNS: Array<{ re: RegExp; he: string }> = [
  { re: /ignore (all|any|the)?\s*(previous|prior|above)\s+instructions?/i, he: "ניסיון לעקוף הוראות קודמות" },
  { re: /disregard (the|all|any)?\s*(system|previous)/i, he: "ניסיון להתעלם מהנחיות המערכת" },
  { re: /\bsystem\s*prompt\b/i, he: "התייחסות ל־system prompt" },
  { re: /\b(you are|act as|pretend to be|roleplay)\b/i, he: "ניסיון להגדיר מחדש את התפקיד" },
  { re: /\b(developer|admin|root)\s*mode\b/i, he: "ניסיון להפעיל מצב הרשאות" },
  { re: /\b(grant|enable|disable)\s+(tool|permission|access)/i, he: "ניסיון לשנות הרשאות" },
  { re: /change (the|your)?\s*(policy|rules|settings)/i, he: "ניסיון לשנות מדיניות" },
  { re: /\boverride\b.*\b(policy|rule|safety)/i, he: "ניסיון לעקוף כללי בטיחות" },
  { re: /התעלם\s+מ(כל\s+)?ההוראות/i, he: "ניסיון לעקוף הוראות קודמות (עברית)" },
  { re: /שנה\s+את\s+ה(מדיניות|כללים|הרשאות)/i, he: "ניסיון לשנות מדיניות (עברית)" },
  { re: /אתה\s+עכשיו\b/i, he: "ניסיון להגדיר מחדש את התפקיד (עברית)" },
];

/**
 * Normalize and defensively scan the text. The returned `clean` string is what
 * every extractor reads; spans index into it. Instruction-like phrases are left
 * in place AS TEXT (so the reviewer sees them) but flagged — the pipeline never
 * acts on them.
 */
export function sanitizeIntakeText(raw: string, label: "story" | "pasted"): SanitizeResult {
  const warningsHe: string[] = [];
  const neutralizedPhrases: string[] = [];

  // 1) strip dangerous/invisible characters, normalize newlines + whitespace runs.
  const clean = (raw ?? "")
    .replace(DANGEROUS_CHARS, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // 2) detect (never obey) injection signatures.
  let injectionDetected = false;
  for (const { re, he } of INJECTION_PATTERNS) {
    const m = clean.match(re);
    if (m) {
      injectionDetected = true;
      neutralizedPhrases.push(m[0]);
      if (!warningsHe.includes(he)) warningsHe.push(he);
    }
  }
  if (injectionDetected) {
    warningsHe.unshift(
      label === "pasted"
        ? "בטקסט שהודבק זוהו ניסוחים שנראים כהוראות למערכת. הם מטופלים כטקסט בלבד ואינם משנים מדיניות, הרשאות או התנהגות."
        : "בסיפור זוהו ניסוחים שנראים כהוראות למערכת. הם מטופלים כטקסט בלבד.",
    );
  }

  return { clean, injectionDetected, warningsHe, neutralizedPhrases };
}
