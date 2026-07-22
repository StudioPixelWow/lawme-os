/**
 * Public API of the authorization-integration layer (Cap 0.8, Slice 0.8.4).
 *
 * The runtime bridge: ActorContext + a ResourceRequest → load facts under RLS →
 * canonical pure policy → decision → enforce. Routes/use-cases depend only on
 * this surface; they never touch loaders or policy internals directly.
 */
export type { ResourceRequest, AuthorizationTelemetry, AuthorizationTelemetryEvent } from "./contracts.ts";
export { noopAuthorizationTelemetry, consoleAuthorizationTelemetry } from "./contracts.ts";

export type { ResourceAuthorizationService } from "./authorize-resource-request.ts";
export { createResourceAuthorizationService } from "./authorize-resource-request.ts";

export { requireAuthorized, isAuthorized } from "./require-authorized.ts";

export type { SafeResourceApiError, SafeExternalCode } from "./errors.ts";
export { ResourceAuthorizationError, toSafeResourceApiError } from "./errors.ts";
