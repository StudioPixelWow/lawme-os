/**
 * Server-side research runner for the dev interface.
 * Data source selection (server env only — no secrets reach the client):
 *  - SUPABASE_URL + SUPABASE_SECRET_KEY present → Development database
 *  - otherwise → in-memory fixture corpus, seeded through the SAME
 *    repository contract (labeled in the UI).
 */
import "server-only";
import { createRepositories } from "../../../modules/legal-knowledge/repositories/index.ts";
import { seedThroughRepositories } from "../../../modules/legal-knowledge/seed/seed-fixtures.ts";
import { runDbResearch } from "../../../modules/legal-knowledge/research/engine-db.ts";
import type { DbResearchRequest, DbResearchResult } from "../../../modules/legal-knowledge/research/engine-db.ts";
import type { Repositories } from "../../../modules/legal-knowledge/repositories/types.ts";

let cached: Repositories | null = null;

async function getRepositories(): Promise<Repositories> {
  if (cached) return cached;
  const repos = createRepositories();
  if (repos.kind === "in-memory") {
    // fixture-seed the in-memory store once per server instance
    await seedThroughRepositories(repos);
  }
  cached = repos;
  return repos;
}

export async function runDevResearch(request: DbResearchRequest): Promise<DbResearchResult> {
  const repos = await getRepositories();
  return runDbResearch(repos, request);
}
