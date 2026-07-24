/**
 * Capability 1 · Slice 1.0.5 — Bootstrap RPC adapter.
 *
 * The ONLY place that turns a `MatterAggregatePlan` into the approved JSONB
 * payload and invokes the public Bootstrap gateway (`public.bootstrap_matter_v1`,
 * which forwards to the internal `app.bootstrap_matter_v1`). It injects the
 * server-derived RPC/bootstrap versions, draft version token, idempotency key,
 * and plan hash; parses + runtime-validates the JSONB result union; and maps any
 * transport/DB error into an internal adapter outcome WITHOUT exposing raw
 * Postgres text. No route may construct raw RPC JSON; no generic `rpc(name,...)`
 * is used for Bootstrap outside this adapter.
 */

import { z } from "zod";
import type { MatterAggregatePlan } from "../bootstrap/index.ts";

export const BOOTSTRAP_RPC_VERSION = "bootstrap-rpc-v1";
export const BOOTSTRAP_MATTER_VERSION = "matter-bootstrap-v1";
export const BOOTSTRAP_GATEWAY_FUNCTION = "bootstrap_matter_v1";

export interface BootstrapRpcRequest {
  readonly plan: MatterAggregatePlan;
  readonly draft: { readonly id: string; readonly versionToken: string; readonly schemaVersion: string };
  readonly idempotencyKey: string;
  readonly correlationId: string;
}

export type BootstrapRpcOutcome =
  | { readonly code: "BOOTSTRAP_CREATED"; readonly matterId: string; readonly idempotent: false }
  | { readonly code: "BOOTSTRAP_ALREADY_COMMITTED"; readonly matterId: string | null; readonly idempotent: true }
  | { readonly code: "BOOTSTRAP_STALE_DRAFT" }
  | { readonly code: "BOOTSTRAP_IDEMPOTENCY_CONFLICT" }
  | { readonly code: "BOOTSTRAP_NOT_AVAILABLE" }
  | { readonly code: "BOOTSTRAP_RPC_ERROR"; readonly internalCode: string };

/** Minimal RPC-invoker seam — the route adapts the authenticated Supabase client to this. */
export interface BootstrapRpcInvoker {
  rpc(
    fn: typeof BOOTSTRAP_GATEWAY_FUNCTION,
    args: { readonly p_payload: unknown },
  ): Promise<{ data: unknown; error: { code?: string; message?: string } | null }>;
}

export interface BootstrapMatterRpcGateway {
  bootstrap(request: BootstrapRpcRequest): Promise<BootstrapRpcOutcome>;
}

/** Build the exact approved JSONB payload from the plan + server-derived fields. */
export function buildBootstrapPayload(request: BootstrapRpcRequest): Record<string, unknown> {
  const { plan } = request;
  return {
    rpcVersion: BOOTSTRAP_RPC_VERSION,
    bootstrapVersion: BOOTSTRAP_MATTER_VERSION,
    correlationId: request.correlationId,
    draft: {
      id: request.draft.id,
      versionToken: request.draft.versionToken,
      schemaVersion: request.draft.schemaVersion,
    },
    idempotency: {
      key: request.idempotencyKey,
      planHash: plan.metadata.planHash,
    },
    aggregate: {
      aggregateVersion: plan.metadata.aggregateVersion,
      sourceInputHash: plan.metadata.sourceInputHash,
      metadata: {
        plannerVersion: plan.metadata.plannerVersion,
        validationVersion: plan.metadata.validationVersion,
        planHash: plan.metadata.planHash,
      },
      matter: plan.matter,
      members: plan.members,
      contacts: plan.contacts,
      participants: plan.participants,
      facts: plan.facts,
      deadlines: plan.deadlines,
      evidence: plan.evidence,
      audit: plan.audit,
    },
  };
}

const rpcResultSchema = z.object({
  ok: z.boolean(),
  code: z.string().min(1),
  matterId: z.string().nullable().optional(),
});

/** Parse a raw RPC JSONB result into a typed outcome (fail closed to RPC_ERROR). */
export function parseBootstrapRpcResult(data: unknown): BootstrapRpcOutcome {
  const parsed = rpcResultSchema.safeParse(data);
  if (!parsed.success) return { code: "BOOTSTRAP_RPC_ERROR", internalCode: "malformed_result" };
  const { code, matterId } = parsed.data;
  switch (code) {
    case "BOOTSTRAP_CREATED":
      if (typeof matterId !== "string") return { code: "BOOTSTRAP_RPC_ERROR", internalCode: "missing_matter_id" };
      return { code: "BOOTSTRAP_CREATED", matterId, idempotent: false };
    case "BOOTSTRAP_ALREADY_COMMITTED":
      return { code: "BOOTSTRAP_ALREADY_COMMITTED", matterId: matterId ?? null, idempotent: true };
    case "BOOTSTRAP_STALE_DRAFT":
      return { code: "BOOTSTRAP_STALE_DRAFT" };
    case "BOOTSTRAP_IDEMPOTENCY_CONFLICT":
      return { code: "BOOTSTRAP_IDEMPOTENCY_CONFLICT" };
    case "BOOTSTRAP_NOT_AVAILABLE":
      return { code: "BOOTSTRAP_NOT_AVAILABLE" };
    default:
      // Any stable P0001 code the app pre-validated against (VERSION/ENUM/CROSS_TENANT/...) reaching
      // here indicates a server/plan mismatch — surface as an internal adapter error, never raw.
      return { code: "BOOTSTRAP_RPC_ERROR", internalCode: `unexpected_code:${code}` };
  }
}

export function createBootstrapMatterRpcGateway(invoker: BootstrapRpcInvoker): BootstrapMatterRpcGateway {
  return {
    async bootstrap(request) {
      const payload = buildBootstrapPayload(request);
      let response: { data: unknown; error: { code?: string; message?: string } | null };
      try {
        response = await invoker.rpc(BOOTSTRAP_GATEWAY_FUNCTION, { p_payload: payload });
      } catch (cause) {
        // transport/timeout — never expose raw text.
        void cause;
        return { code: "BOOTSTRAP_RPC_ERROR", internalCode: "transport_error" };
      }
      if (response.error !== null) {
        return { code: "BOOTSTRAP_RPC_ERROR", internalCode: response.error.code ?? "db_error" };
      }
      return parseBootstrapRpcResult(response.data);
    },
  };
}
