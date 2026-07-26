/**
 * Acquisition-mode ladder resolver (Acquisition Slice 1).
 *
 * Encodes the HARD BOUNDARY as a pure function: given a source's
 * classification and the runtime facts (license on file? reuse basis? blockers
 * actually encountered?), return the HIGHEST mode that is lawful — never
 * higher. "Move aggressively" means: always take the fullest LAWFUL mode and
 * keep going; it never means bypass a control.
 */
import type {
  SourceClassification,
  AcquisitionMode,
  AcquisitionBlocker,
  RegisteredSource,
} from "./types.ts";
import { ACQUISITION_RANK } from "./types.ts";

/** The ceiling each classification could reach with everything permitted. */
const CLASSIFICATION_CEILING: Record<SourceClassification, AcquisitionMode> = {
  OPEN_OFFICIAL_FULL_TEXT: "FULL_TEXT",
  LICENSED_FULL_TEXT: "FULL_TEXT",
  FIRM_OWNED_FULL_TEXT: "FULL_TEXT",
  PUBLIC_METADATA: "STRUCTURED_METADATA",
  LINK_ONLY: "METADATA_AND_LINK",
  DISCOVERY_ONLY: "DISCOVERY_ONLY",
  REQUIRES_LICENSE: "METADATA_AND_LINK", // lawful without a license: link + public metadata
  BLOCKED: "BLOCKED",
};

/** Any blocker that means we must not hold full text (never bypass). */
const HARD_BLOCKERS: readonly AcquisitionBlocker[] = [
  "authentication_required",
  "paywall",
  "access_control",
  "technical_protection_measure",
  "restricted_api",
  "sealed_or_confidential",
];

function lower(a: AcquisitionMode, b: AcquisitionMode): AcquisitionMode {
  return ACQUISITION_RANK[a] >= ACQUISITION_RANK[b] ? a : b;
}

export interface LadderInput {
  classification: SourceClassification;
  /** Written license/permission on file for restricted full text. */
  licenseOnFile: boolean;
  /** Documented reuse basis (e.g. Copyright Act §6, open-data licence). */
  reuseBasisPresent: boolean;
  /** Blockers actually encountered while fetching. */
  blockers: readonly AcquisitionBlocker[];
}

export interface LadderResult {
  mode: AcquisitionMode;
  /** Human-auditable reason for the resolved mode (Hebrew). */
  reasonHe: string;
  /** True when full text was withheld though the ceiling allowed it. */
  fellBack: boolean;
}

/**
 * Resolve the highest lawful acquisition mode. Pure + deterministic.
 */
export function resolveAcquisitionMode(input: LadderInput): LadderResult {
  const ceiling = CLASSIFICATION_CEILING[input.classification];
  let mode: AcquisitionMode = ceiling;
  let reasonHe = "מצב מרבי לפי סיווג המקור";

  // 1) Full text on a licensed source requires the license on file.
  if (input.classification === "LICENSED_FULL_TEXT" && !input.licenseOnFile) {
    mode = lower(mode, "METADATA_AND_LINK");
    reasonHe = "רישיון מסחרי אינו בתיק — ירידה לקישור ומטא-דאטה בלבד";
  }

  // 2) Full text of official / open sources requires a documented reuse basis.
  if (
    (input.classification === "OPEN_OFFICIAL_FULL_TEXT" ||
      input.classification === "FIRM_OWNED_FULL_TEXT") &&
    !input.reuseBasisPresent
  ) {
    mode = lower(mode, "METADATA_AND_LINK");
    reasonHe = "אין בסיס שימוש מתועד לטקסט מלא — ירידה לקישור ומטא-דאטה בלבד";
  }

  // 3) A hard blocker means we NEVER hold full text (no bypass, ever).
  const hardHit = input.blockers.some((b) => HARD_BLOCKERS.includes(b));
  if (hardHit) {
    mode = lower(mode, "METADATA_AND_LINK");
    reasonHe = "נתקל בחסימת גישה (הזדהות/תשלום/הגנה טכנולוגית) — ללא עקיפה; קישור בלבד";
  }

  // 4) Rate-limiting alone does not force link-only, but it caps below full
  //    text unless we already hold a lawful full-text basis.
  if (input.blockers.includes("rate_limited") && mode === "FULL_TEXT") {
    // full text stays allowed only when basis/license is present (checked above)
    reasonHe = reasonHe === "מצב מרבי לפי סיווג המקור"
      ? "מוגבל קצב — הורדה מכובדת; טקסט מלא מותר על בסיס מתועד"
      : reasonHe;
  }

  return { mode, reasonHe, fellBack: ACQUISITION_RANK[mode] > ACQUISITION_RANK[ceiling] };
}

/** Convenience: resolve straight from a registered source + blockers. */
export function resolveForSource(
  source: RegisteredSource,
  blockers: readonly AcquisitionBlocker[] = [],
): LadderResult {
  return resolveAcquisitionMode({
    classification: source.classification,
    licenseOnFile: source.licenseOnFile,
    reuseBasisPresent: source.reuseBasisRef !== null,
    blockers,
  });
}

/** True when a mode is permitted to hold local full text. */
export function modeHoldsFullText(mode: AcquisitionMode): boolean {
  return mode === "FULL_TEXT";
}
