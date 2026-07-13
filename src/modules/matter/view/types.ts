/**
 * Matter App — view-model types.
 * The presentation contract for the Decision Core: the single surface that
 * answers, in one glance, what matter this is, whether it is on track, what is
 * happening, and the one thing to do next. The view computes nothing; the adapter
 * produces this from a `MatterProfile`.
 */

/** The semantic tone of the posture headline — a subset of the status system. */
export type PostureTone = "completed" | "today" | "risk" | "urgent" | "waiting" | "reviewed";

export interface DecisionPostureVM {
  labelHe: string;
  tone: PostureTone;
}

/** The single recommended action — the one obvious next step. */
export interface DecisionActionVM {
  labelHe: string;
  ownerHe: string | null;
  /** null when the due date is genuinely unknown (never invented) */
  dueHe: string | null;
  requiresApproval: boolean;
  /** e.g. "בדיקת מומחה" when human review is routed; null otherwise */
  reviewTargetHe: string | null;
}

/** The Decision Core — the heart of the Matter App. */
export interface DecisionCoreVM {
  matterId: string;
  titleHe: string;
  clientHe: string;
  practiceAreaHe: string;
  ownerHe: string | null;
  posture: DecisionPostureVM;
  /** one calm briefing sentence — the "what is happening", humanized */
  concernHe: string;
  action: DecisionActionVM | null;
  updatedHe: string;
  stale: boolean;
}

export interface RoomViewModel {
  decisionCore: DecisionCoreVM;
  version: string;
}

export const MATTER_ROOM_VM_VERSION = "matter-room-vm-2.0.0";
