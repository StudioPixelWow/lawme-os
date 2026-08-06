/**
 * Publication document model + classification (current Epic, Track A).
 *
 * Maps a validated {@link ParsedLegislationLawItem} into the Canonical Legal
 * Data Model as:
 *   - one Law entity (the statute identity), and
 *   - one GovernmentDocument per official publication row (original enactment +
 *     each amendment/correction), each carrying its ספר החוקים citation and the
 *     canonical PDF URL.
 *
 * Every publication document is explicitly labelled:
 *   content_level          = "full_text"                  (the PDF is full text)
 *   consolidation_status   = "non_consolidated_publication"(NOT a merged נוסח)
 *   authority_level        = "primary_official"           (official gazette)
 *
 * The consolidation label is the safety-critical one: this corpus is the stream
 * of official publications, NOT an authoritative consolidated text. Downstream
 * serving must never present it as נוסח משולב רשמי.
 */
import type { Correction, General, ParsedLegislationLawItem } from "./legislation-api.ts";
import {
  amendmentEventId,
  canonicalPdfUrl,
  lawPublicationId,
  publicationId,
} from "./publication-identity.ts";

export type PublicationDocType =
  | "original_enactment"
  | "amendment_law"
  | "correction"
  | "repeal_publication"
  | "official_gazette_pdf";

export type ConsolidationStatus =
  | "non_consolidated_publication"
  | "official_consolidated"
  | "reconstructed_candidate";

export type AuthorityLevel = "primary_official" | "secondary_official" | "unofficial_reference";

export interface PublicationDocument {
  canonicalId: string;
  lawCanonicalId: string;
  entityType: "GovernmentDocument";
  docType: PublicationDocType;
  israelLawId: string;
  itemId: string | null;
  correctionNumber: string | null;
  correctionType: string | null; // ישיר | עקיף
  title: string | null;
  publicationSeries: string | null; // ספר החוקים
  magazineNumber: string | null; // חוברת
  pageNumber: string | null; // עמוד
  publicationDate: string | null;
  pdfUrl: string | null;
  contentLevel: "full_text" | "metadata_only";
  consolidationStatus: ConsolidationStatus;
  authorityLevel: AuthorityLevel;
  summary: string | null;
  /** Deterministic amendment-event id (correctionNumber- or itemId-keyed). */
  amendmentEventId: string | null;
  /** Chronological position in the law's publication chain (0 = earliest). */
  chainIndex: number;
}

export interface LawEntity {
  canonicalId: string;
  entityType: "Law";
  israelLawId: string;
  title: string | null;
  validity: string | null; // תקף | נושן | בטל
  firstPublicationDate: string | null;
  latestPublicationDate: string | null;
  openBookUrl: string | null;
  /**
   * Whether an OpenLawBook consolidated-text link exists. OpenLawBook resolves
   * to Hebrew Wikisource (community-maintained) — see the OpenLawBook
   * qualification — so this is a COMMUNITY consolidation signal, never an
   * official one. There is no free official consolidated source; a Law is never
   * marked as having official consolidation from this field.
   */
  hasOpenBookConsolidation: boolean;
  hasOfficialConsolidation: false; // no free official consolidated source exists
}

/** Classify a correction row into an official publication document type. */
export function classifyCorrection(c: Correction, isOriginal: boolean): PublicationDocType {
  const name = (c.name ?? "").trim();
  const type = (c.correctionType ?? "").trim();
  if (isOriginal) return "original_enactment";
  if (/ביטול|לבטל|—\s*בטל/.test(name)) return "repeal_publication";
  if (type === "עקיף") return "amendment_law"; // indirect amendment via another law
  if (type === "ישיר") return "correction"; // direct correction of this law
  if (/תיקון/.test(name)) return "correction";
  return "official_gazette_pdf";
}

/** Sortable key from a WCF ISO-ish date ("1974-04-05T00:00:00"); "" sorts last. */
function dateKey(d: string | null): string {
  const t = (d ?? "").trim();
  return t.length > 0 ? t : "9999-12-31T00:00:00";
}

/**
 * Detect the original enactment among correction rows. The API lists rows
 * newest-first and correctionNumber is often empty, so we identify the original
 * as the chronologically earliest row that is a DIRECT (ישיר, or unmarked)
 * publication whose date matches the law's first publication date when known —
 * never an indirect (עקיף) omnibus amendment.
 */
function detectOriginalItemId(
  item: ParsedLegislationLawItem,
  ordered: readonly Correction[],
): string | null {
  const firstPub = (item.general.publicationDate ?? "").trim();
  const directs = ordered.filter((c) => (c.correctionType ?? "").trim() !== "עקיף");
  const pool = directs.length > 0 ? directs : ordered.slice();
  if (firstPub.length > 0) {
    const match = pool.find((c) => (c.publicationDate ?? "").trim() === firstPub);
    if (match) return match.itemId ?? null;
  }
  // Fallback: earliest direct publication.
  return pool.length > 0 ? (pool[0].itemId ?? null) : null;
}

function buildLaw(item: ParsedLegislationLawItem): LawEntity {
  const g: General = item.general;
  return {
    canonicalId: lawPublicationId(item.itemId),
    entityType: "Law",
    israelLawId: item.itemId,
    title: g.hebSubject ?? g.knsName,
    validity: g.lawValidity,
    firstPublicationDate: g.publicationDate,
    latestPublicationDate: g.latestPublicationDate,
    openBookUrl: g.openBookUrl,
    hasOpenBookConsolidation: (g.openBookUrl ?? "").length > 0,
    hasOfficialConsolidation: false,
  };
}

export interface PublicationModel {
  law: LawEntity;
  documents: readonly PublicationDocument[];
}

/** Map a validated law item into a Law + its official publication documents. */
export function toPublicationModel(item: ParsedLegislationLawItem): PublicationModel {
  const law = buildLaw(item);
  // The API returns rows newest-first; order the chain chronologically so
  // `follows` edges and chainIndex reflect real publication order.
  const ordered = [...item.corrections].sort((a, b) =>
    dateKey(a.publicationDate).localeCompare(dateKey(b.publicationDate)),
  );
  const originalItemId = detectOriginalItemId(item, ordered);

  const documents: PublicationDocument[] = ordered.map((c, idx) => {
    const isOriginal = c.itemId !== null && c.itemId === originalItemId;
    const docType = classifyCorrection(c, isOriginal);
    const pdfUrl = c.filePath ? canonicalPdfUrl(c.filePath) : null;
    let amendEvtId: string | null = null;
    if (!isOriginal) {
      try {
        amendEvtId = amendmentEventId(item.itemId, c.correctionNumber, c.itemId);
      } catch {
        amendEvtId = null; // no correctionNumber and no itemId → not identifiable
      }
    }
    return {
      canonicalId: publicationId(c.itemId, item.itemId, c.correctionNumber),
      lawCanonicalId: law.canonicalId,
      entityType: "GovernmentDocument",
      docType,
      israelLawId: item.itemId,
      itemId: c.itemId,
      correctionNumber: c.correctionNumber,
      correctionType: c.correctionType,
      title: c.name,
      publicationSeries: c.publicationSeries,
      magazineNumber: c.magazineNumber,
      pageNumber: c.pageNumber,
      publicationDate: c.publicationDate,
      pdfUrl,
      // Full text lives in the PDF; until it is fetched+extracted the document
      // is metadata_only. content_level is never assumed to be full_text.
      contentLevel: pdfUrl ? "full_text" : "metadata_only",
      consolidationStatus: "non_consolidated_publication",
      authorityLevel: "primary_official",
      summary: c.summaryLaw,
      amendmentEventId: amendEvtId,
      chainIndex: idx,
    };
  });
  return { law, documents };
}

export type RelationType = "publishes" | "amends" | "follows" | "repeals";

export interface AmendmentEdge {
  type: RelationType;
  from: string; // publication canonical id
  to: string; // law or previous-publication canonical id
  evidence: string; // why this edge exists (field-based, not inferred text diff)
}

/**
 * Build the amendment graph edges from the ordered publication documents.
 *  - the original enactment `publishes` the Law;
 *  - each amendment `amends` the Law and `follows` the previous publication;
 *  - a repeal publication additionally `repeals` the Law.
 * `modifies`→Section edges are intentionally NOT produced here: they require
 * textual evidence from the amendment-operation parser, added downstream.
 */
export function buildAmendmentGraph(model: PublicationModel): AmendmentEdge[] {
  const edges: AmendmentEdge[] = [];
  let previous: PublicationDocument | null = null;
  for (const doc of model.documents) {
    if (doc.docType === "original_enactment") {
      edges.push({ type: "publishes", from: doc.canonicalId, to: model.law.canonicalId, evidence: "original_enactment row" });
    } else {
      edges.push({ type: "amends", from: doc.canonicalId, to: model.law.canonicalId, evidence: `correctionType=${doc.correctionType ?? "?"}` });
      if (doc.docType === "repeal_publication") {
        edges.push({ type: "repeals", from: doc.canonicalId, to: model.law.canonicalId, evidence: "repeal_publication classification" });
      }
    }
    if (previous && previous.canonicalId !== doc.canonicalId) {
      // Skip self-loops: a duplicated source itemId can place two rows under the
      // same publication canonical id (e.g. a correction-of-error PDF); a
      // `follows` edge from a node to itself is meaningless.
      edges.push({ type: "follows", from: doc.canonicalId, to: previous.canonicalId, evidence: "publication order" });
    }
    previous = doc;
  }
  return edges;
}

export { amendmentEventId };
