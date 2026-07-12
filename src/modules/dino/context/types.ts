/**
 * Matter-context model (Epic 3A, Phase 3).
 * HARD RULE: allegations are never merged into facts. Every item carries
 * its epistemic status and provenance.
 */

export type ContextItemStatus =
  | "confirmed_fact"
  | "client_allegation"
  | "opposing_party_allegation"
  | "document_derived_fact"
  | "inference"
  | "unknown"
  | "disputed_fact";

export interface ContextProvenance {
  origin: "user_supplied" | "synthetic_fixture" | "lawme_record" | "derived";
  reference: string;          // fixture id / record id / "user message"
  recordedAt: string;         // ISO
}

export interface ContextItem {
  id: string;
  field: string;              // e.g. "employment_duration"
  statementHe: string;
  status: ContextItemStatus;
  provenance: ContextProvenance;
}

export interface MatterContextPackage {
  matterId: string | null;
  clientId: string | null;
  /** future-compatible identity block — null-filled in the POC */
  identity: {
    matterTitleHe: string | null;
    client: string | null;
    opposingParties: string[];
    court: string | null;
    procedure: string | null;
    judge: string | null;
    legalDomain: string | null;
  };
  items: ContextItem[];
  chronology: { date: string | null; eventHe: string; itemId: string }[];
  deadlines: { date: string | null; whatHe: string; itemId: string }[];
  unresolvedFactualQuestions: string[];
  confidentialityRestrictions: string[];
  sourceRestrictions: string[];
  /** POC honesty flag */
  synthetic: boolean;
  assembledAt: string;
  limitationsHe: string[];
}
