/**
 * Capability 1 · Slice 1.0.5 — Canonical Bootstrap use case.
 *
 * confirmIntakeDraftAndBootstrapMatter(command, deps)
 *
 * The ONE supported Matter-creation flow. It contains NO route-local role or
 * confidentiality branches, NO direct repository Matter insert, and NO duplicated
 * validation/planner logic. Ordered flow:
 *   1. (ActorContext already resolved by the caller and passed in `deps.actor`.)
 *   2. authorize the canonical `intake.confirm` action (opaque denial).
 *   3. load the immutable Draft snapshot (authorized + RLS + org-scoped).
 *   4. load Resolved reference facts (DB reads only).
 *   5. build the validation context from SERVER-AUTHORITATIVE values only.
 *   6. validate → stop with issues if invalid (NO planner/RPC call).
 *   7. plan the aggregate.
 *   8. invoke the controlled RPC gateway.
 *   9. map to a safe result; reveal a Matter id only if the created Matter is
 *      read-authorized for the actor.
 */

import {
  AggregatePlanningError,
  BOOTSTRAP_VALIDATION_VERSION,
  planMatterAggregate,
  validateBootstrapDraft,
  type BootstrapValidationContext,
} from "../bootstrap/index.ts";
import type { ActorContext } from "../../identity/actor-context.ts";
import type { ResourceAuthorizationService } from "../../identity/authorization-integration/index.ts";
import type { ConfirmIntakeDraftCommand } from "./command.ts";
import type { BootstrapDraftSnapshotLoader } from "./draft-snapshot-loader.ts";
import type { BootstrapReferenceFactsLoader } from "./reference-facts-loader.ts";
import type { BootstrapMatterRpcGateway } from "./rpc-gateway.ts";
import { mapRpcNonSuccess, toSafeValidationIssues, toSafeValidationWarnings } from "./errors.ts";
import { type BootstrapMatterApplicationResult, messageForKind } from "./result.ts";
import { noopBootstrapTelemetry, type BootstrapTelemetry } from "./telemetry.ts";

export interface ConfirmIntakeDraftDependencies {
  readonly actor: ActorContext;
  readonly authorization: ResourceAuthorizationService;
  readonly draftLoader: BootstrapDraftSnapshotLoader;
  readonly referenceLoader: BootstrapReferenceFactsLoader;
  readonly rpcGateway: BootstrapMatterRpcGateway;
  readonly clock: () => string;
  readonly telemetry?: BootstrapTelemetry;
  /**
   * Testing seam only — defaults to the real pure engines. Production callers
   * omit this; it exists so tests can drive validation/planner outcomes and
   * assert invocation counts without duplicating engine logic.
   */
  readonly engine?: {
    readonly validate?: typeof validateBootstrapDraft;
    readonly plan?: typeof planMatterAggregate;
  };
}

function notAvailable(correlationId: string): BootstrapMatterApplicationResult {
  return { kind: "RESOURCE_NOT_AVAILABLE", correlationId, messageHe: messageForKind("RESOURCE_NOT_AVAILABLE") };
}

function internalFailure(correlationId: string): BootstrapMatterApplicationResult {
  return {
    kind: "BOOTSTRAP_INTERNAL_FAILURE",
    correlationId,
    messageHe: messageForKind("BOOTSTRAP_INTERNAL_FAILURE"),
  };
}

async function matterReadable(
  auth: ResourceAuthorizationService,
  actor: ActorContext,
  matterId: string,
): Promise<boolean> {
  const decision = await auth.authorizeResourceRequest(actor, {
    resourceType: "matter",
    action: "matter.read",
    matterIdOrSlug: matterId,
  });
  return decision.allowed;
}

export async function confirmIntakeDraftAndBootstrapMatter(
  command: ConfirmIntakeDraftCommand,
  deps: ConfirmIntakeDraftDependencies,
): Promise<BootstrapMatterApplicationResult> {
  const { actor, authorization, draftLoader, referenceLoader, rpcGateway } = deps;
  const validate = deps.engine?.validate ?? validateBootstrapDraft;
  const plan = deps.engine?.plan ?? planMatterAggregate;
  const telemetry: BootstrapTelemetry = deps.telemetry ?? noopBootstrapTelemetry;
  const correlationId = actor.request.correlationId;
  const draftId = command.intakeDraftId;
  const base = { correlationId, organizationId: actor.organization.id, actorProfileId: actor.actor.profileId, draftId };

  try {
    // (2) authorize intake.confirm — opaque denial (no leakage of why).
    telemetry.record({ ...base, phase: "authorize" });
    const decision = await authorization.authorizeResourceRequest(actor, {
      resourceType: "intake_draft",
      action: "intake.confirm",
      draftId,
    });
    if (!decision.allowed) return notAvailable(correlationId);

    // (3) load the immutable Draft snapshot.
    telemetry.record({ ...base, phase: "load_draft" });
    const rawDraft = await draftLoader.load(actor, draftId);
    if (rawDraft === null) return notAvailable(correlationId);

    // (4) load reference facts.
    telemetry.record({ ...base, phase: "load_references" });
    const referenceFacts = await referenceLoader.load(actor, rawDraft);

    // (5) build the validation context — SERVER-AUTHORITATIVE values only.
    const context: BootstrapValidationContext = {
      activeOrganizationId: actor.organization.id,
      actorProfileId: actor.actor.profileId,
      expectedDraftVersion: command.expectedDraftVersionToken,
      validatedAt: deps.clock(),
      approvals: command.approvals ?? {},
      correlationId,
      validationVersion: BOOTSTRAP_VALIDATION_VERSION,
    };

    // (6) validate.
    telemetry.record({ ...base, phase: "validate" });
    const validation = validate(rawDraft, referenceFacts, context);
    if (!validation.valid || validation.normalizedDraft === undefined) {
      const codes = validation.blockingIssues.map((i) => i.stableCode);
      telemetry.record({ ...base, phase: "validate", validationIssueCodes: codes });

      // A draft already bootstrapped reconciles idempotently.
      if (codes.includes("DRAFT_ALREADY_CONFIRMED") && rawDraft.confirmedMatterId) {
        const readable = await matterReadable(authorization, actor, rawDraft.confirmedMatterId);
        return {
          kind: "MATTER_ALREADY_CREATED",
          correlationId,
          messageHe: messageForKind("MATTER_ALREADY_CREATED"),
          idempotent: true,
          matterId: readable ? rawDraft.confirmedMatterId : null,
          matterHref: readable ? `/matters/${rawDraft.confirmedMatterId}` : null,
        };
      }
      // A version conflict is a staleness condition, not a content defect.
      if (codes.includes("DRAFT_VERSION_CONFLICT")) {
        return { kind: "DRAFT_STALE", correlationId, messageHe: messageForKind("DRAFT_STALE") };
      }
      return {
        kind: "VALIDATION_BLOCKED",
        correlationId,
        messageHe: messageForKind("VALIDATION_BLOCKED"),
        issues: toSafeValidationIssues(validation.blockingIssues),
        warnings: toSafeValidationWarnings(validation.warnings),
      };
    }

    // (7) plan the aggregate.
    telemetry.record({ ...base, phase: "plan" });
    let aggregatePlan;
    try {
      aggregatePlan = plan(validation.normalizedDraft);
    } catch (cause) {
      if (cause instanceof AggregatePlanningError) return internalFailure(correlationId);
      throw cause;
    }

    // (8) invoke the controlled RPC gateway.
    telemetry.record({ ...base, phase: "rpc", planHash: aggregatePlan.metadata.planHash });
    const outcome = await rpcGateway.bootstrap({
      plan: aggregatePlan,
      draft: {
        id: rawDraft.draftId,
        versionToken: rawDraft.versionToken,
        schemaVersion: rawDraft.schemaVersion,
      },
      idempotencyKey: command.confirmationIdempotencyKey,
      correlationId,
    });

    // (9) map to a safe result.
    telemetry.record({ ...base, phase: "map_result", rpcCode: outcome.code });
    if (outcome.code === "BOOTSTRAP_CREATED") {
      const readable = await matterReadable(authorization, actor, outcome.matterId);
      telemetry.record({ ...base, phase: "complete", resultKind: "MATTER_CREATED", idempotent: false });
      if (!readable) {
        // Created, but the actor cannot read it — return success without a Matter id.
        return {
          kind: "MATTER_ALREADY_CREATED",
          correlationId,
          messageHe: messageForKind("MATTER_ALREADY_CREATED"),
          idempotent: true,
          matterId: null,
          matterHref: null,
        };
      }
      return {
        kind: "MATTER_CREATED",
        correlationId,
        messageHe: messageForKind("MATTER_CREATED"),
        idempotent: false,
        matterId: outcome.matterId,
        matterHref: `/matters/${outcome.matterId}`,
      };
    }
    if (outcome.code === "BOOTSTRAP_ALREADY_COMMITTED") {
      const readable = outcome.matterId !== null && (await matterReadable(authorization, actor, outcome.matterId));
      telemetry.record({ ...base, phase: "complete", resultKind: "MATTER_ALREADY_CREATED", idempotent: true });
      return {
        kind: "MATTER_ALREADY_CREATED",
        correlationId,
        messageHe: messageForKind("MATTER_ALREADY_CREATED"),
        idempotent: true,
        matterId: readable && outcome.matterId ? outcome.matterId : null,
        matterHref: readable && outcome.matterId ? `/matters/${outcome.matterId}` : null,
      };
    }
    const mapped = mapRpcNonSuccess(outcome, correlationId);
    telemetry.record({ ...base, phase: "complete", resultKind: mapped.kind, rpcCode: outcome.code });
    return mapped;
  } catch (cause) {
    void cause; // never expose raw error text
    telemetry.record({ ...base, phase: "complete", resultKind: "BOOTSTRAP_INTERNAL_FAILURE" });
    return internalFailure(correlationId);
  }
}
