/**
 * Matter Profile (Epic 4.2) — the composed, additive output.
 * Runs the existing Matter Intelligence assessment, then derives the Matter
 * Score, prioritized actions, and the deterministic Matter Narrative — all from
 * the SAME MatterState and the SAME assessment ids. Backward compatible: the
 * original MatterState is preserved verbatim; score/narrative are additive.
 * No engine logic is altered.
 */
import type { Matter } from "./types.ts";
import { assessMatter, type AssessMatterOptions, type MatterState } from "./intelligence.ts";
import { computeMatterScore, type MatterScore, type ScoreResolveOptions } from "./score/index.ts";
import { prioritizeActions } from "./narrative/prioritizer.ts";
import { buildNarrative, type NarrativeOptions } from "./narrative/narrative-engine.ts";
import type { PrioritizedAction, MatterNarrative } from "./narrative/types.ts";

export const MATTER_PROFILE_VERSION = "matter-profile-1.0.0";

export interface MatterProfile {
  state: MatterState;
  score: MatterScore;
  prioritizedActions: PrioritizedAction[];
  narrative: MatterNarrative;
  version: string;
}

export interface MatterProfileOptions {
  assess?: AssessMatterOptions;
  score?: ScoreResolveOptions;
  narrative?: NarrativeOptions;
}

/** Compose the full additive Matter profile from a living Matter. */
export function buildMatterProfile(matter: Matter, opts: MatterProfileOptions = {}): MatterProfile {
  const state = assessMatter(matter, opts.assess);
  return profileFromState(state, opts);
}

/** Same composition, but from an already-computed MatterState. */
export function profileFromState(state: MatterState, opts: MatterProfileOptions = {}): MatterProfile {
  const score = computeMatterScore(state, opts.score);
  const prioritizedActions = prioritizeActions(state);
  const narrative = buildNarrative(state, score, opts.narrative);
  return { state, score, prioritizedActions, narrative, version: MATTER_PROFILE_VERSION };
}
