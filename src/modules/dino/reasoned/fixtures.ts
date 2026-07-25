/**
 * Review fixtures (Slice 4.1.0, Phase 16). Deterministic ReasonedDinoResponses
 * from realistic but clearly NON-PRODUCTION data, for review + screenshots. No
 * fixture is presented as verified live legal authority.
 */
import { buildMatterIntelligence } from "../../matter/intelligence/derive.ts";
import { workspaceFixtureInput } from "../../matter/workspace/fixtures.ts";
import { runReasonedDinoTurn } from "./pipeline.ts";
import { deterministicReasonedProvider, createAnthropicReasonedProvider } from "./providers.ts";
import type { ReasonedDinoResponse } from "./types.ts";

export const FIXTURE_NOW = "2026-07-25T09:00:00+03:00";
export type ReasonedScenario = "matter" | "general" | "missing" | "out_of_scope" | "provider_fallback";

const DET = { provider: deterministicReasonedProvider, fallbackProvider: deterministicReasonedProvider };

export async function reasonedFixtureResponse(name: ReasonedScenario, nowISO: string = FIXTURE_NOW): Promise<ReasonedDinoResponse> {
  const populated = buildMatterIntelligence(workspaceFixtureInput());
  const noFacts = buildMatterIntelligence({ ...workspaceFixtureInput(), facts: [] });

  switch (name) {
    case "matter":
      return runReasonedDinoTurn({ question: "האם פיטורי העובדת בהיריון היו כדין לפי חוק עבודת נשים?", matterIntelligence: populated, contextKind: "matter", matterId: populated.identity.matterId, nowISO }, DET);
    case "general":
      return runReasonedDinoTurn({ question: "מהו היקף ההגנה על עובדת בהיריון לפי סעיף 9 לחוק עבודת נשים?", matterIntelligence: null, contextKind: "general", matterId: null, nowISO }, DET);
    case "missing":
      return runReasonedDinoTurn({ question: "האם הפיטורים היו כדין?", matterIntelligence: noFacts, contextKind: "matter", matterId: noFacts.identity.matterId, nowISO }, DET);
    case "out_of_scope":
      return runReasonedDinoTurn({ question: "שאלה על ירושה וצוואה במשפחה", matterIntelligence: null, contextKind: "general", matterId: null, nowISO }, DET);
    case "provider_fallback":
      return runReasonedDinoTurn(
        { question: "האם פיטורי העובדת בהיריון היו כדין?", matterIntelligence: populated, contextKind: "matter", matterId: populated.identity.matterId, nowISO },
        { provider: createAnthropicReasonedProvider({ apiKey: "" }), fallbackProvider: deterministicReasonedProvider },
      );
  }
}
