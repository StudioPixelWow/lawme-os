/**
 * DeterministicIntakeProvider — the default, authoritative extraction provider.
 * Wraps the approved deterministic Hebrew extractors. Offline/CI-safe, makes no
 * network calls, and is trusted (its output is valid by construction — yet the
 * router still re-validates it, so the guarantee holds uniformly).
 */

import {
  extractDates,
  extractDocuments,
  extractFacts,
  extractParticipants,
} from "../extractors.ts";
import type { MatterIntakeExtractionProvider, ProviderInput, ProviderSuggestions } from "./types.ts";

export const DETERMINISTIC_PROVIDER_ID = "deterministic-intake-1.0.0";

export class DeterministicIntakeProvider implements MatterIntakeExtractionProvider {
  readonly id = DETERMINISTIC_PROVIDER_ID;
  readonly makesNetworkCalls = false;
  readonly enabled = true;

  async extract(input: ProviderInput): Promise<ProviderSuggestions> {
    const { story, pasted, atISO } = input;
    return {
      contacts: [
        ...extractParticipants(story, "story", atISO),
        ...(pasted ? extractParticipants(pasted, "pasted", atISO) : []),
      ],
      facts: [
        ...extractFacts(story, "story", atISO),
        ...(pasted ? extractFacts(pasted, "pasted", atISO) : []),
      ],
      deadlines: [
        ...extractDates(story, "story", atISO),
        ...(pasted ? extractDates(pasted, "pasted", atISO) : []),
      ],
      mentionedDocuments: [
        ...extractDocuments(story, "story", atISO),
        ...(pasted ? extractDocuments(pasted, "pasted", atISO) : []),
      ],
      providerId: this.id,
      trusted: true,
    };
  }
}
