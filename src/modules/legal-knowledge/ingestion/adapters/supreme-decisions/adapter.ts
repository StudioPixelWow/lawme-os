/**
 * SupremeDecisionsAdapter — FIXTURE-BACKED (Epic 1 POC).
 *
 * Live automated access to supremedecisions.court.gov.il is not clearly
 * permitted (see ACCESS_RESEARCH.md) → this adapter serves ONLY the local
 * synthetic fixture set and performs NO network calls of any kind.
 * It still implements the full LegalSourceAdapter contract, so swapping in
 * a live transport later changes fetch internals, not consumers.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { normalizeCaseNumber } from "../../../../../lib/legal/case-number/index.ts";
import { sha256Hex } from "../../core/hash.ts";
import { buildProvenance } from "../../provenance/provenance.ts";
import { validateNormalizedDocument } from "../../validation/validate-document.ts";
import type {
  AccessClassification,
  AdapterValidationResult,
  DiscoveredItem,
  DocumentType,
  LegalSourceAdapter,
  NormalizedLegalDocument,
} from "../../core/types.ts";

interface FixtureItem {
  externalId: string;
  url: string;
  title: string;
  caseNumberRaw: string | null;
  court: string | null;
  documentType: DocumentType;
  documentDate: string | null;
  versionDate?: string;
  effectiveDate?: string;
  topics: string[];
  contentType: string;
  body: string;
}

const ADAPTER_VERSION = "poc-0.1.0-fixture";
const SOURCE_ID = "LSR-038"; // Supreme Court decisions DB in the source registry

function loadFixtures(): FixtureItem[] {
  const p = path.join(
    import.meta.dirname,
    "..", "..", "fixtures", "employment-poc.fixtures.json",
  );
  const parsed = JSON.parse(readFileSync(p, "utf8")) as { items: FixtureItem[] };
  return parsed.items;
}

export class SupremeDecisionsAdapter implements LegalSourceAdapter {
  readonly sourceId = SOURCE_ID;
  readonly adapterVersion = ADAPTER_VERSION;
  private fixtures: FixtureItem[] | null = null;

  private all(): FixtureItem[] {
    if (!this.fixtures) this.fixtures = loadFixtures();
    return this.fixtures;
  }

  private byId(id: string): FixtureItem {
    const f = this.all().find((x) => x.externalId === id);
    if (!f) throw new Error(`fixture not found: ${id}`);
    return f;
  }

  async discover(limit = 50): Promise<DiscoveredItem[]> {
    return this.all().slice(0, limit).map((f) => ({
      externalId: f.externalId,
      url: f.url,
      title: f.title,
      hint: {
        documentType: f.documentType,
        documentDate: f.documentDate ?? undefined,
        caseNumberRaw: f.caseNumberRaw ?? undefined,
      },
    }));
  }

  async fetchMetadata(item: DiscoveredItem): Promise<Partial<NormalizedLegalDocument>> {
    const f = this.byId(item.externalId);
    return {
      title: f.title,
      documentType: f.documentType,
      court: f.court,
      caseNumberRaw: f.caseNumberRaw,
      documentDate: f.documentDate,
      legalDomains: ["labor", ...f.topics],
    };
  }

  async fetchDocument(item: DiscoveredItem): Promise<{ content: string; contentType: string; httpStatus: number | null }> {
    const f = this.byId(item.externalId);
    // Fixture read — deliberately NO network path exists in this class.
    return { content: f.body, contentType: f.contentType, httpStatus: null };
  }

  getCanonicalUrl(item: DiscoveredItem): string | null {
    return this.byId(item.externalId).url;
  }

  calculateHash(content: string): string {
    return sha256Hex(content);
  }

  classifyAccess(): AccessClassification {
    // Publicly viewable, reuse terms unstated — see ACCESS_RESEARCH.md.
    return "public_unspecified";
  }

  async normalize(
    item: DiscoveredItem,
    payload: { content: string; contentType: string; httpStatus: number | null },
  ): Promise<NormalizedLegalDocument> {
    const f = this.byId(item.externalId);
    const caseNo = f.caseNumberRaw ? normalizeCaseNumber(f.caseNumberRaw) : null;
    const warnings = (caseNo?.warnings ?? []).map((w) => ({ code: "case_number", message: w }));

    return {
      sourceId: this.sourceId,
      documentType: f.documentType,
      // Authority is derived from source tier + court ONLY at the
      // verification stage; fixtures stay honest:
      authorityType: "unknown",
      verificationStatus: "unverified",
      title: f.title,
      titleHe: f.title,
      titleEn: null,
      caseNumberRaw: f.caseNumberRaw,
      caseNumberNormalized: caseNo?.searchKey ?? null,
      procedureCode: caseNo?.procedureCode ?? null,
      court: f.court,
      legalDomains: ["labor", ...f.topics],
      documentDate: f.documentDate,
      publicationDate: f.documentDate,
      effectiveDate: f.effectiveDate ?? null,
      versionDate: f.versionDate ?? null,
      language: "he",
      canonicalSourceUrl: f.url,
      originalFileUrl: null,
      licenseStatus: "synthetic_fixture",
      storagePolicy: "store_full",
      accessClassification: this.classifyAccess(),
      rawContent: payload.content,
      rawContentType: payload.contentType,
      isSynthetic: true,
      provenance: buildProvenance({
        sourceId: this.sourceId,
        originalUrl: f.url,
        canonicalUrl: f.url,
        retrievalMethod: "fixture",
        httpStatus: payload.httpStatus,
        contentType: payload.contentType,
        content: payload.content,
        parserVersion: ADAPTER_VERSION,
      }),
      warnings,
    };
  }

  validate(doc: NormalizedLegalDocument): AdapterValidationResult {
    return validateNormalizedDocument(doc);
  }

  async mapToUnifiedSchema(item: DiscoveredItem) {
    const payload = await this.fetchDocument(item);
    const doc = await this.normalize(item, payload);
    return { doc, validation: this.validate(doc) };
  }
}
