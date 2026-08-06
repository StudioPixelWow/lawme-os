/**
 * Shared mapper helpers. A mapper turns one RawRecord into one or more
 * CanonicalRecords, filling the Canonical Envelope and keeping the four content
 * layers separate. Timestamps are injected (MapContext.now) so mapping is
 * deterministic and unit-testable.
 */
import { createHash } from "node:crypto";
import type {
  CanonicalEntityType, CanonicalEnvelope, ContentLevel, ExternalIdentifier,
  ExtractionMethod, PrimaryText,
} from "../canonical/envelope.ts";

export interface MapContext {
  now: string; // ISO — injected for determinism
  parserVersion: string;
  mappingVersion: string;
}

export function hashObject(obj: unknown): string {
  return createHash("sha256").update(JSON.stringify(obj)).digest("hex");
}

export function hashText(text: string): string {
  return createHash("sha256").update(text.normalize("NFC")).digest("hex");
}

export function primaryText(raw: string, language = "he"): PrimaryText {
  return { raw, contentHash: hashText(raw), language };
}

export interface EnvelopeInput {
  canonicalId: string;
  entityType: CanonicalEntityType;
  externalIdentifiers: readonly ExternalIdentifier[];
  sourcePlatform: string;
  sourcePublisher: string | null;
  sourceDataset: string | null;
  sourceResource: string | null;
  sourceUrl: string;
  extractionMethod: ExtractionMethod;
  confidence: number;
  contentHash: string;
  rawRecordHash: string;
  externalRecordId: string;
  contentLevel: ContentLevel;
}

export function buildEnvelope(input: EnvelopeInput, ctx: MapContext): CanonicalEnvelope {
  return {
    canonicalId: input.canonicalId,
    entityType: input.entityType,
    externalIdentifiers: input.externalIdentifiers,
    sourcePlatform: input.sourcePlatform,
    sourcePublisher: input.sourcePublisher,
    sourceDataset: input.sourceDataset,
    sourceResource: input.sourceResource,
    sourceUrl: input.sourceUrl,
    firstSeenAt: ctx.now,
    lastVerifiedAt: ctx.now,
    extractionMethod: input.extractionMethod,
    parserVersion: ctx.parserVersion,
    mappingVersion: ctx.mappingVersion,
    confidence: input.confidence,
    contentHash: input.contentHash,
    rawRecordHash: input.rawRecordHash,
    externalRecordId: input.externalRecordId,
    versionStatus: "mapped",
    contentLevel: input.contentLevel,
  };
}

export function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length === 0 ? null : s;
}

/** Coerce a source date-ish value to an ISO date (YYYY-MM-DD) or null. */
export function isoDate(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // dd/mm/yyyy
  const d = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (d) return `${d[3]}-${d[2].padStart(2, "0")}-${d[1].padStart(2, "0")}`;
  return null;
}
