/**
 * Matter Intelligence — the canonical SOURCE record vocabulary (Slice 2.1.0). PURE.
 *
 * `MatterSource` is the single, DB-decoupled shape that the authorized read
 * (`read.ts`) maps every persisted Capability-1 row into. It is read ONCE and
 * then derived into the two consumers: the Matter Workspace view (presentation)
 * and the canonical `MatterIntelligence` model (domain). Nothing else reads the
 * raw tables. No React, no Supabase, no design-system imports.
 */

export interface MatterHeaderInput {
  id: string;                 // canonical uuid
  slug: string;
  titleHe: string;
  fileNoHe: string | null;
  forumHe: string | null;
  legalDomain: string;        // "labor"
  procedureType: string;
  topic: string;
  currentStageId: string;
  status: string;             // open | closed | archived
  openedAtISO: string;
  confidentiality: string | null;
}

export interface FactInput {
  id: string;
  factKey: string;
  statementHe: string;
  status: string;
  sourceHe: string | null;
}

export interface ParticipantInput {
  id: string;
  role: string;
  nameHe: string | null;
  kind: string | null;        // person | company
  contactId?: string | null;  // linked contact (enriched by the read; optional for fixtures)
  idNumberHe: string | null;
  responsiveness: string | null;
  archived: boolean;
}

export interface DocumentInput {
  id: string;
  titleHe: string;
  documentType: string;
  evidenceType: string;
  approvalState: string;
  dateISO: string | null;
  createdAtISO: string;
}

export interface EvidenceInput {
  id: string;
  labelHe: string;
  evidenceType: string;
  mandatory: boolean;
  status: string;
}

export interface DeadlineInput {
  id: string;
  labelHe: string;
  dueAtISO: string | null;
  strict: boolean;
  basisHe: string | null;
  source: string;
  confidence: string;
}

export interface ActivityInput {
  id: string;
  occurredAtISO: string;
  kind: string;
  descriptionHe: string;
  actorHe: string | null;
}

/** The canonical raw Matter source — one authorized read produces this. */
export interface MatterSource {
  header: MatterHeaderInput;
  clientNameHe: string | null;
  responsibleLawyerHe: string | null;
  facts: FactInput[];
  participants: ParticipantInput[];
  documents: DocumentInput[];
  evidence: EvidenceInput[];
  deadlines: DeadlineInput[];
  activity: ActivityInput[];
  nowISO: string;
}
