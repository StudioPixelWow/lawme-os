/**
 * Matter Room — health delta.
 * Compares the room view-model before and after a workflow and reports, in
 * plain Hebrew, what actually improved. Pure and presentation-only: it reads
 * two already-computed view-models and never re-derives intelligence — so every
 * line it produces reflects a real, engine-computed change.
 */
import type { RoomViewModel } from "./types";

export interface HealthChange {
  labelHe: string;
  detailHe: string | null;
}

const GREEN = "completed";

export function describeHealthDelta(before: RoomViewModel, after: RoomViewModel): HealthChange[] {
  const out: HealthChange[] = [];

  if (before.blocker && !after.blocker) {
    out.push({ labelHe: "החסם הוסר", detailHe: before.blocker.titleHe });
  }

  if (before.spine.blocked && !after.spine.blocked) {
    out.push({ labelHe: "אבן הדרך נפתחה", detailHe: `המעבר אל «${after.spine.nextHe ?? "השלב הבא"}» כבר אינו חסום` });
  }

  const greened: string[] = [];
  for (const row of after.scoreRail.rows) {
    const was = before.scoreRail.rows.find((r) => r.labelHe === row.labelHe);
    if (was && was.tone !== GREEN && row.tone === GREEN) greened.push(row.labelHe);
  }
  if (greened.length) {
    out.push({
      labelHe: greened.length === 1 ? "ממד עלה לתקין" : `${greened.length} ממדים עלו לתקין`,
      detailHe: greened.join(" · "),
    });
  }

  const beforeReview = before.dino?.insightHe ?? before.review?.targetHe ?? null;
  const afterReview = after.dino?.insightHe ?? after.review?.targetHe ?? null;
  if (beforeReview && afterReview && beforeReview !== afterReview) {
    out.push({ labelHe: "מסלול הבדיקה עודכן", detailHe: after.dino?.insightHe ?? afterReview });
  } else if (before.review && !after.review) {
    out.push({ labelHe: "דרישת הבדיקה האנושית הוסרה", detailHe: null });
  }

  // Note: the posture chip is intentionally not listed as a "win". Resolving the
  // coverage gap can shift the headline concern to the remaining strict deadline
  // (requires_review → at_risk) — an honest change, surfaced live in the room and
  // as the "next focus", not dressed up as an improvement here.

  return out;
}

/** The honest remaining focus after the workflow — never hides live risk. */
export function remainingFocus(after: RoomViewModel): string | null {
  if (after.deadline) {
    return `${after.deadline.labelHe} · ${after.deadline.whenHe}${after.deadline.strict ? " (מועד קשיח)" : ""}`;
  }
  if (after.action) return after.action.labelHe;
  return null;
}

/** A count of green dimensions — the compact "how healthy" signal. */
export function greenCount(vm: RoomViewModel): number {
  return vm.scoreRail.rows.filter((r) => r.tone === "completed").length;
}
