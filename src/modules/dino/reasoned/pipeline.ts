/**
 * Reasoned Dino pipeline (Capability 4, Slice 4.1.0).
 *
 * The canonical live path: Conversation Engine → Matter Intelligence →
 * Legal Research Orchestrator → Legal Reasoning Engine → LegalOpinion →
 * provider adapter (renderer) → ReasonedDinoResponse. The LegalOpinion is the
 * exclusive reasoning authority; the provider receives ONLY the opinion (never
 * raw research). Provider output is validated; a conclusion/confidence change is
 * rejected and the deterministic structured opinion is used instead.
 */
import { buildConversationContext } from "../conversation/engine.ts";
import { runLegalResearch } from "../../legal-research/orchestrator.ts";
import { buildLegalOpinion } from "../../legal-reasoning/engine.ts";
import type { MatterIntelligence } from "../../matter/intelligence/types.ts";
import type { ReasonedProvider, ReasonedDinoResponse, ReasonedAnswerInput, ReasonedProse, ContextKind } from "./types.ts";
import { composeReasonedResponse } from "./compose.ts";
import { validateProviderProse } from "./validate.ts";

export interface ReasonedTurnInput {
  readonly question: string;
  readonly matterIntelligence: MatterIntelligence | null;
  readonly contextKind: ContextKind;
  readonly matterId: string | null;
  readonly history?: readonly { readonly role: "user" | "assistant"; readonly content: string }[];
  readonly nowISO?: string;
}
export interface ReasonedDeps {
  readonly provider: ReasonedProvider;
  readonly fallbackProvider: ReasonedProvider;
}

export async function runReasonedDinoTurn(input: ReasonedTurnInput, deps: ReasonedDeps): Promise<ReasonedDinoResponse> {
  const nowISO = input.nowISO ?? new Date().toISOString();
  const mi = input.matterIntelligence ?? null;

  const conversationContext = buildConversationContext({ intelligence: mi, message: input.question, history: input.history, nowISO });
  const research = await runLegalResearch({
    question: input.question,
    legalDomainHint: mi?.identity.legalDomain ?? null,
    procedureType: mi?.identity.procedureType ?? null,
    asOfISO: nowISO,
    factsConfirmed: (mi?.counts.establishedFacts ?? 0) > 0,
  });
  const opinion = buildLegalOpinion({ matterIntelligence: mi, conversationContext, legalResearch: research, nowISO });

  const answerInput: ReasonedAnswerInput = {
    opinion, locale: "he-IL", conversationStyle: "professional_brief",
    citationPresentationRules: { requirePinpointForConclusion: false, discoveryOnlyCannotSupport: true },
    userMessage: input.question,
  };
  const allowedIds = new Set([...opinion.applicableLegislation, ...opinion.applicableCaseLaw].map((a) => a.recordId));

  let prose: ReasonedProse;
  let usedFallback = false;
  let rejected = false;
  let providerId = "deterministic";

  if (deps.provider.available) {
    try {
      const raw = await deps.provider.generate(answerInput);
      const v = validateProviderProse(raw, opinion, allowedIds);
      if (v.ok) { prose = v.sanitized; providerId = raw.providerId; }
      else { rejected = true; usedFallback = true; prose = await deps.fallbackProvider.generate(answerInput); }
    } catch {
      usedFallback = true;
      prose = await deps.fallbackProvider.generate(answerInput);
    }
  } else {
    usedFallback = true;
    prose = await deps.fallbackProvider.generate(answerInput);
  }

  return composeReasonedResponse({
    question: input.question, contextKind: input.contextKind, matterId: input.matterId,
    opinion, research, prose,
    provider: { id: usedFallback ? "deterministic" : providerId, available: deps.provider.available, usedFallback, rejected },
    nowISO,
  });
}
