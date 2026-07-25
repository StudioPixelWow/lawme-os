/**
 * Dino Experience pipeline (Capability 3, Slice 3.2.0).
 *
 * The request flow: User Question → Conversation Engine → Matter Intelligence
 * (if available) → Legal Research Orchestrator → Provider Adapter → Grounded
 * Response. Grounding is decided here by LawME's verified research; a provider
 * writes prose ONLY in the "answered" path. Every failure mode (out of scope,
 * needs facts, no verified authority) is composed deterministically without any
 * model call — never fabricating.
 */
import { buildConversationContext } from "../conversation/engine.ts";
import { runLegalResearch } from "../../legal-research/orchestrator.ts";
import type { DinoTurnInput, DinoDeps, GroundedResponse, DinoResponseMode } from "./types.ts";
import { composeGroundedResponse } from "./response-composer.ts";
import { outOfScopeText, needsFactsText, noVerifiedAuthorityText } from "./failure-modes.ts";

export async function runDinoTurn(input: DinoTurnInput, deps: DinoDeps): Promise<GroundedResponse> {
  const nowISO = input.nowISO ?? new Date().toISOString();
  const mi = input.matterIntelligence ?? null;

  // Conversation Engine (matter-aware when a matter is present, else general).
  const conversationContext = buildConversationContext({
    intelligence: mi,
    message: input.question,
    history: input.history,
    nowISO,
  });

  // Legal Research Orchestrator — LawME's own verified investigation.
  const legalResearch = await runLegalResearch({
    question: input.question,
    legalDomainHint: mi?.identity.legalDomain ?? null,
    procedureType: mi?.identity.procedureType ?? null,
    asOfISO: nowISO,
    factsConfirmed: (mi?.counts.establishedFacts ?? 0) > 0,
  });

  const clarifications = conversationContext.clarificationQuestions;
  const needsClarification = conversationContext.answerability.level === "needs_clarification";
  const hasVerifiedAuthority = legalResearch.matchedLegislation.some((s) => s.usableForClaim) || legalResearch.matchedCases.some((s) => s.usableForClaim);

  let mode: DinoResponseMode;
  let summaryHe: string;
  let analysisHe: string;
  let proseProvider = "none";
  let noticeHe: string | null = null;

  if (!legalResearch.domain.inScope) {
    mode = "out_of_scope";
    const t = outOfScopeText();
    ({ summaryHe, analysisHe, noticeHe } = t);
  } else if (needsClarification) {
    mode = "needs_facts";
    const t = needsFactsText();
    ({ summaryHe, analysisHe, noticeHe } = t);
  } else if (!hasVerifiedAuthority) {
    mode = "no_verified_authority";
    const t = noVerifiedAuthorityText();
    ({ summaryHe, analysisHe, noticeHe } = t);
  } else {
    mode = "answered";
    const providerInput = { conversationContext, matterIntelligence: mi, legalResearchResult: legalResearch };
    let prose;
    try {
      prose = deps.provider.available
        ? await deps.provider.generate(providerInput)
        : await deps.fallbackProvider.generate(providerInput);
    } catch {
      prose = await deps.fallbackProvider.generate(providerInput);
    }
    summaryHe = prose.executiveSummaryHe;
    analysisHe = prose.legalAnalysisHe;
    proseProvider = prose.providerId;
  }

  return composeGroundedResponse({
    question: input.question,
    contextKind: input.contextKind,
    matterId: input.matterId,
    mode,
    grounded: mode === "answered",
    summaryHe,
    analysisHe,
    proseProvider,
    noticeHe,
    legalResearch,
    clarifications,
    includeSources: mode === "answered" || mode === "no_verified_authority",
    nowISO,
  });
}
