/**
 * ModelIntakeProvider — a GUARDED, DISABLED shell.
 *
 * This is the seam where an APPROVED model provider would later plug in as an
 * UNTRUSTED extraction assistant. In this Part it is intentionally inert:
 *  - disabled by default (`enabled = false`);
 *  - refuses to execute without explicit configuration;
 *  - makes NO network calls (`makesNetworkCalls = false`) — flipping that flag
 *    requires a separate provider-security review + founder approval;
 *  - no provider-specific SDK types leak into the domain contracts.
 *
 * When enabled in the future, its output would be marked `trusted: false`, and
 * the router would re-validate every item through the deterministic validators
 * before it could enter an Intake Draft.
 */

import type { MatterIntakeExtractionProvider, ProviderInput, ProviderSuggestions } from "./types.ts";

export interface ModelProviderConfig {
  /** Must be explicitly true AND the network flag separately approved. */
  enabled: boolean;
  /** Opaque adapter id (e.g. "anthropic", "openai") — NOT a live client here. */
  adapterId?: string;
}

export class ModelProviderNotConfiguredError extends Error {
  constructor(reasonHe: string) {
    super(`model_provider_disabled: ${reasonHe}`);
    this.name = "ModelProviderNotConfiguredError";
  }
}

export class ModelIntakeProvider implements MatterIntakeExtractionProvider {
  readonly id = "model-intake-shell-1.0.0";
  // Permanently false in this Part — no network provider is approved yet.
  readonly makesNetworkCalls = false;
  readonly enabled: boolean;
  private readonly adapterId?: string;

  constructor(config: ModelProviderConfig = { enabled: false }) {
    this.enabled = config.enabled === true;
    this.adapterId = config.adapterId;
  }

  async extract(input: ProviderInput): Promise<ProviderSuggestions> {
    void input; // input is intentionally ignored — the shell never processes it.
    // Fail closed. No silent degradation, no fabricated suggestions.
    throw new ModelProviderNotConfiguredError(
      this.enabled
        ? `אין מתאם מודל מאושר (${this.adapterId ?? "לא הוגדר"}); נדרשת בדיקת אבטחת ספק ואישור מייסד.`
        : "ספק המודל מושבת כברירת מחדל.",
    );
  }
}
