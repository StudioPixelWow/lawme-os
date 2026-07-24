/**
 * Capability 1 · Slice 1.0.5 — Confirm-Intake-Draft application command.
 *
 * The STRICT server-side command contract. The browser may supply ONLY the
 * fields below; every authority/identity/plan value is server-derived and is
 * NEVER accepted from the client. Unknown keys are rejected (`.strict()`), so a
 * client that tries to smuggle `actorId`, `organizationId`, `assignedOwnerId`,
 * `planHash`, `confirmedMatterId`, `stageId`, role/capabilities, etc. is
 * rejected at the boundary rather than silently ignored.
 */

import { z } from "zod";

export const CONFIRM_INTAKE_DRAFT_COMMAND_VERSION = "confirm-intake-draft-command-v1";

const MAX_TOKEN_LEN = 256;
const MAX_APPROVALS_BYTES = 64 * 1024;

/** Reviewer approvals/corrections — opaque here; the Validation Engine validates them. */
const approvalsSchema = z
  .unknown()
  .refine(
    (v) => v === undefined || (typeof v === "object" && v !== null && !Array.isArray(v)),
    { message: "approvals must be an object" },
  )
  .refine((v) => v === undefined || JSON.stringify(v).length <= MAX_APPROVALS_BYTES, {
    message: "approvals exceeds size limit",
  });

export const confirmIntakeDraftCommandSchema = z
  .object({
    intakeDraftId: z.string().uuid(),
    expectedDraftVersionToken: z.string().min(1).max(MAX_TOKEN_LEN),
    confirmationIdempotencyKey: z.string().min(1).max(MAX_TOKEN_LEN),
    approvals: approvalsSchema.optional(),
  })
  .strict();

export type ConfirmIntakeDraftCommand = z.infer<typeof confirmIntakeDraftCommandSchema>;

export type CommandParseResult =
  | { readonly ok: true; readonly command: ConfirmIntakeDraftCommand }
  | { readonly ok: false; readonly issues: readonly string[] };

/**
 * Parse + strictly validate a raw client command. Returns stable, non-leaking
 * issue descriptors on failure (path + zod code only — never values).
 */
export function parseConfirmIntakeDraftCommand(raw: unknown): CommandParseResult {
  const parsed = confirmIntakeDraftCommandSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(
      (i) => `${i.path.length > 0 ? i.path.join(".") : "(root)"}: ${i.code}`,
    );
    return { ok: false, issues };
  }
  return { ok: true, command: parsed.data };
}
