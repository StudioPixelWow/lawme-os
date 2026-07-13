/**
 * Shared intelligence primitive — Domain Result envelope (Epic 4.1).
 * The neutral outer wrapper a domain orchestrator returns for one run
 * (a Matter assessment, a Dino pipeline run, …). Generic over the domain's
 * typed payload. Composition across domains happens in the application layer
 * over this shape — never by one domain importing another.
 */
import type { Warning } from "./warning.ts";
import type { ReviewRoute } from "./review-route.ts";

export type DomainKind =
  | "matter" | "dino" | "client" | "document" | "office" | "team" | "finance";

export interface DomainResult<TPayload> {
  domain: DomainKind;
  version: string;
  generatedAt: string;
  payload: TPayload;
  warnings?: Warning[];
  reviewRoute?: ReviewRoute | null;
  correlationId?: string;
}
