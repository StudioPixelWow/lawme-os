/**
 * Provider-independent legislation source adapter — INTERFACE + guarded stub
 * (P1-S1 Phase 5). This file performs NO retrieval and NO network I/O.
 *
 * Gate A is encoded in code here: acquisition fails closed unless a written,
 * confirmed reuse basis authorizes the exact instrument. Retrieval is never
 * verification — an AcquisitionRecord is always `discovery_only`.
 *
 * The allowlist is limited to D-NOTICE and D-MINWAGE instruments, identified
 * by internal keys only — NO statute titles or text (those require the
 * approved source + editorial verification).
 */
import type {
  AcquisitionRecord,
  InstrumentRef,
  LegislationSourceAdapter,
  ReuseBasis,
} from "./types.ts";

/** The P1-S1 instrument allowlist — identifiers only, no legal text. */
export const P1_S1_ALLOWLIST: InstrumentRef[] = [
  { doctrineId: "D-NOTICE", instrumentKind: "statute", internalKey: "d-notice/statute" },
  { doctrineId: "D-NOTICE", instrumentKind: "principal_regulation", internalKey: "d-notice/form-reg" },
  { doctrineId: "D-MINWAGE", instrumentKind: "statute", internalKey: "d-minwage/statute" },
  { doctrineId: "D-MINWAGE", instrumentKind: "rate_instrument", internalKey: "d-minwage/current-rate" },
];

export class ReuseBasisMissingError extends Error {
  instrumentKey: string;
  constructor(instrumentKey: string) {
    super(
      `Acquisition refused: no confirmed written reuse basis authorizes "${instrumentKey}". ` +
        `Ingestion is blocked until a counsel confirmation, provider license, or ` +
        `explicit open-data license is provided (STOP GATE A).`,
    );
    this.name = "ReuseBasisMissingError";
    this.instrumentKey = instrumentKey;
  }
}

export class InstrumentNotAllowlistedError extends Error {
  instrumentKey: string;
  constructor(instrumentKey: string) {
    super(`Acquisition refused: "${instrumentKey}" is outside the P1-S1 allowlist.`);
    this.name = "InstrumentNotAllowlistedError";
    this.instrumentKey = instrumentKey;
  }
}

function refKey(ref: InstrumentRef): string {
  return ref.internalKey;
}

function authorizes(basis: ReuseBasis | null, ref: InstrumentRef): boolean {
  if (basis === null) return false;
  if (!basis.confirmedInWriting) return false;
  return basis.allowlist.some((r) => r.internalKey === ref.internalKey);
}

/**
 * Builds the guarded adapter. With no confirmed reuse basis (the current
 * state), every `acquire` call fails closed with ReuseBasisMissingError.
 * A future, confirmed basis + a real transport would be injected here — this
 * build ships neither, by design.
 */
export function createGuardedLegislationAdapter(deps: {
  id: string;
  reuseBasis: ReuseBasis | null;
  /** Optional real transport — absent in this slice; retrieval stays disabled. */
  transport?: (ref: InstrumentRef) => Promise<{ rawText: string; provider: string; provenance: string; retrievedAt: string }>;
}): LegislationSourceAdapter {
  const allowlist = P1_S1_ALLOWLIST;
  return {
    id: deps.id,
    allowlist,
    async acquire(ref: InstrumentRef): Promise<AcquisitionRecord> {
      const key = refKey(ref);
      if (!allowlist.some((r) => r.internalKey === key)) {
        throw new InstrumentNotAllowlistedError(key);
      }
      if (!authorizes(deps.reuseBasis, ref)) {
        throw new ReuseBasisMissingError(key);
      }
      if (deps.transport === undefined) {
        // Reuse basis present but no transport wired in this slice: still
        // fail closed rather than fabricate content.
        throw new ReuseBasisMissingError(key);
      }
      // (Unreached in this slice.) A real, licensed retrieval would produce a
      // discovery_only acquisition record for subsequent editorial verification.
      const raw = await deps.transport(ref);
      const { sha256Hex } = await import("./hash.ts");
      return {
        instrument: ref,
        provider: raw.provider,
        retrievedAt: raw.retrievedAt,
        rawTextHash: sha256Hex(raw.rawText),
        provenance: raw.provenance,
        verificationStatus: "discovery_only",
      };
    },
  };
}
