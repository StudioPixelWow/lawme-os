/**
 * Open-official acquisition adapter (Acquisition Slice 1) — the first lawful
 * adapter that needs NO external approval.
 *
 * It structures items that an operator lawfully provided (from an OPEN_OFFICIAL
 * source such as the National Legislation Database or an official judgment) into
 * canonical records. It:
 *  - resolves the highest LAWFUL mode via the ladder (respecting any blocker),
 *  - holds full text ONLY when the resolved mode is FULL_TEXT and a reuse basis
 *    is present (Copyright Act §6 / open-data / firm ownership),
 *  - hashes only bytes it is permitted to hold,
 *  - marks everything `discovery_only` (retrieval is never verification),
 *  - fabricates nothing: empty input ⇒ empty output.
 */
import type {
  AcquisitionAdapter,
  AcquisitionContext,
  CanonicalSourceRecord,
  RawAcquiredItem,
  RegisteredSource,
} from "./types.ts";
import { resolveForSource, modeHoldsFullText } from "./ladder.ts";
import { sha256Hex } from "../hash.ts";

function currentnessFor(item: RawAcquiredItem): CanonicalSourceRecord["currentness"] {
  // We never guess. Currentness is unknown unless an explicit effective/version
  // signal is present; supersession is set only by later editorial linkage.
  if (item.version || item.effectiveDate) return "current";
  return "unknown";
}

function recordIdFor(source: RegisteredSource, item: RawAcquiredItem, idx: number): string {
  const anchor =
    item.instrumentNumber ??
    (item.fullText ? sha256Hex(item.fullText).slice(0, 12) : `idx${idx}`);
  return `acq-${source.sourceKey}-${anchor}`;
}

export function createOpenOfficialAdapter(source: RegisteredSource): AcquisitionAdapter {
  return {
    id: `acq:${source.sourceKey}`,
    source,
    async acquire(
      items: readonly RawAcquiredItem[],
      ctx: AcquisitionContext,
    ): Promise<readonly CanonicalSourceRecord[]> {
      const resolved = resolveForSource(source, ctx.blockers);
      const holdFull = modeHoldsFullText(resolved.mode);

      return items.map((item, idx) => {
        const canHoldThisItem = holdFull && item.fullText !== null;
        const fullText = canHoldThisItem ? item.fullText : null;
        const rec: CanonicalSourceRecord = {
          recordId: recordIdFor(source, item, idx),
          sourceKey: source.sourceKey,
          sourceOwner: source.sourceOwner,
          sourceUrl: item.sourceUrl ?? source.homeUrl,
          acquisitionMode: resolved.mode,
          authorityTier: source.authorityTier,
          issuingBody: item.issuingBody,
          instrumentNumber: item.instrumentNumber,
          titleHe: item.titleHe,
          publicationDate: item.publicationDate,
          decisionDate: item.decisionDate,
          effectiveDate: item.effectiveDate,
          validFrom: item.effectiveDate,
          validTo: null,
          version: item.version,
          amendmentOf: null,
          currentness: currentnessFor(item),
          officialStatus: source.officialStatus,
          fullTextAvailable: fullText !== null,
          licenseRef: source.reuseBasisRef,
          sourceHash: fullText !== null ? sha256Hex(fullText) : null,
          ingestedAt: ctx.nowISO,
          lastCheckedAt: ctx.nowISO,
          tenantId: source.classification === "FIRM_OWNED_FULL_TEXT" ? item.tenantId : null,
          verificationStatus: "discovery_only",
        };
        return rec;
      });
    },
  };
}
