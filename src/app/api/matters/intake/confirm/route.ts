/**
 * Capability 1 · Slice 1.0.5 — Matter Bootstrap confirmation route.
 *
 * The ONE user-facing confirmation endpoint. It resolves the verified
 * ActorContext, parses the strict command, and delegates to the canonical use
 * case. It contains NO role checks, NO owner/reviewer branches, NO direct Matter
 * insert, NO direct Supabase RPC call, NO Validation/Planner call, and never
 * uses the service client for authorization or exposes raw database errors.
 */

import { revalidatePath } from "next/cache";
import { newCorrelationId } from "@/modules/identity/correlation";
import { getServerActorContext, getServerAuthClient } from "@/modules/identity/server";
import { toSafeApiError } from "@/modules/identity/http";
import { createResourceAuthorizationService } from "@/modules/identity/authorization-integration";
import type { ActorContext } from "@/modules/identity/actor-context";
import type { AuthDb } from "@/modules/identity/infrastructure/supabase-auth-client";
import {
  BOOTSTRAP_GATEWAY_FUNCTION,
  confirmIntakeDraftAndBootstrapMatter,
  consoleBootstrapTelemetry,
  createBootstrapDraftSnapshotLoader,
  createBootstrapMatterRpcGateway,
  createBootstrapReferenceFactsLoader,
  httpStatusForResult,
  parseConfirmIntakeDraftCommand,
  type BootstrapRpcInvoker,
} from "@/modules/matter/bootstrap-integration";

export const runtime = "nodejs";

type ResolvedContext =
  | { readonly ok: true; readonly actor: ActorContext; readonly db: AuthDb }
  | { readonly ok: false; readonly response: Response };

async function resolveContext(correlationId: string): Promise<ResolvedContext> {
  try {
    const actor = await getServerActorContext({ correlationId });
    const db = await getServerAuthClient();
    return { ok: true, actor, db };
  } catch (error) {
    const { status, body } = toSafeApiError(error, correlationId);
    return { ok: false, response: Response.json(body, { status }) };
  }
}

export async function POST(request: Request): Promise<Response> {
  const correlationId = newCorrelationId();

  const ctx = await resolveContext(correlationId);
  if (!ctx.ok) return ctx.response;
  const { actor, db } = ctx;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json(
      { ok: false, code: "BAD_REQUEST", messageHe: "בקשה לא תקינה.", correlationId },
      { status: 400 },
    );
  }

  const parsed = parseConfirmIntakeDraftCommand(raw);
  if (!parsed.ok) {
    return Response.json(
      { ok: false, code: "BAD_REQUEST", messageHe: "בקשה לא תקינה.", correlationId, issues: parsed.issues },
      { status: 400 },
    );
  }

  // Adapt the authenticated Supabase client to the RPC-invoker seam. The generated
  // database types do not yet include the (unapplied) public gateway, so the
  // function name is bridged here at the boundary only.
  const invoker: BootstrapRpcInvoker = {
    rpc: (fn, args) =>
      (db as unknown as {
        rpc: (
          name: string,
          a: unknown,
        ) => Promise<{ data: unknown; error: { code?: string; message?: string } | null }>;
      }).rpc(fn, args),
  };
  void BOOTSTRAP_GATEWAY_FUNCTION;

  const result = await confirmIntakeDraftAndBootstrapMatter(parsed.command, {
    actor,
    authorization: createResourceAuthorizationService(db),
    draftLoader: createBootstrapDraftSnapshotLoader(db),
    referenceLoader: createBootstrapReferenceFactsLoader(db),
    rpcGateway: createBootstrapMatterRpcGateway(invoker),
    clock: () => new Date().toISOString(),
    telemetry: consoleBootstrapTelemetry,
  });

  const succeeded = result.kind === "MATTER_CREATED" || result.kind === "MATTER_ALREADY_CREATED";
  if (succeeded) {
    try {
      revalidatePath("/matters");
    } catch {
      /* best-effort cache revalidation; never fail the response on this */
    }
  }

  return Response.json({ ok: succeeded, ...result }, { status: httpStatusForResult(result.kind) });
}
