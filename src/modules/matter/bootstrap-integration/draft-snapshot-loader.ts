/**
 * Capability 1 · Slice 1.0.5 — Immutable Intake Draft snapshot loader.
 *
 * Returns the exact `RawBootstrapDraft` the Validation Engine needs. SERVER-ONLY.
 * MUST be called only AFTER the caller has authorized `intake.confirm` on the
 * draft (the canonical use case does this). Defence-in-depth:
 *   - uses the authenticated (RLS) client — `app.can_access_intake_draft` stays
 *     active, so a non-creator/non-reviewer sees nothing;
 *   - scoped to the active organization;
 *   - selects ONLY the columns the engine needs (never `confidential_input`);
 *   - runtime-validates the persisted row and FAILS CLOSED (returns null) on a
 *     malformed row; never exposes the raw row to the browser.
 * The service client is deliberately NOT used (no RLS bypass).
 */

import { z } from "zod";
import type { ActorContext } from "../../identity/actor-context.ts";
import type { AuthDb } from "../../identity/infrastructure/supabase-auth-client.ts";
import type { RawBootstrapDraft } from "../bootstrap/index.ts";
import { MATTER_INTAKE_CONTRACT_VERSION } from "../intake/contracts.ts";

const SNAPSHOT_COLUMNS =
  "id, organization_id, status, version_token, engine_version, structured_draft, expires_at, confirmed_matter_id" as const;

const rowSchema = z.object({
  id: z.string().min(1),
  organization_id: z.string().min(1),
  status: z.string().min(1),
  version_token: z.string().min(1),
  engine_version: z.string().min(1),
  structured_draft: z.unknown(),
  expires_at: z.string().nullable(),
  confirmed_matter_id: z.string().nullable(),
});

export interface BootstrapDraftSnapshotLoader {
  load(actor: ActorContext, draftId: string): Promise<RawBootstrapDraft | null>;
}

/**
 * Persisted `engine_version` is `"<engine>|<intake-contract-version>"`. The
 * schema version is the contract suffix; a row without a recognised suffix is
 * treated as malformed (fail closed).
 */
export function deriveDraftSchemaVersion(engineVersion: string): string | null {
  const segments = engineVersion.split("|");
  const suffix = segments[segments.length - 1];
  if (suffix !== undefined && suffix.startsWith("matter-intake-contract-")) return suffix;
  return null;
}

export function createBootstrapDraftSnapshotLoader(db: AuthDb): BootstrapDraftSnapshotLoader {
  return {
    async load(actor, draftId) {
      const { data, error } = await db
        .from("matter_intake_drafts")
        .select(SNAPSHOT_COLUMNS)
        .eq("organization_id", actor.organization.id)
        .eq("id", draftId)
        .limit(1)
        .maybeSingle();

      if (error) throw new Error("bootstrap draft snapshot read failed");
      if (data === null) return null;

      const parsed = rowSchema.safeParse(data);
      if (!parsed.success) return null;
      const row = parsed.data;

      const schemaVersion = deriveDraftSchemaVersion(row.engine_version);
      if (schemaVersion === null) return null;

      const snapshot: RawBootstrapDraft = {
        draftId: row.id,
        organizationId: row.organization_id,
        status: row.status,
        versionToken: row.version_token,
        schemaVersion,
        engineVersion: row.engine_version,
        expiresAt: row.expires_at,
        confirmedMatterId: row.confirmed_matter_id,
        structuredDraft: row.structured_draft,
      };
      return Object.freeze(snapshot);
    },
  };
}

/** The supported intake contract version(s) — server-authoritative. */
export const SUPPORTED_INTAKE_CONTRACT_VERSIONS: readonly string[] = [MATTER_INTAKE_CONTRACT_VERSION];
