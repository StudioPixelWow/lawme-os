/**
 * Matter App — view-model types (v3, the Matter Room).
 * The presentation contract for the full first-viewport Matter Room: identity,
 * state, procedure/progress, operational focus, and an intelligence summary —
 * every field derived by the adapter from a computed MatterProfile. The view
 * computes nothing.
 *
 * `Tone` mirrors the design-system status set exactly, so a tone flows straight
 * into StatusText/StatusTag without the pure adapter importing a component file.
 */
export type Tone =
  | "urgent" | "today" | "waiting" | "progress" | "new"
  | "completed" | "risk" | "scheduled" | "reviewed" | "signed";

/** Level 1 — matter presence. */
export interface IdentityVM {
  matterId: string;
  titleHe: string;
  fileNoHe: string | null;
  clientHe: string;
  practiceAreaHe: string;
  forumHe: string | null;
  ownerHe: string | null;
  stageTitleHe: string | null;
}

/** Level 2 — overall posture headline. */
export interface PostureVM {
  labelHe: string;
  tone: Tone;
}

/** Level 2 — the one critical deadline, when a real one is imminent. */
export interface DeadlineVM {
  labelHe: string;
  /** humanized relative time — "בעוד 4 ימים" / "היום" / "עבר לפני N ימים" */
  whenHe: string;
  /** full formatted date — "יום חמישי, 16.7.2026" */
  dateHe: string;
  daysRemaining: number | null;
  strict: boolean;
  tone: Tone;
}

/** Level 2 / 4 — human-review requirement. */
export interface ReviewVM {
  targetHe: string;
  requiresApproval: boolean;
}

/** Level 3 — procedure position on the gold meridian. */
export interface SpineVM {
  prevHe: string | null;
  currentHe: string;
  nextHe: string | null;
  /** stage ids for deep-linking each node to its milestone detail */
  prevId: string | null;
  currentId: string;
  nextId: string | null;
  stageNumberHe: string;
  /** the current→next transition is blocked */
  blocked: boolean;
  blockedReasonHe: string | null;
}

/** Level 4 — the single most important blocker, as an operational object. */
export interface BlockerVM {
  titleHe: string;
  whyHe: string;
  stageHe: string | null;
  /** the missing fact/evidence/document label(s) */
  missingHe: string[];
  /** primary legal/procedural source citation */
  sourceHe: string | null;
  tone: Tone;
  /** the drill-down action that would resolve it */
  actionLabelHe: string;
}

/** Level 4 — the top recommended action, the matter's next move. */
export interface ActionVM {
  labelHe: string;
  reasonHe: string;
  ownerHe: string | null;
  /** null when the due date is genuinely unknown (never invented) */
  dueHe: string | null;
  requiresApproval: boolean;
  reviewTargetHe: string | null;
  expectedEffectHe: string;
}

/** Level 5 — one row of the compact diagnostic rail. */
export interface ScoreRowVM {
  /** the dimension id, for deep-linking the row to its dimension detail */
  id: string;
  labelHe: string;
  stateHe: string;
  tone: Tone;
  emphasis: "weak" | "strong" | null;
}

export interface ScoreRailVM {
  rows: ScoreRowVM[];
  /** coverage transparency — stale/unavailable dimensions, when any */
  noteHe: string | null;
}

/** Level 5 — a single quiet, sourced Dino seal. */
export interface DinoSealVM {
  insightHe: string;
  policyNoteHe: string | null;
  /** traceability — assessment ids / review route / concern, never fabricated */
  provenanceHe: string[];
}

/** The Matter Room — the complete first viewport. */
export interface RoomViewModel {
  identity: IdentityVM;
  posture: PostureVM;
  /** the situation briefing — one or two short, fully-sourced sentences */
  briefingHe: string[];
  deadline: DeadlineVM | null;
  review: ReviewVM | null;
  spine: SpineVM;
  blocker: BlockerVM | null;
  action: ActionVM | null;
  scoreRail: ScoreRailVM;
  dino: DinoSealVM | null;
  updatedHe: string;
  stale: boolean;
  version: string;
}

export const MATTER_ROOM_VM_VERSION = "matter-room-vm-3.0.0";
