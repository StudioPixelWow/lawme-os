/**
 * data.gov.il Tier-1 → Canonical mapping (Track B, Step 7).
 *
 * Datasets (one CKAN adapter, per-dataset config — never a collector per set):
 *   ararim    (החלטות בתי הדין לעררים)   — full documents (CSV + PDF)
 *   mishmoret (החלטות בתי הדין למשמורת)  — full documents (CSV + PDF)
 *   judgments (פסקי דין חופש-מידע)        — summary/metadata only (no full text)
 *
 * A CSV row maps to: Case + Decision + Authority|Court + Party(+) + Topic +
 * DocumentSource (+ Citation when the row carries one). content_level is set
 * EXPLICITLY per dataset and per row — a summary row is never marked full_text.
 * Field crosswalk: docs/ingestion/data-gov-tier1-mapping.md.
 */
import type { CanonicalRecord, ContentLevel, CanonicalRelationship } from "../canonical/envelope.ts";
import type { RawRecord } from "../contract.ts";
import {
  caseIdentity, decisionIdentity, documentIdentity, nameIdentity, topicIdentity,
} from "../canonical/identity.ts";
import type { MapContext } from "./shared.ts";
import { buildEnvelope, hashObject, hashText, isoDate, primaryText, str } from "./shared.ts";

export const TIER1_MAPPING_VERSION = "datagov-tier1-map-1";
const PLATFORM = "data_gov_il";
const PUBLISHER = "ministry_of_justice";

export interface Tier1DatasetConfig {
  datasetId: string;
  courtEntityType: "Authority" | "Court";
  defaultCourtName: string;
  contentLevel: ContentLevel; // dataset-level default (row may downgrade)
  hasFullDocuments: boolean;
}

export const TIER1_DATASETS: Readonly<Record<string, Tier1DatasetConfig>> = {
  ararim: {
    datasetId: "ararim", courtEntityType: "Authority",
    defaultCourtName: "בתי הדין לעררים", contentLevel: "full_text", hasFullDocuments: true,
  },
  mishmoret: {
    datasetId: "mishmoret", courtEntityType: "Authority",
    defaultCourtName: "בתי הדין למשמורת", contentLevel: "full_text", hasFullDocuments: true,
  },
  judgments: {
    datasetId: "judgments", courtEntityType: "Court",
    defaultCourtName: "בתי המשפט", contentLevel: "summary", hasFullDocuments: false,
  },
};

function pick(raw: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const k of keys) {
    if (k in raw) { const v = str(raw[k]); if (v) return v; }
  }
  return null;
}

const K_CASE = ["מספר הליך", "מספר תיק", "case_number", "caseNumber", "מספר"];
const K_PARTIES = ["צדדים", "שמות הצדדים", "parties", "מבקש", "משיב"];
const K_COURT = ["ערכאה", "בית הדין", "בית המשפט", "court", "authority", "רשות"];
const K_DATE = ["תאריך החלטה", "תאריך מתן ההחלטה", "תאריך", "decision_date", "date"];
const K_SUMMARY = ["תמצית", "תקציר", "summary", "עיקרי ההחלטה"];
const K_DISTRICT = ["מחוז", "district"];
const K_TOPIC = ["נושא", "topic", "תחום"];
const K_PDF = ["קישור", "קישור למסמך", "url", "pdf", "document_url", "מסמך"];
const K_FULLTEXT = ["decisionText", "full_text", "טקסט מלא", "נוסח ההחלטה"];
const K_COST = ["הוצאות", "costs"];

export function mapDataGovTier1Row(datasetId: string, rec: RawRecord, ctx: MapContext): CanonicalRecord[] {
  const cfg = TIER1_DATASETS[datasetId];
  if (!cfg) return []; // unknown dataset — never fabricate
  const r = rec.raw;

  const caseNumberRaw = pick(r, K_CASE);
  const courtName = pick(r, K_COURT) ?? cfg.defaultCourtName;
  const decisionDate = isoDate(pick(r, K_DATE));
  const summary = pick(r, K_SUMMARY);
  const fullText = cfg.hasFullDocuments ? pick(r, K_FULLTEXT) : null;
  const pdfUrl = pick(r, K_PDF);
  const topicLabel = pick(r, K_TOPIC);
  const district = pick(r, K_DISTRICT);
  const partiesRaw = pick(r, K_PARTIES);

  // content_level: explicit. full only if we actually hold full text.
  const contentLevel: ContentLevel = fullText && fullText.trim().length > 0
    ? "full_text"
    : summary && summary.trim().length > 0
      ? "summary"
      : cfg.contentLevel === "full_text"
        ? "metadata_only" // dataset can have full docs but THIS row hasn't the text yet
        : cfg.contentLevel;

  const out: CanonicalRecord[] = [];

  // ---- Authority / Court ----
  const courtId = nameIdentity(cfg.courtEntityType, courtName, "il_court");
  out.push({
    entityType: cfg.courtEntityType,
    envelope: buildEnvelope({
      canonicalId: courtId, entityType: cfg.courtEntityType,
      externalIdentifiers: [{ scheme: "court_name", value: courtName, confidence: 0.7 }],
      sourcePlatform: PLATFORM, sourcePublisher: PUBLISHER,
      sourceDataset: datasetId, sourceResource: datasetId,
      sourceUrl: rec.sourceUrl, extractionMethod: "csv_row",
      confidence: 0.7, contentHash: hashObject({ name: courtName }),
      rawRecordHash: rec.rawHash, externalRecordId: `court:${courtName}`,
      contentLevel: "metadata_only",
    }, ctx),
    fields: { name: courtName, courtType: cfg.courtEntityType === "Authority" ? "tribunal" : "court" },
    primaryText: null, extractedMetadata: {}, sourceExtras: {}, relationships: [],
    aiDerivations: null, deleted: rec.deleted,
  });

  // ---- Case ----
  const caseId = caseIdentity({ caseNumberRaw, authorityOrCourt: courtName, externalRecordId: rec.externalId });
  out.push({
    entityType: "Case",
    envelope: buildEnvelope({
      canonicalId: caseId, entityType: "Case",
      externalIdentifiers: [{ scheme: "net_hamishpat_case_no", value: caseNumberRaw ?? rec.externalId, confidence: caseNumberRaw ? 0.9 : 0.5 }],
      sourcePlatform: PLATFORM, sourcePublisher: PUBLISHER,
      sourceDataset: datasetId, sourceResource: datasetId,
      sourceUrl: rec.sourceUrl, extractionMethod: "csv_row",
      confidence: caseNumberRaw ? 0.85 : 0.5, contentHash: hashObject({ caseNumberRaw, courtName }),
      rawRecordHash: rec.rawHash, externalRecordId: rec.externalId,
      contentLevel: "metadata_only",
    }, ctx),
    fields: { caseNumberRaw, court: courtName, district, filedDate: null },
    primaryText: null, extractedMetadata: {}, sourceExtras: district ? { district } : {},
    relationships: [{ type: "heardBy", fromCanonicalId: caseId, toCanonicalId: courtId, toExternalRef: null, confidence: 0.9 }],
    aiDerivations: null, deleted: rec.deleted,
  });

  // ---- DocumentSource (the linked PDF, when present) ----
  let documentId: string | null = null;
  if (pdfUrl) {
    documentId = documentIdentity({ sourcePlatform: PLATFORM, canonicalUrl: pdfUrl, contentHash: null });
    out.push({
      entityType: "DocumentSource",
      envelope: buildEnvelope({
        canonicalId: documentId, entityType: "DocumentSource",
        externalIdentifiers: [{ scheme: "ckan_resource_url", value: pdfUrl, confidence: 1 }],
        sourcePlatform: PLATFORM, sourcePublisher: PUBLISHER,
        sourceDataset: datasetId, sourceResource: datasetId,
        sourceUrl: pdfUrl, extractionMethod: "csv_row",
        confidence: 0.9, contentHash: hashObject({ url: pdfUrl }),
        rawRecordHash: rec.rawHash, externalRecordId: pdfUrl,
        contentLevel: "metadata_only",
      }, ctx),
      fields: { url: pdfUrl, mimeType: "application/pdf" },
      primaryText: null, extractedMetadata: {}, sourceExtras: {}, relationships: [],
      aiDerivations: null, deleted: rec.deleted,
    });
  }

  // ---- Decision ----
  const decisionId = decisionIdentity({
    externalRecordId: rec.externalId, authorityOrCourt: courtName,
    caseNumberRaw, decisionDate,
  });
  const decisionText = contentLevel === "full_text" ? fullText : summary;
  const decisionRels: CanonicalRelationship[] = [
    { type: "inCase", fromCanonicalId: decisionId, toCanonicalId: caseId, toExternalRef: null, confidence: 0.9 },
    { type: "decidedBy", fromCanonicalId: decisionId, toCanonicalId: courtId, toExternalRef: null, confidence: 0.9 },
  ];
  if (documentId) {
    decisionRels.push({ type: "backedBy", fromCanonicalId: decisionId, toCanonicalId: documentId, toExternalRef: null, confidence: 1 });
  }
  const decisionFields = {
    caseNumberRaw, court: courtName, decisionDate,
    summary: summary ?? null, costs: pick(r, K_COST),
    contentLevel,
  };
  out.push({
    entityType: "Decision",
    envelope: buildEnvelope({
      canonicalId: decisionId, entityType: "Decision",
      externalIdentifiers: [{ scheme: "net_hamishpat_case_no", value: caseNumberRaw ?? rec.externalId, confidence: caseNumberRaw ? 0.9 : 0.5 }],
      sourcePlatform: PLATFORM, sourcePublisher: PUBLISHER,
      sourceDataset: datasetId, sourceResource: datasetId,
      sourceUrl: rec.sourceUrl, extractionMethod: "csv_row",
      confidence: caseNumberRaw ? 0.85 : 0.55,
      contentHash: decisionText ? hashText(decisionText) : hashObject(decisionFields),
      rawRecordHash: rec.rawHash, externalRecordId: rec.externalId,
      contentLevel,
    }, ctx),
    fields: decisionFields,
    primaryText: contentLevel === "full_text" && decisionText ? primaryText(decisionText) : null,
    extractedMetadata: r,
    sourceExtras: {},
    relationships: decisionRels,
    aiDerivations: null, deleted: rec.deleted,
  });

  // ---- Party (single combined display for V1; never split persons heuristically) ----
  if (partiesRaw) {
    const partyId = nameIdentity("Party", partiesRaw, caseId);
    out.push({
      entityType: "Party",
      envelope: buildEnvelope({
        canonicalId: partyId, entityType: "Party",
        externalIdentifiers: [{ scheme: "case_party_display", value: partiesRaw, confidence: 0.6 }],
        sourcePlatform: PLATFORM, sourcePublisher: PUBLISHER,
        sourceDataset: datasetId, sourceResource: datasetId,
        sourceUrl: rec.sourceUrl, extractionMethod: "csv_row",
        confidence: 0.6, contentHash: hashObject({ partiesRaw, caseId }),
        rawRecordHash: rec.rawHash, externalRecordId: `${rec.externalId}:parties`,
        contentLevel: "metadata_only",
      }, ctx),
      fields: { display: partiesRaw, role: "party" },
      primaryText: null, extractedMetadata: {}, sourceExtras: {},
      relationships: [{ type: "partyIn", fromCanonicalId: partyId, toCanonicalId: caseId, toExternalRef: null, confidence: 0.7 }],
      aiDerivations: null, deleted: rec.deleted,
    });
  }

  // ---- Topic ----
  if (topicLabel) {
    const topicId = topicIdentity(topicLabel);
    out.push({
      entityType: "Topic",
      envelope: buildEnvelope({
        canonicalId: topicId, entityType: "Topic",
        externalIdentifiers: [{ scheme: "datagov_topic_label", value: topicLabel, confidence: 0.6 }],
        sourcePlatform: PLATFORM, sourcePublisher: PUBLISHER,
        sourceDataset: datasetId, sourceResource: datasetId,
        sourceUrl: rec.sourceUrl, extractionMethod: "csv_row",
        confidence: 0.6, contentHash: hashObject({ label: topicLabel }),
        rawRecordHash: rec.rawHash, externalRecordId: `topic:${topicLabel}`,
        contentLevel: "metadata_only",
      }, ctx),
      fields: { label: topicLabel, taxonomy: "datagov_label" },
      primaryText: null, extractedMetadata: {}, sourceExtras: {},
      relationships: [{ type: "aboutTopic", fromCanonicalId: decisionId, toCanonicalId: topicId, toExternalRef: null, confidence: 0.5 }],
      aiDerivations: null, deleted: rec.deleted,
    });
  }

  return out;
}
