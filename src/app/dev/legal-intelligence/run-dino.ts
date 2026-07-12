/**
 * Server-side Dino pipeline runner for the dev interface (Epic 3A, Phase 28).
 * Development only. Shares the same repository selection as research:
 * Development DB when SUPABASE_URL + SUPABASE_SECRET_KEY are set, else the
 * in-memory synthetic corpus. NEVER exposes model chain-of-thought — only
 * the structured, auditable pipeline artifacts.
 */
import "server-only";
import { createRepositories } from "../../../modules/legal-knowledge/repositories/index.ts";
import { seedThroughRepositories } from "../../../modules/legal-knowledge/seed/seed-fixtures.ts";
import { runDinoPipeline } from "../../../modules/dino/orchestrator.ts";
import type { DinoRunResult } from "../../../modules/dino/core/pipeline-result.ts";
import type { DinoRequest } from "../../../modules/dino/core/request.ts";
import type { Repositories } from "../../../modules/legal-knowledge/repositories/types.ts";

let cached: Repositories | null = null;

async function getRepositories(): Promise<Repositories> {
  if (cached) return cached;
  const repos = createRepositories();
  if (repos.kind === "in-memory") await seedThroughRepositories(repos);
  cached = repos;
  return repos;
}

export async function runDevDino(request: DinoRequest): Promise<DinoRunResult> {
  const repos = await getRepositories();
  return runDinoPipeline(repos, request, { mode: "development" });
}
