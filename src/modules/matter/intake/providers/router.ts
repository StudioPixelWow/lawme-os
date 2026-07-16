/**
 * IntakeProviderRouter — explicit mode selection + the deterministic validation
 * gate that ALWAYS runs after any provider (trusted or not).
 *
 *  - deterministic        → the DeterministicIntakeProvider (default).
 *  - model_assisted       → the model provider; if it is not enabled/configured
 *                           the router THROWS. It never silently falls back to
 *                           deterministic (that would hide a misconfiguration).
 *  - production_disabled  → refuses to extract at all.
 *
 * Regardless of mode, `validateSuggestions` re-checks every item: source spans
 * must literally match the input, fact statuses must be intake-only (an
 * established status from an untrusted provider is DROPPED), ambiguous deadlines
 * keep dueAt=null, and untrusted output is force-flagged for human review.
 */

import type { ProviderSuggestions } from "./types.ts";
import type { IntakeProviderMode, MatterIntakeExtractionProvider, ProviderInput } from "./types.ts";
import { DeterministicIntakeProvider } from "./deterministic-provider.ts";
import { ModelIntakeProvider } from "./model-provider.ts";
import { isIntakeFactStatus } from "../contracts.ts";

export interface ValidationViolation {
  itemId: string;
  kind: "span_mismatch" | "illegal_status" | "invented_date" | "missing_span";
  detailHe: string;
}

export interface RoutedExtraction {
  suggestions: ProviderSuggestions;
  violations: ValidationViolation[];
  mode: IntakeProviderMode;
  providerId: string;
}

export class IntakeProviderRouter {
  private readonly mode: IntakeProviderMode;
  private readonly deterministic: MatterIntakeExtractionProvider;
  private readonly model: MatterIntakeExtractionProvider;

  constructor(
    mode: IntakeProviderMode = "deterministic",
    providers?: { deterministic?: MatterIntakeExtractionProvider; model?: MatterIntakeExtractionProvider },
  ) {
    this.mode = mode;
    this.deterministic = providers?.deterministic ?? new DeterministicIntakeProvider();
    this.model = providers?.model ?? new ModelIntakeProvider();
  }

  /** Resolve the active provider — never silently falls back. */
  provider(): MatterIntakeExtractionProvider {
    if (this.mode === "production_disabled") {
      throw new Error("intake_provider_disabled: מצב production_disabled — חילוץ אינו מותר.");
    }
    if (this.mode === "model_assisted") {
      if (!this.model.enabled) {
        throw new Error(
          "intake_provider_misconfigured: מצב model_assisted נבחר אך ספק המודל אינו מאושר/מופעל. אין נפילה שקטה לדטרמיניסטי.",
        );
      }
      return this.model;
    }
    return this.deterministic;
  }

  async extract(input: ProviderInput): Promise<RoutedExtraction> {
    const provider = this.provider();
    const raw = await provider.extract(input);
    const { suggestions, violations } = validateSuggestions(raw, input);
    return { suggestions, violations, mode: this.mode, providerId: provider.id };
  }
}

/** Re-validate untrusted (and trusted) provider output. Pure. */
export function validateSuggestions(raw: ProviderSuggestions, input: ProviderInput): { suggestions: ProviderSuggestions; violations: ValidationViolation[] } {
  const violations: ValidationViolation[] = [];
  const textFor = (src: "story" | "pasted") => (src === "story" ? input.story : input.pasted);
  const trusted = raw.trusted;

  const spanOk = (item: { id: string; span: { source: "story" | "pasted"; start: number; end: number; quoteHe: string } | null }): boolean => {
    if (item.span === null) return true; // derived/inferred items may be span-less
    const t = textFor(item.span.source);
    return t.slice(item.span.start, item.span.end) === item.span.quoteHe;
  };

  const harden = <T extends { id: string; span: unknown; needsConfirmation: boolean; requiresHumanReview: boolean }>(item: T): T =>
    trusted ? item : { ...item, needsConfirmation: true, requiresHumanReview: true };

  const contacts = raw.contacts.filter((c) => {
    if (!spanOk(c)) {
      violations.push({ itemId: c.id, kind: "span_mismatch", detailHe: "מקור לא תואם לטקסט" });
      return false;
    }
    return true;
  }).map(harden);

  const facts = raw.facts
    .filter((f) => {
      if (!spanOk(f)) {
        violations.push({ itemId: f.id, kind: "span_mismatch", detailHe: "מקור לא תואם לטקסט" });
        return false;
      }
      if (!isIntakeFactStatus(f.value.suggestedStatus)) {
        // An established status can NEVER survive validation.
        violations.push({ itemId: f.id, kind: "illegal_status", detailHe: `סטטוס «${f.value.suggestedStatus}» אסור באינטייק` });
        return false;
      }
      return true;
    })
    .map(harden);

  const deadlines = raw.deadlines
    .filter((d) => {
      if (!spanOk(d)) {
        violations.push({ itemId: d.id, kind: "span_mismatch", detailHe: "מקור לא תואם לטקסט" });
        return false;
      }
      return true;
    })
    .map((d) => {
      // Honesty: an ambiguous/unknown-confidence deadline must not carry a date.
      if ((d.value.kind === "unknown_ambiguous" || d.value.deadlineConfidence === "unknown") && d.value.dueAt !== null) {
        violations.push({ itemId: d.id, kind: "invented_date", detailHe: "תאריך על מועד לא ודאי — אופס ל-null" });
        return { ...d, value: { ...d.value, dueAt: null } };
      }
      return d;
    })
    .map(harden);

  const mentionedDocuments = raw.mentionedDocuments.filter((m) => {
    if (!spanOk(m)) {
      violations.push({ itemId: m.id, kind: "span_mismatch", detailHe: "מקור לא תואם לטקסט" });
      return false;
    }
    return true;
  }).map(harden);

  return {
    suggestions: { ...raw, contacts, facts, deadlines, mentionedDocuments },
    violations,
  };
}
