/**
 * StatuteImportAdapter (Epic 3B, Phase 7) — import-from-disk, NO network.
 *
 * Consumes a founder-provided official export (statute/regulation/order
 * text file) declared in an import manifest. Because every full-text
 * employment source is ToS-restricted or WAF-blocked to datacenter IPs,
 * there is deliberately NO live transport here. The full LegalSourceAdapter
 * contract is implemented so a licensed live transport can replace the
 * import transport later without changing consumers.
 *
 * Permission gate: full-text bodies are produced ONLY for public-domain
 * primary law (legislation/regulation/order) per Copyright Act §6 and the
 * manifest's fullTextDecision. Guidance/secondary → metadata/pointer only.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { sha256Hex } from "../../core/hash.ts";
import { buildProvenance } from "../../provenance/provenance.ts";
import { extractDocument } from "../../../extraction/extract.ts";
import { validateNormalizedDocument } from "../../validation/validate-document.ts";
import { canonicalIdFor } from "../../import/manifest.ts";
import type { ManifestEntry } from "../../import/manifest.ts";
import type {
  AccessClassification, AdapterValidationResult, DiscoveredItem, DocumentType,
  LegalSourceAdapter, NormalizedLegalDocument, StoragePolicy, VerificationStatus,
} from "../../core/types.ts";
import type { ExtractedBlock } from "../../../extraction/types.ts";

export const IMPORT_ADAPTER_VERSION = "statute-import-1.0.0";

const DOC_TYPE_MAP: Record<ManifestEntry["documentType"], DocumentType> = {
  legislation: "legislation", regulation: "regulation", order: "order",
  guidance: "guidance", secondary: "academic_article",
};

export interface ImportSection {
  anchorKey: string;
  charStart: number;
  charEnd: number;
  content: string;
  headingPath: string | null;
}

export interface ImportResult {
  doc: NormalizedLegalDocument;
  sections: ImportSection[];
  validation: AdapterValidationResult;
  canonicalId: string;
}

export class StatuteImportAdapter implements LegalSourceAdapter {
  readonly sourceId: string;
  readonly adapterVersion = IMPORT_ADAPTER_VERSION;
  private baseDir: string;
  private entry: ManifestEntry;

  constructor(entry: ManifestEntry, baseDir: string) {
    this.entry = entry;
    this.baseDir = baseDir;
    this.sourceId = entry.sourceId;
  }

  async discover(): Promise<DiscoveredItem[]> {
    return [{
      externalId: this.entry.sourceId,
      url: this.entry.canonicalSourceUrl,
      title: this.entry.titleHe,
      hint: { documentType: DOC_TYPE_MAP[this.entry.documentType], documentDate: this.entry.publicationDate ?? undefined },
    }];
  }

  async fetchMetadata(): Promise<Partial<NormalizedLegalDocument>> {
    return {
      title: this.entry.titleHe, titleHe: this.entry.titleHe,
      documentType: DOC_TYPE_MAP[this.entry.documentType],
      publicationDate: this.entry.publicationDate ?? null,
      effectiveDate: this.entry.effectiveDate ?? null,
      legalDomains: ["labor", this.entry.legalTopic],
    };
  }

  private storagePolicy(): StoragePolicy {
    if (this.entry.fullTextDecision === "allow_full_text_dev_poc") return "store_full";
    if (this.entry.fullTextDecision === "allow_metadata_only") return "store_extract";
    return "pointer_only";
  }

  async fetchDocument(): Promise<{ content: string; contentType: string; httpStatus: number | null }> {
    // metadata/pointer records carry NO body — never read a file for them
    if (this.storagePolicy() !== "store_full" || !this.entry.file) {
      return { content: "", contentType: this.entry.contentType ?? "text/plain", httpStatus: null };
    }
    const p = path.join(this.baseDir, this.entry.file);
    const raw = readFileSync(p);
    const isBinary = (this.entry.contentType ?? "").includes("pdf");
    return {
      content: isBinary ? raw.toString("base64") : raw.toString("utf8"),
      contentType: this.entry.contentType ?? "text/plain",
      httpStatus: null,
    };
  }

  getCanonicalUrl(): string | null { return this.entry.canonicalSourceUrl; }
  calculateHash(content: string): string { return sha256Hex(content); }

  classifyAccess(): AccessClassification {
    // primary law text at an official source = public-domain (§6)
    if (this.entry.fullTextDecision === "allow_full_text_dev_poc") return "open";
    if (this.entry.documentType === "secondary") return "requires_permission";
    return "public_unspecified";
  }

  private verification(): VerificationStatus {
    if (this.entry.fullTextDecision === "allow_full_text_dev_poc") return "verified_primary";
    if (this.entry.documentType === "guidance") return "secondary_supported";
    return "unverified";
  }

  async normalize(
    item: DiscoveredItem,
    payload: { content: string; contentType: string; httpStatus: number | null },
  ): Promise<NormalizedLegalDocument> {
    const storagePolicy = this.storagePolicy();
    const hasBody = storagePolicy === "store_full" && payload.content.length > 0;
    return {
      sourceId: this.sourceId,
      documentType: DOC_TYPE_MAP[this.entry.documentType],
      authorityType: this.entry.documentType === "secondary" ? "secondary"
        : this.entry.fullTextDecision === "allow_full_text_dev_poc" ? "binding" : "unverified",
      verificationStatus: this.verification(),
      title: this.entry.titleHe, titleHe: this.entry.titleHe, titleEn: null,
      caseNumberRaw: null, caseNumberNormalized: null, procedureCode: null, court: null,
      legalDomains: ["labor", this.entry.legalTopic],
      documentDate: this.entry.publicationDate ?? null,
      publicationDate: this.entry.publicationDate ?? null,
      effectiveDate: this.entry.effectiveDate ?? null,
      versionDate: this.entry.effectiveDate ?? this.entry.publicationDate ?? null,
      language: "he",
      canonicalSourceUrl: this.entry.canonicalSourceUrl,
      originalFileUrl: this.entry.canonicalSourceUrl,
      licenseStatus: this.entry.fullTextDecision === "allow_full_text_dev_poc" ? "public_domain_official" : "reference_only",
      storagePolicy,
      accessClassification: this.classifyAccess(),
      rawContent: hasBody ? payload.content : null,
      rawContentType: hasBody ? payload.contentType : null,
      isSynthetic: false, // REAL content — no synthetic marker
      provenance: buildProvenance({
        sourceId: this.sourceId,
        originalUrl: this.entry.canonicalSourceUrl,
        canonicalUrl: this.entry.canonicalSourceUrl,
        retrievalMethod: "manual_upload",
        httpStatus: payload.httpStatus,
        contentType: payload.contentType,
        content: payload.content || this.entry.canonicalSourceUrl,
        parserVersion: IMPORT_ADAPTER_VERSION,
      }),
      warnings: hasBody ? [] : [{ code: "no_body", message: "metadata/pointer record — no full text persisted" }],
    };
  }

  validate(doc: NormalizedLegalDocument): AdapterValidationResult {
    return validateNormalizedDocument(doc);
  }

  async mapToUnifiedSchema(item: DiscoveredItem): Promise<ImportResult> {
    const payload = await this.fetchDocument();
    const doc = await this.normalize(item, payload);
    const validation = this.validate(doc);
    let sections: ImportSection[] = [];
    if (doc.storagePolicy === "store_full" && doc.rawContent) {
      const extracted = await extractDocument(doc.rawContent, doc.rawContentType ?? "text/plain");
      sections = extracted.blocks.map((b: ExtractedBlock) => ({
        anchorKey: b.anchorKey, charStart: b.charStart, charEnd: b.charEnd,
        content: b.text, headingPath: b.headingPath,
      }));
    }
    return { doc, sections, validation, canonicalId: canonicalIdFor(this.entry) };
  }
}
