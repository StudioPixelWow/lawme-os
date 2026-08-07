/**
 * Deterministic amendment-operation fingerprint (A1). Distinguishes genuinely
 * distinct operations that share a clause start-offset and operation type — the
 * failure mode of the old (publication, source_span_start, operation_type) key,
 * which collapsed ~60% of parsed ops on ON CONFLICT DO NOTHING.
 *
 * The formula is mirrored EXACTLY by the SQL backfill in
 * migration `amendment_op_fingerprint_*` so legacy-backfilled rows and freshly
 * reprocessed rows hash identically:
 *
 *   sha256( target_law_id | target_section | operation_type
 *           | norm(old_text ?? evidence) | norm(new_text)
 *           | source_span_start | source_span_end )
 *
 * norm(t) = lower(trim(collapse_whitespace(t))). Hebrew has no case, so lower()
 * is a no-op on Hebrew — SQL lower() and JS toLowerCase() agree.
 */
import { createHash } from "node:crypto";

const norm = (t: string | null | undefined): string =>
  (t ?? "").replace(/\s+/g, " ").trim().toLowerCase();

export interface FingerprintInput {
  targetLawId: string;
  targetSection: string | null;
  operationType: string;
  oldText: string | null;
  newText: string | null;
  evidence: string | null;
  spanStart: number | null;
  spanEnd: number | null;
}

/** SHA-256 hex fingerprint; identical output to the SQL backfill expression. */
export function amendmentFingerprint(op: FingerprintInput): string {
  const parts = [
    op.targetLawId,
    op.targetSection ?? "",
    op.operationType,
    norm(op.oldText ?? op.evidence ?? ""),
    norm(op.newText ?? ""),
    op.spanStart == null ? "" : String(op.spanStart),
    op.spanEnd == null ? "" : String(op.spanEnd),
  ];
  return createHash("sha256").update(parts.join("|"), "utf8").digest("hex");
}
