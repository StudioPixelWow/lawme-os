/**
 * Server ActorContext resolution core (Capability 0.8, Slice 0.8.2).
 *
 * Pure, testable seam that turns a SERVER-VERIFIED auth user id + repository +
 * (optional) requested organization into the canonical ActorContext, reusing the
 * Slice 0.8.1 resolver. It NEVER accepts actor identity from a request body,
 * query, or header, and NEVER falls back to a demo identity. The Next-integrated
 * wrapper lives in `server.ts`.
 */
import type { ActorContext } from "./actor-context.ts";
import type { ActorIdentityRepository } from "./repository.ts";
import { resolveActorContext } from "./resolution.ts";
import { IdentityAuthorizationError } from "./errors.ts";
import { ensureCorrelationId } from "./correlation.ts";

export interface ServerResolutionInput {
  /** Server-VERIFIED auth user id (auth.users.id), or null/undefined if anonymous. */
  readonly authUserId: string | null | undefined;
  readonly repository: ActorIdentityRepository;
  /** Active organization to act in (from the revalidated cookie / selection). */
  readonly requestedOrganizationId?: string;
  readonly correlationId?: string;
}

/**
 * Resolve the canonical ActorContext from a verified server session.
 * Throws IdentityAuthorizationError: UNAUTHENTICATED when no verified user,
 * otherwise the resolver's stable codes.
 */
export async function resolveServerActorContext(input: ServerResolutionInput): Promise<ActorContext> {
  const correlationId = ensureCorrelationId(input.correlationId);
  if (typeof input.authUserId !== "string" || input.authUserId.length === 0) {
    throw new IdentityAuthorizationError("UNAUTHENTICATED", correlationId);
  }
  return resolveActorContext(input.repository, {
    authUserId: input.authUserId,
    requestedOrganizationId: input.requestedOrganizationId,
    correlationId,
  });
}
