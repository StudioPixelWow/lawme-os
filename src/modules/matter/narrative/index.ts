/** Matter Narrative (Epic 4.2) — public surface. */
export * from "./types.ts";
export * from "./formatters.ts";
export { prioritizeActions } from "./prioritizer.ts";
export {
  buildNarrative, oneLineHe, morningBriefingHe, fullBriefingHe,
  type NarrativeOptions,
} from "./narrative-engine.ts";
