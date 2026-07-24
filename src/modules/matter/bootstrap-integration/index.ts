/**
 * Capability 1 · Slice 1.0.5 — Matter Bootstrap application integration surface.
 *
 * The canonical server-side path that connects the pure Bootstrap engines to the
 * atomic RPC through the controlled public gateway. Exposes NO direct Matter
 * insert, NO raw RPC JSON construction, and NO service-role authorization path.
 */

export {
  CONFIRM_INTAKE_DRAFT_COMMAND_VERSION,
  confirmIntakeDraftCommandSchema,
  parseConfirmIntakeDraftCommand,
} from "./command.ts";
export type { ConfirmIntakeDraftCommand, CommandParseResult } from "./command.ts";

export {
  messageForKind,
  httpStatusForResult,
} from "./result.ts";
export type { BootstrapMatterApplicationResult, BootstrapMatterResultKind, SafeIssue } from "./result.ts";

export {
  createBootstrapDraftSnapshotLoader,
  deriveDraftSchemaVersion,
  SUPPORTED_INTAKE_CONTRACT_VERSIONS,
} from "./draft-snapshot-loader.ts";
export type { BootstrapDraftSnapshotLoader } from "./draft-snapshot-loader.ts";

export {
  createBootstrapReferenceFactsLoader,
  extractReferencedContactIds,
  SUPPORTED_MATTER_PROCEDURE_TYPES,
} from "./reference-facts-loader.ts";
export type { BootstrapReferenceFactsLoader } from "./reference-facts-loader.ts";

export {
  BOOTSTRAP_RPC_VERSION,
  BOOTSTRAP_MATTER_VERSION,
  BOOTSTRAP_GATEWAY_FUNCTION,
  buildBootstrapPayload,
  parseBootstrapRpcResult,
  createBootstrapMatterRpcGateway,
} from "./rpc-gateway.ts";
export type { BootstrapRpcRequest, BootstrapRpcOutcome, BootstrapRpcInvoker, BootstrapMatterRpcGateway } from "./rpc-gateway.ts";

export {
  toSafeValidationIssues,
  toSafeValidationWarnings,
  mapRpcNonSuccess,
} from "./errors.ts";

export { confirmIntakeDraftAndBootstrapMatter } from "./use-case.ts";
export type { ConfirmIntakeDraftDependencies } from "./use-case.ts";

export {
  getMatterBootstrapStatus,
  createDraftConfirmationReader,
} from "./status.ts";
export type {
  MatterBootstrapStatus,
  BootstrapStatusKind,
  MatterBootstrapStatusRequest,
  MatterBootstrapStatusDependencies,
  DraftConfirmationReader,
  DraftConfirmationSnapshot,
} from "./status.ts";

export {
  noopBootstrapTelemetry,
  consoleBootstrapTelemetry,
} from "./telemetry.ts";
export type { BootstrapTelemetry, BootstrapTelemetryEvent } from "./telemetry.ts";
