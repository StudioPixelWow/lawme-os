/**
 * Deterministic search-plan generation (Slice 3.1.0). PURE. No AI.
 * One `SearchPlan` per registered adapter, driven by the extracted entities and
 * the topic→legislation map. No provider is hardcoded — plans are produced for
 * whatever adapters are registered.
 */
import { TOPIC_LEGISLATION } from "../legal-knowledge/triad/coverage.ts";
import type {
  SearchPlan, SearchFilters, ExtractedEntities, KnowledgeSourceAdapter,
  LegalResearchRequest, AuthorityPreference,
} from "./types.ts";

function courtLevelsFrom(courts: readonly string[]): string[] {
  const out = new Set<string>();
  for (const c of courts) {
    if (c.includes("העליון") || c.includes("בג")) out.add("supreme");
    else if (c.includes("הארצי")) out.add("national_labor");
    else if (c.includes("הדין")) out.add("regional_labor");
    else out.add("other");
  }
  return [...out];
}

function refIdsFor(topics: readonly string[]): string[] {
  const out = new Set<string>();
  for (const t of topics) for (const r of TOPIC_LEGISLATION[t] ?? []) out.add(r);
  return [...out];
}

export function buildSearchPlans(
  entities: ExtractedEntities,
  request: LegalResearchRequest,
  adapters: readonly KnowledgeSourceAdapter[],
): SearchPlan[] {
  const authorityPreference: AuthorityPreference = request.authorityPreference ?? "binding_first";
  const queryTerms = [...new Set([...entities.concepts, ...entities.laws, ...entities.sections])];
  const baseFilters: SearchFilters = {
    authorityPreference,
    courtLevels: [],
    dateFromISO: null,
    dateToISO: request.asOfISO ?? null,
    onlyVerified: false,
  };

  return adapters.map((adapter) => {
    if (adapter.kind === "legislation") {
      return {
        id: `${adapter.id}-plan`,
        sourceId: adapter.id,
        sourceKind: adapter.kind,
        queryTerms,
        topics: entities.topics,
        sections: entities.sections,
        refIds: refIdsFor(entities.topics),
        filters: baseFilters,
        rationaleHe: "איתור החקיקה המחייבת הרלוונטית לפי הנושא, הסעיפים והמונחים שזוהו.",
      } satisfies SearchPlan;
    }
    if (adapter.kind === "case_law") {
      return {
        id: `${adapter.id}-plan`,
        sourceId: adapter.id,
        sourceKind: adapter.kind,
        queryTerms,
        topics: entities.topics,
        sections: [],
        refIds: [],
        filters: { ...baseFilters, courtLevels: courtLevelsFrom(entities.courts) },
        rationaleHe: "איתור פסיקה רלוונטית לפי הנושא והערכאות, בעדיפות למחייבת ולעדכנית.",
      } satisfies SearchPlan;
    }
    // Generic plan for future adapters (regulations, guidance, internal, …).
    return {
      id: `${adapter.id}-plan`,
      sourceId: adapter.id,
      sourceKind: adapter.kind,
      queryTerms,
      topics: entities.topics,
      sections: entities.sections,
      refIds: [],
      filters: baseFilters,
      rationaleHe: "חיפוש כללי במקור הידע לפי הנושא והמונחים שזוהו.",
    } satisfies SearchPlan;
  });
}
