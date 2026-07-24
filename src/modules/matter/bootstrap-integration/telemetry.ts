/**
 * Capability 1 · Slice 1.0.5 — Bootstrap telemetry seam.
 *
 * SAFE by construction: identifiers, versions, phases, and result/RPC codes
 * only. It NEVER carries Draft narrative, Matter title, fact text, participant
 * or contact details, deadline/evidence descriptions, raw aggregate JSON, raw
 * SQL errors, or tokens.
 */

export interface BootstrapTelemetryEvent {
  readonly correlationId: string;
  readonly organizationId: string;
  readonly actorProfileId: string;
  readonly draftId: string;
  readonly phase:
    | "authorize"
    | "load_draft"
    | "load_references"
    | "validate"
    | "plan"
    | "rpc"
    | "map_result"
    | "complete";
  readonly resultKind?: string;
  readonly rpcCode?: string;
  readonly validationIssueCodes?: readonly string[];
  readonly planHash?: string;
  readonly bootstrapVersion?: string;
  readonly idempotent?: boolean;
  readonly durationMs?: number;
}

export interface BootstrapTelemetry {
  record(event: BootstrapTelemetryEvent): void;
}

export const noopBootstrapTelemetry: BootstrapTelemetry = {
  record() {
    /* intentionally does nothing */
  },
};

export const consoleBootstrapTelemetry: BootstrapTelemetry = {
  record(event) {
    // one structured JSON line; safe fields only.
    console.log(JSON.stringify({ tag: "bootstrap.confirm", ...event }));
  },
};
