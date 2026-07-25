/**
 * Matter Workspace — view-model contract (Capability 2, Slice 2.0.0). PURE.
 *
 * The first user-facing Matter screen is a pure function of persisted
 * Capability-1 data. This module defines (a) the ROW INPUTS the loader maps
 * persisted rows into, and (b) the VIEW MODEL the React sections render. It has
 * NO React, NO Supabase and NO design-system imports, so the presenter that
 * produces it (`present.ts`) is deterministically unit-testable under
 * `node --test --experimental-strip-types`.
 *
 * Doctrine honored here (LawME Design Bible / Matter Workspace docs):
 *  - never fabricate — an unknown name/owner reads "לא ידוע", never invented;
 *  - categorical before numeric — facts carry an epistemic label, not a score;
 *  - a new/empty matter must never look broken; a degraded one never healthy.
 */

/** A design-system status name — the two-accent semantic vocabulary. */
export type Tone =
  | "urgent" | "today" | "waiting" | "progress" | "new"
  | "completed" | "risk" | "scheduled" | "reviewed" | "signed";

/* ------------------------------------------------------------------ inputs */
/* Plain, DB-decoupled shapes. The loader parses persisted rows into these; the
 * presenter consumes only these (so tests construct them without a database). */

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
  confidentiality: string | null;   // optional column; null when absent
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

export interface WorkspaceInput {
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

/* ------------------------------------------------------------------ output */

export type PriorityLevel = "urgent" | "high" | "normal";
export interface WorkspacePriority {
  level: PriorityLevel;
  labelHe: string;
  tone: Tone;
}

export interface WorkspaceHero {
  titleHe: string;
  procedureLabelHe: string;
  legalDomainHe: string;
  stageLabelHe: string;
  clientNameHe: string;            // "לא ידוע" when unknown (never fabricated)
  responsibleLawyerHe: string;     // "לא ידוע" when unknown
  createdAtISO: string;
  createdLabelHe: string;
  statusLabelHe: string;
  statusTone: Tone;
  priority: WorkspacePriority;
  fileNoHe: string | null;
  forumHe: string | null;
  confidentialityHe: string | null;
}

export type TimelineGlyphKind =
  | "created" | "document" | "deadline" | "fact" | "participant" | "note" | "generic";

export interface TimelineEvent {
  id: string;
  occurredAtISO: string;
  timeLabelHe: string;
  kind: string;
  kindLabelHe: string;
  descriptionHe: string;
  actorHe: string | null;
  glyph: TimelineGlyphKind;
}

export interface TimelineDay {
  dayISO: string;          // YYYY-MM-DD (Asia/Jerusalem)
  dayLabelHe: string;
  events: TimelineEvent[]; // newest first within the day
}

export interface WorkspaceTimeline {
  days: TimelineDay[];     // newest day first
  total: number;
}

export type FactEpistemic = "established" | "alleged" | "disputed" | "unknown";

export interface FactView {
  id: string;
  factKey: string;
  statementHe: string;
  statusLabelHe: string;
  epistemic: FactEpistemic;
  tone: Tone;
  sourceHe: string | null;
}

export interface FactGroupView {
  key: FactEpistemic;
  labelHe: string;
  tone: Tone;
  facts: FactView[];
}

export interface WorkspaceFacts {
  groups: FactGroupView[];
  total: number;
}

export interface ParticipantView {
  id: string;
  nameHe: string;
  kind: string | null;
  roleLabelHe: string;
  idNumberHe: string | null;
  responsivenessHe: string | null;
}

export interface ParticipantGroupView {
  role: string;
  roleLabelHe: string;
  participants: ParticipantView[];
}

export interface WorkspaceParticipants {
  groups: ParticipantGroupView[];
  total: number;
}

export interface DocumentView {
  id: string;
  titleHe: string;
  documentTypeLabelHe: string;
  evidenceTypeLabelHe: string;
  approvalLabelHe: string;
  approvalTone: Tone;
  dateLabelHe: string | null;
}

export interface WorkspaceDocuments {
  items: DocumentView[];   // latest first, capped
  total: number;
  shown: number;
}

export type EvidenceGroupKey = "mandatory" | "optional";

export interface EvidenceView {
  id: string;
  labelHe: string;
  evidenceTypeLabelHe: string;
  statusLabelHe: string;
  tone: Tone;
  mandatory: boolean;
}

export interface EvidenceGroupView {
  key: EvidenceGroupKey;
  labelHe: string;
  items: EvidenceView[];
  collected: number;
  total: number;
}

export interface WorkspaceEvidence {
  groups: EvidenceGroupView[];
  total: number;
}

export type DeadlineBucketKey = "overdue" | "upcoming" | "unscheduled" | "completed";

export interface DeadlineView {
  id: string;
  labelHe: string;
  dueLabelHe: string | null;
  relativeHe: string | null;
  strict: boolean;
  basisHe: string | null;
  sourceLabelHe: string;
  tone: Tone;
  daysRemaining: number | null;
}

export interface DeadlineBucketView {
  key: DeadlineBucketKey;
  labelHe: string;
  tone: Tone;
  items: DeadlineView[];
}

export interface WorkspaceDeadlines {
  buckets: DeadlineBucketView[];   // only non-empty buckets, in priority order
  total: number;
  nearest: DeadlineView | null;
}

export interface MatterWorkspaceView {
  matterId: string;
  slug: string;
  hero: WorkspaceHero;
  timeline: WorkspaceTimeline;
  facts: WorkspaceFacts;
  participants: WorkspaceParticipants;
  documents: WorkspaceDocuments;
  evidence: WorkspaceEvidence;
  deadlines: WorkspaceDeadlines;
}
