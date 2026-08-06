/**
 * Knesset OData → Canonical mapping (Track A, Step 6).
 *
 * Entity sets mapped for V1:
 *   KNS_IsraelLaw     → Law
 *   KNS_Bill          → Bill
 *   KNS_DocumentBill  → DocumentSource + GovernmentDocument (a bill document)
 *   KNS_Subject       → Topic
 *   KNS_BillInitiator → Party (reference to a Person/Organization)
 *   KNS_LawBinding    → Law/Bill relationships (edges only)
 *
 * Field-level crosswalk is documented in docs/ingestion/knesset-odata-mapping.md.
 * Source-specific fields with no canonical home go to `sourceExtras`, never to a
 * canonical column. Knesset legislation carries no §6 copyright; its texts are
 * open — but a KNS_DocumentBill is a linked FILE, so unless the row itself
 * carries text we mark content_level = metadata_only (never assume full_text).
 */
import type { CanonicalRecord } from "../canonical/envelope.ts";
import type { RawRecord } from "../contract.ts";
import {
  lawIdentity, billIdentity, documentIdentity, nameIdentity, topicIdentity,
} from "../canonical/identity.ts";
import type { MapContext } from "./shared.ts";
import { buildEnvelope, hashObject, isoDate, str } from "./shared.ts";

export const KNESSET_MAPPING_VERSION = "knesset-map-1";
const PLATFORM = "knesset_odata";
const PUBLISHER = "knesset";

function base(entityType: CanonicalRecord["entityType"]): Pick<CanonicalRecord, "entityType" | "aiDerivations"> {
  return { entityType, aiDerivations: null };
}

export function mapKnessetLaw(rec: RawRecord, ctx: MapContext): CanonicalRecord[] {
  const r = rec.raw;
  const lawId = str(r.LawID) ?? rec.externalId;
  const title = str(r.Name);
  const publicationDate = isoDate(r.PublicationDate);
  const canonicalId = lawIdentity({
    knessetLawId: lawId, officialNumber: str(r.OfficialLawNumber),
    title, publicationDate,
  });
  const fields = {
    title,
    lawType: str(r.LawTypeDesc),
    status: str(r.LawValidity) ?? "unknown",
    knessetNumber: str(r.KnessetNum),
    enactmentDate: publicationDate,
  };
  return [{
    ...base("Law"),
    envelope: buildEnvelope({
      canonicalId, entityType: "Law",
      externalIdentifiers: [{ scheme: "knesset_law_id", value: lawId, confidence: 1 }],
      sourcePlatform: PLATFORM, sourcePublisher: PUBLISHER,
      sourceDataset: "KNS_IsraelLaw", sourceResource: "KNS_IsraelLaw",
      sourceUrl: rec.sourceUrl, extractionMethod: "api",
      confidence: title ? 0.95 : 0.6, contentHash: hashObject(fields),
      rawRecordHash: rec.rawHash, externalRecordId: lawId,
      contentLevel: "metadata_only",
    }, ctx),
    fields,
    primaryText: null,
    extractedMetadata: r,
    sourceExtras: { lastUpdatedDate: str(r.LastUpdatedDate) },
    relationships: [],
    aiDerivations: null,
    deleted: rec.deleted,
  }];
}

export function mapKnessetBill(rec: RawRecord, ctx: MapContext): CanonicalRecord[] {
  const r = rec.raw;
  const billId = str(r.BillID) ?? rec.externalId;
  const canonicalId = billIdentity({
    knessetBillId: billId, billNumber: str(r.Number),
    knessetNumber: str(r.KnessetNum), sessionNumber: str(r.SessionNum),
  });
  const fields = {
    title: str(r.Name),
    billType: str(r.SubTypeDesc),
    knessetNumber: str(r.KnessetNum),
    status: str(r.StatusDesc) ?? "unknown",
    publicationDate: isoDate(r.PublicationDate),
  };
  return [{
    ...base("Bill"),
    envelope: buildEnvelope({
      canonicalId, entityType: "Bill",
      externalIdentifiers: [{ scheme: "knesset_bill_id", value: billId, confidence: 1 }],
      sourcePlatform: PLATFORM, sourcePublisher: PUBLISHER,
      sourceDataset: "KNS_Bill", sourceResource: "KNS_Bill",
      sourceUrl: rec.sourceUrl, extractionMethod: "api",
      confidence: fields.title ? 0.95 : 0.6, contentHash: hashObject(fields),
      rawRecordHash: rec.rawHash, externalRecordId: billId,
      contentLevel: "metadata_only",
    }, ctx),
    fields,
    primaryText: null,
    extractedMetadata: r,
    sourceExtras: { statusId: str(r.StatusID), lastUpdatedDate: str(r.LastUpdatedDate) },
    relationships: [],
    aiDerivations: null,
    deleted: rec.deleted,
  }];
}

export function mapKnessetDocumentBill(rec: RawRecord, ctx: MapContext): CanonicalRecord[] {
  const r = rec.raw;
  const docId = str(r.DocumentBillID) ?? rec.externalId;
  const billId = str(r.BillID);
  const filePath = str(r.FilePath);
  const canonicalId = documentIdentity({
    sourcePlatform: PLATFORM, canonicalUrl: filePath, contentHash: null,
  });
  const fields = {
    title: str(r.GroupTypeDesc) ?? str(r.ApplicationDesc),
    documentKind: str(r.ApplicationDesc),
    fileUrl: filePath,
    format: str(r.ApplicationDesc),
  };
  const rels = billId
    ? [{
        type: "documentOf", fromCanonicalId: canonicalId,
        toCanonicalId: billIdentity({ knessetBillId: billId, billNumber: null, knessetNumber: null, sessionNumber: null }),
        toExternalRef: `KNS_Bill:${billId}`, confidence: 1,
      }]
    : [];
  // A linked file, not inline text → metadata_only until the file is fetched.
  return [{
    ...base("DocumentSource"),
    envelope: buildEnvelope({
      canonicalId, entityType: "DocumentSource",
      externalIdentifiers: [{ scheme: "knesset_documentbill_id", value: docId, confidence: 1 }],
      sourcePlatform: PLATFORM, sourcePublisher: PUBLISHER,
      sourceDataset: "KNS_DocumentBill", sourceResource: "KNS_DocumentBill",
      sourceUrl: rec.sourceUrl, extractionMethod: "api",
      confidence: filePath ? 0.9 : 0.5, contentHash: hashObject(fields),
      rawRecordHash: rec.rawHash, externalRecordId: docId,
      contentLevel: "metadata_only",
    }, ctx),
    fields,
    primaryText: null,
    extractedMetadata: r,
    sourceExtras: { groupTypeDesc: str(r.GroupTypeDesc) },
    relationships: rels,
    aiDerivations: null,
    deleted: rec.deleted,
  }];
}

export function mapKnessetSubject(rec: RawRecord, ctx: MapContext): CanonicalRecord[] {
  const r = rec.raw;
  const subjectId = str(r.SubjectID) ?? rec.externalId;
  const name = str(r.Name) ?? subjectId;
  const canonicalId = topicIdentity(name);
  const fields = { label: name, taxonomy: "knesset_subject" };
  return [{
    ...base("Topic"),
    envelope: buildEnvelope({
      canonicalId, entityType: "Topic",
      externalIdentifiers: [{ scheme: "knesset_subject_id", value: subjectId, confidence: 1 }],
      sourcePlatform: PLATFORM, sourcePublisher: PUBLISHER,
      sourceDataset: "KNS_Subject", sourceResource: "KNS_Subject",
      sourceUrl: rec.sourceUrl, extractionMethod: "api",
      confidence: 0.9, contentHash: hashObject(fields),
      rawRecordHash: rec.rawHash, externalRecordId: subjectId,
      contentLevel: "metadata_only",
    }, ctx),
    fields,
    primaryText: null,
    extractedMetadata: r,
    sourceExtras: {},
    relationships: [],
    aiDerivations: null,
    deleted: rec.deleted,
  }];
}

export function mapKnessetBillInitiator(rec: RawRecord, ctx: MapContext): CanonicalRecord[] {
  const r = rec.raw;
  const billId = str(r.BillID);
  const personId = str(r.PersonID) ?? rec.externalId;
  const canonicalId = nameIdentity("Party", `person:${personId}`, "knesset_initiator");
  const fields = {
    role: "initiator",
    personExternalId: personId,
    isInitiator: r.IsInitiator === true || str(r.IsInitiator) === "1",
    ordinal: str(r.Ordinal),
  };
  const rels = billId
    ? [{
        type: "initiatorOf", fromCanonicalId: canonicalId,
        toCanonicalId: billIdentity({ knessetBillId: billId, billNumber: null, knessetNumber: null, sessionNumber: null }),
        toExternalRef: `KNS_Bill:${billId}`, confidence: 1,
      }]
    : [];
  return [{
    ...base("Party"),
    envelope: buildEnvelope({
      canonicalId, entityType: "Party",
      externalIdentifiers: [{ scheme: "knesset_person_id", value: personId, confidence: 1 }],
      sourcePlatform: PLATFORM, sourcePublisher: PUBLISHER,
      sourceDataset: "KNS_BillInitiator", sourceResource: "KNS_BillInitiator",
      sourceUrl: rec.sourceUrl, extractionMethod: "api",
      confidence: 0.85, contentHash: hashObject(fields),
      rawRecordHash: rec.rawHash, externalRecordId: personId,
      contentLevel: "metadata_only",
    }, ctx),
    fields,
    primaryText: null,
    extractedMetadata: r,
    sourceExtras: {},
    relationships: rels,
    aiDerivations: null,
    deleted: rec.deleted,
  }];
}

/** Dispatch by entity set name. Unknown sets return [] (never fabricate). */
export function mapKnessetRecord(entitySet: string, rec: RawRecord, ctx: MapContext): CanonicalRecord[] {
  switch (entitySet) {
    case "KNS_IsraelLaw": return mapKnessetLaw(rec, ctx);
    case "KNS_Bill": return mapKnessetBill(rec, ctx);
    case "KNS_DocumentBill": return mapKnessetDocumentBill(rec, ctx);
    case "KNS_Subject": return mapKnessetSubject(rec, ctx);
    case "KNS_BillInitiator": return mapKnessetBillInitiator(rec, ctx);
    default: return [];
  }
}
