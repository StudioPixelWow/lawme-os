/**
 * Israeli legal proceeding-number normalization — types.
 * Epic 1 (Legal Intelligence POC). No metadata is invented: fields that
 * cannot be derived reliably stay null and a warning is recorded.
 */

/** How the numeric part of the case number is structured. */
export type CaseNumberFormat =
  /** New (Net HaMishpat era) hyphenated: serial-month-2-digit-year, e.g. 12345-01-20 */
  | "hyphenated"
  /** Historical slash: serial/2-digit-year, e.g. 7803/06 */
  | "slash"
  /** Recognized procedure code but unrecognized numeric layout */
  | "unrecognized";

export interface ProcedureInfo {
  /** Canonical Hebrew code with standard gershayim, e.g. `ע"א` */
  code: string;
  /** ASCII search-key fragment, e.g. `EA` for ע"א */
  asciiKey: string;
  /** Hebrew name of the proceeding type */
  nameHe: string;
  /** English description */
  nameEn: string;
  /**
   * Court-system hint derivable from the code ALONE (not invented):
   * e.g. בג"ץ → supreme; סע"ש → labor-regional. `null` when the code is
   * used across systems (e.g. ת"א in magistrates and district courts).
   */
  courtHint: string | null;
}

export interface ParsedCaseNumber {
  /** The exact input string, untouched */
  original: string;
  /** Whether parsing succeeded well enough to produce a normalized value */
  ok: boolean;
  /** Canonical display value, e.g. `סע"ש 12345-01-20` (null when !ok) */
  display: string | null;
  /**
   * Deterministic ASCII search key for joins/dedup, e.g. `SAS-12345-01-2020`.
   * Same proceeding in any input variant → same key.
   */
  searchKey: string | null;
  /** Canonical procedure code (`ע"א`), or null when unknown */
  procedureCode: string | null;
  /** Procedure metadata when the code is known */
  procedure: ProcedureInfo | null;
  /** Serial number within the year (null when not parseable) */
  sequence: number | null;
  /** Filing month 1-12 — only present in hyphenated format */
  month: number | null;
  /** Four-digit filing year when derivable, else null */
  year: number | null;
  /** Numeric layout that was recognized */
  format: CaseNumberFormat;
  /** Court/system hint derived from the procedure code only */
  courtHint: string | null;
  /** 0..1 — how confident the parse is (see parse.ts scoring rules) */
  confidence: number;
  /** Human-readable validation warnings (never silently dropped) */
  warnings: string[];
}
