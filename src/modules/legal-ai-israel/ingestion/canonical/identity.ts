/**
 * Deterministic identity keys — Identity Resolution V1 (Step 11).
 *
 * V1 uses DETERMINISTIC rules only — no fuzzy engine, no auto-merge on person
 * names. Each entity type has an ordered list of strong keys; the first
 * available key wins, and its inputs are normalized so the same real-world
 * entity from two sources collapses to one canonical id. When no strong key is
 * available we fall back to a documented, explicit composite — never a guess.
 *
 * The key is a stable string of the form `<type>:<scheme>:<value>`; it is used
 * as `canonicalId` and is idempotent (same inputs → same id on every run).
 */
import { createHash } from "node:crypto";
import type { CanonicalEntityType } from "./envelope.ts";
import { parseCaseNumber } from "../../citation/case-number.ts";

function norm(s: string | null | undefined): string {
  return (s ?? "").normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
}

function hash10(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 10);
}

/** Normalize an Israeli case number to its canonical string, or the raw fallback. */
export function normalizeCaseNumber(raw: string | null): string | null {
  if (!raw || raw.trim().length === 0) return null;
  const parsed = parseCaseNumber(raw);
  return parsed ? parsed.normalized : norm(raw);
}

export interface LawIdentityInput {
  knessetLawId: string | null;
  officialNumber: string | null;
  title: string | null;
  publicationDate: string | null;
}
export function lawIdentity(i: LawIdentityInput): string {
  if (i.knessetLawId) return `Law:knesset_law_id:${i.knessetLawId}`;
  if (i.officialNumber) return `Law:official_number:${norm(i.officialNumber)}`;
  // documented fallback: title + publication date
  return `Law:title_date:${hash10(norm(i.title) + "|" + norm(i.publicationDate))}`;
}

export interface BillIdentityInput {
  knessetBillId: string | null;
  billNumber: string | null;
  knessetNumber: string | null;
  sessionNumber: string | null;
}
export function billIdentity(i: BillIdentityInput): string {
  if (i.knessetBillId) return `Bill:knesset_bill_id:${i.knessetBillId}`;
  // documented fallback: bill number + knesset + session
  return `Bill:num_knesset_session:${hash10(
    norm(i.billNumber) + "|" + norm(i.knessetNumber) + "|" + norm(i.sessionNumber),
  )}`;
}

export interface SectionIdentityInput {
  lawCanonicalId: string;
  sectionNumber: string;
}
export function sectionIdentity(i: SectionIdentityInput): string {
  return `Section:law_section:${hash10(i.lawCanonicalId + "|" + norm(i.sectionNumber))}`;
}

export interface DecisionIdentityInput {
  externalRecordId: string | null;
  authorityOrCourt: string | null;
  caseNumberRaw: string | null;
  decisionDate: string | null;
}
export function decisionIdentity(i: DecisionIdentityInput): string {
  const caseNorm = normalizeCaseNumber(i.caseNumberRaw);
  if (caseNorm && i.authorityOrCourt && i.decisionDate) {
    return `Decision:case_auth_date:${hash10(
      caseNorm + "|" + norm(i.authorityOrCourt) + "|" + norm(i.decisionDate),
    )}`;
  }
  if (i.externalRecordId) return `Decision:external_record_id:${norm(i.externalRecordId)}`;
  return `Decision:case_auth_date:${hash10(
    norm(caseNorm) + "|" + norm(i.authorityOrCourt) + "|" + norm(i.decisionDate),
  )}`;
}

export interface CaseIdentityInput {
  caseNumberRaw: string | null;
  authorityOrCourt: string | null;
  externalRecordId: string | null;
}
export function caseIdentity(i: CaseIdentityInput): string {
  const caseNorm = normalizeCaseNumber(i.caseNumberRaw);
  if (caseNorm && i.authorityOrCourt) {
    return `Case:case_auth:${hash10(caseNorm + "|" + norm(i.authorityOrCourt))}`;
  }
  if (i.externalRecordId) return `Case:external_record_id:${norm(i.externalRecordId)}`;
  return `Case:case_auth:${hash10(norm(caseNorm) + "|" + norm(i.authorityOrCourt))}`;
}

export interface DocumentIdentityInput {
  sourcePlatform: string;
  canonicalUrl: string | null;
  contentHash: string | null;
}
export function documentIdentity(i: DocumentIdentityInput): string {
  if (i.contentHash) return `DocumentSource:content_hash:${i.contentHash}`;
  if (i.canonicalUrl) return `DocumentSource:url:${hash10(norm(i.canonicalUrl))}`;
  return `DocumentSource:src:${hash10(norm(i.sourcePlatform))}`;
}

/** Simple, name-based entities (Court/Authority/Topic/Party) — deterministic
 *  normalization only; NEVER auto-merged on a person name alone. */
export function nameIdentity(type: CanonicalEntityType, name: string, scope?: string): string {
  return `${type}:name:${hash10(norm(name) + "|" + norm(scope))}`;
}

/** Topic by curated slug when present, else normalized label. */
export function topicIdentity(slugOrLabel: string): string {
  return `Topic:slug:${norm(slugOrLabel).replace(/\s+/g, "-")}`;
}
