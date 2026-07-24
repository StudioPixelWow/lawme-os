/**
 * Capability 1 · Slice 1.0.5 — Bootstrap reconciliation / status use case.
 *
 * getMatterBootstrapStatus({ actor, intakeDraftId, idempotencyKey?, planHash? })
 *
 * A safe, read-only status lookup that supports recovery after a client timeout.
 * It authorizes Draft access FIRST, reads only persisted Draft confirmation
 * fields, preserves anti-enumeration (opaque UNAVAILABLE), never retries
 * Bootstrap, and never reveals a Matter id until that Matter is read-authorized.
 */

import { z } from "zod";
import type { ActorContext } from "../../identity/actor-context.ts";
import type { AuthDb } from "../../identity/infrastructure/supabase-auth-client.ts";
import type { ResourceAuthorizationService } from "../../identity/authorization-integration/index.ts";

export type BootstrapStatusKind =
  | "NOT_STARTED"
  | "READY"
  | "COMMITTED"
  | "CONFLICT"
  | "STALE"
  | "UNAVAILABLE";

export interface MatterBootstrapStatus {
  readonly status: BootstrapStatusKind;
  readonly matterId: string | null;
  readonly correlationId: string;
}

export interface MatterBootstrapStatusRequest {
  readonly actor: ActorContext;
  readonly intakeDraftId: string;
  readonly idempotencyKey?: string;
  readonly planHash?: string;
}

export interface DraftConfirmationSnapshot {
  readonly status: string;
  readonly versionToken: string;
  readonly confirmationIdempotencyKey: string | null;
  readonly confirmationPlanHash: string | null;
  readonly confirmedMatterId: string | null;
}

export interface DraftConfirmationReader {
  read(actor: ActorContext, draftId: string): Promise<DraftConfirmationSnapshot | null>;
}

const confirmationRowSchema = z.object({
  status: z.string().min(1),
  version_token: z.string().min(1),
  confirmation_idempotency_key: z.string().nullable(),
  confirmation_plan_hash: z.string().nullable(),
  confirmed_matter_id: z.string().nullable(),
});

export function createDraftConfirmationReader(db: AuthDb): DraftConfirmationReader {
  return {
    async read(actor, draftId) {
      const { data, error } = await db
        .from("matter_intake_drafts")
        .select("status, version_token, confirmation_idempotency_key, confirmation_plan_hash, confirmed_matter_id")
        .eq("organization_id", actor.organization.id)
        .eq("id", draftId)
        .limit(1)
        .maybeSingle();
      if (error) throw new Error("bootstrap status read failed");
      if (data === null) return null;
      const parsed = confirmationRowSchema.safeParse(data);
      if (!parsed.success) return null;
      const row = parsed.data;
      return Object.freeze({
        status: row.status,
        versionToken: row.version_token,
        confirmationIdempotencyKey: row.confirmation_idempotency_key,
        confirmationPlanHash: row.confirmation_plan_hash,
        confirmedMatterId: row.confirmed_matter_id,
      });
    },
  };
}

export interface MatterBootstrapStatusDependencies {
  readonly authorization: ResourceAuthorizationService;
  readonly reader: DraftConfirmationReader;
}

export async function getMatterBootstrapStatus(
  request: MatterBootstrapStatusRequest,
  deps: MatterBootstrapStatusDependencies,
): Promise<MatterBootstrapStatus> {
  const { actor, intakeDraftId } = request;
  const correlationId = actor.request.correlationId;
  const unavailable: MatterBootstrapStatus = { status: "UNAVAILABLE", matterId: null, correlationId };

  try {
    // authorize Draft access first (read).
    const decision = await deps.authorization.authorizeResourceRequest(actor, {
      resourceType: "intake_draft",
      action: "intake.read",
      draftId: intakeDraftId,
    });
    if (!decision.allowed) return unavailable;

    const snap = await deps.reader.read(actor, intakeDraftId);
    if (snap === null) return unavailable;

    if (snap.status === "rejected" || snap.status === "expired") return unavailable;

    if (snap.status === "confirmed" || snap.confirmedMatterId !== null) {
      const keyMismatch =
        request.idempotencyKey !== undefined &&
        snap.confirmationIdempotencyKey !== null &&
        request.idempotencyKey !== snap.confirmationIdempotencyKey;
      const planMismatch =
        request.planHash !== undefined &&
        snap.confirmationPlanHash !== null &&
        request.planHash !== snap.confirmationPlanHash;
      if (keyMismatch || planMismatch) return { status: "CONFLICT", matterId: null, correlationId };

      let matterId: string | null = null;
      if (snap.confirmedMatterId !== null) {
        const readable = await deps.authorization.authorizeResourceRequest(actor, {
          resourceType: "matter",
          action: "matter.read",
          matterIdOrSlug: snap.confirmedMatterId,
        });
        matterId = readable.allowed ? snap.confirmedMatterId : null;
      }
      return { status: "COMMITTED", matterId, correlationId };
    }

    if (snap.status === "confirming") return { status: "STALE", matterId: null, correlationId };
    if (snap.status === "ready_for_review") return { status: "READY", matterId: null, correlationId };
    // active / needs_clarification
    return { status: "NOT_STARTED", matterId: null, correlationId };
  } catch {
    return unavailable;
  }
}
