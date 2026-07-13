/**
 * Matter App — view-model adapter.
 * The pure seam between the intelligence engines and the Decision Core. It reads
 * the computed `MatterProfile` and produces a presentation-ready `RoomViewModel`.
 *
 * Presentation-only humanization lives here (NOT in the engines): machine tokens
 * that the deterministic engine messages carry — the "(מצב: ...)" state code and
 * field keys like `employer_knowledge` — are mapped to clean Hebrew for display.
 * The underlying intelligence, findings, and provenance are unchanged.
 */
import type { Matter, MatterTeamMember } from "../types.ts";
import type { MatterProfile } from "../profile.ts";
import type { MatterPosture } from "../score/types.ts";
import {
  MATTER_ROOM_VM_VERSION,
  type DecisionActionVM,
  type PostureTone,
  type RoomViewModel,
} from "./types.ts";

const DOMAIN_HE: Record<string, string> = { labor: "דיני עבודה" };

const OWNER_ROLE_ORDER: MatterTeamMember["role"][] = ["partner", "senior_lawyer", "lawyer"];

const POSTURE: Record<MatterPosture, { labelHe: string; tone: PostureTone }> = {
  on_track: { labelHe: "במסלול", tone: "completed" },
  needs_attention: { labelHe: "דורש תשומת לב", tone: "today" },
  at_risk: { labelHe: "בסיכון", tone: "risk" },
  blocked: { labelHe: "חסום", tone: "urgent" },
  degraded: { labelHe: "הערכה חלקית", tone: "waiting" },
  requires_review: { labelHe: "דורש בדיקה", tone: "reviewed" },
  insufficient_data: { labelHe: "מידע חסר", tone: "waiting" },
};

const REVIEW_TARGET_HE: Record<string, string> = {
  lawyer_review: "בדיקת עו״ד",
  senior_lawyer_review: "בדיקת עו״ד בכיר",
  partner_review: "בדיקת שותף",
  specialist_review: "בדיקת מומחה",
  compliance_review: "בדיקת ציות",
  privacy_review: "בדיקת פרטיות",
  finance_review: "בדיקה כספית",
  do_not_proceed: "לא להמשיך ללא הכרעה",
};

/** procedure field keys → Hebrew (presentation only). */
const FIELD_HE: Record<string, string> = {
  employment_relationship: "קיום יחסי עבודה",
  employment_duration: "משך ההעסקה",
  pregnancy_status: "מצב ההיריון",
  employer_knowledge: "ידיעת המעסיק על ההיריון",
  permit_status: "היתר הפיטורים",
  dismissal_date: "מועד הפיטורים",
  hearing_held: "קיום שימוע",
};

function humanizeFields(s: string): string {
  let out = s;
  for (const [key, he] of Object.entries(FIELD_HE)) out = out.split(key).join(he);
  return out;
}

/**
 * Machine scaffolding the deterministic action messages carry — e.g.
 * "עובדה חסרה לשלב: X" ("missing fact for stage: X"). Stripped for presentation
 * so the action reads as a crisp imperative ("לברר ולאמת: X"). Content unchanged.
 */
const ACTION_SCAFFOLDS: RegExp[] = [/עובדה חסרה לשלב:\s*/u, /ראיה חסרה לשלב:\s*/u];

function cleanActionLabel(s: string): string {
  let out = humanizeFields(s);
  for (const scaffold of ACTION_SCAFFOLDS) out = out.replace(scaffold, "");
  return out.replace(/\s{2,}/gu, " ").trim();
}

/** strip a trailing "(מצב: ...)" machine state code. */
function stripStateCode(s: string): string {
  return s.replace(/\s*\(מצב:[^)]*\)\s*$/u, "").trim();
}

function stripTitlePrefix(s: string, title: string): string {
  const prefix = `${title}: `;
  return s.startsWith(prefix) ? s.slice(prefix.length) : s;
}

function ensurePeriod(s: string): string {
  return /[.!?׃:]\s*$/u.test(s) ? s.trim() : `${s.trim()}.`;
}

function resolveOwnerHe(matter: Matter): string | null {
  for (const role of OWNER_ROLE_ORDER) {
    const member = matter.team.find((m) => m.role === role);
    if (member) return member.nameHe;
  }
  return matter.team[0]?.nameHe ?? null;
}

function formatUpdatedHe(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const [, y, mm, dd] = m;
  return `${Number(dd)}.${Number(mm)}.${y}`;
}

/** the one briefing sentence — the concern, humanized and clean. */
function resolveConcernHe(profile: MatterProfile, titleHe: string): string {
  const raw = profile.score.summary.dominantConcernHe
    ?? stripTitlePrefix(profile.narrative.headlineHe, titleHe);
  return ensurePeriod(humanizeFields(stripStateCode(raw)));
}

function resolveAction(profile: MatterProfile): DecisionActionVM | null {
  const top = profile.prioritizedActions[0];
  if (!top) return null;
  const reviewTarget = profile.state.requiresHumanReview
    ? profile.narrative.reviewRoute?.primaryTarget ?? null
    : null;
  return {
    labelHe: cleanActionLabel(top.labelHe),
    ownerHe: top.ownerRoleHe === "לא ידוע" ? null : top.ownerRoleHe,
    dueHe: top.dueHe === "לא ידוע" ? null : top.dueHe,
    requiresApproval: top.requiresHumanApproval,
    reviewTargetHe: reviewTarget ? REVIEW_TARGET_HE[reviewTarget] ?? null : null,
  };
}

export function toRoomViewModel(profile: MatterProfile, matter: Matter): RoomViewModel {
  const { state, score } = profile;
  const posture = POSTURE[score.summary.posture];

  return {
    decisionCore: {
      matterId: state.matterId,
      titleHe: state.titleHe,
      clientHe: matter.client.nameHe,
      practiceAreaHe: DOMAIN_HE[matter.legalDomain] ?? matter.legalDomain,
      ownerHe: resolveOwnerHe(matter),
      posture,
      concernHe: resolveConcernHe(profile, state.titleHe),
      action: resolveAction(profile),
      updatedHe: formatUpdatedHe(state.asOf),
      stale: score.freshness.stale,
    },
    version: MATTER_ROOM_VM_VERSION,
  };
}
