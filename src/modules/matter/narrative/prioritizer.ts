/**
 * Matter Narrative — deterministic action prioritizer (Epic 4.2).
 * Ranks the Matter's recommended actions using transparent signals. It does NOT
 * invent owners or due dates — unknown stays "לא ידוע". Source is the canonical
 * Next-Action plan already present in MatterState (no engine logic re-run).
 */
import type { RecommendedAction, Severity } from "../types.ts";
import type { MatterState } from "../intelligence.ts";
import type { PrioritizedAction } from "./types.ts";

const SEV_RANK: Record<Severity, number> = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };

function roleHe(role: string): string {
  switch (role) {
    case "partner": return "שותף";
    case "senior_lawyer": return "עו\"ד בכיר";
    case "lawyer": return "עו\"ד";
    case "intern": return "מתמחה";
    case "paralegal": return "פרליגל";
    case "client": return "לקוח";
    default: return "לא ידוע";
  }
}

function expectedEffectHe(a: RecommendedAction, addressesBlocker: boolean, isDeadline: boolean): string {
  if (isDeadline) return "מניעת החמצת מועד קשיח";
  if (addressesBlocker) return "הסרת חסם וקידום השלב";
  if (a.priority === "critical" || a.priority === "high") return "טיפול בסיכון מהותי";
  return "קידום שוטף של התיק";
}

/** deterministic composite rank score (higher = act sooner). */
function rankScore(a: RecommendedAction, addressesBlocker: boolean, isDeadline: boolean): number {
  let s = SEV_RANK[a.priority] * 10;
  if (isDeadline) s += 6;          // deadline proximity
  if (addressesBlocker) s += 5;    // blocking impact
  if (a.requiresHumanApproval) s += 1; // must start early to allow approval time
  return s;
}

export function prioritizeActions(state: MatterState): PrioritizedAction[] {
  const blockerCodes = state.questions.blocking.map((b) => b.code);
  const actions = state.questions.whatNext;

  const enriched = actions.map((a) => {
    const matchedBlockers = blockerCodes.filter((c) => a.id.includes(c));
    const addressesBlocker = matchedBlockers.length > 0;
    const isDeadline = a.id.includes("deadline");
    return {
      a,
      matchedBlockers,
      addressesBlocker,
      isDeadline,
      _score: rankScore(a, addressesBlocker, isDeadline),
    };
  });

  enriched.sort((x, y) => y._score - x._score || SEV_RANK[y.a.priority] - SEV_RANK[x.a.priority]);

  return enriched.map((e, i): PrioritizedAction => ({
    rank: i + 1,
    actionId: e.a.id,
    labelHe: e.a.labelHe,
    reasonHe: e.a.whyHe,
    ownerRoleHe: roleHe(e.a.ownerRole),
    dueHe: e.a.dueHint ?? "לא ידוע",
    priority: e.a.priority,
    dependencies: [],
    blockerCodes: e.matchedBlockers,
    requiresHumanApproval: e.a.requiresHumanApproval,
    expectedEffectHe: expectedEffectHe(e.a, e.addressesBlocker, e.isDeadline),
    sourceAssessmentIds: ["matter-next-action"],
  }));
}
