/**
 * Matter App — view-model adapter (v3, the Matter Room).
 * The pure seam between the intelligence engines and the room. It reads the
 * computed `MatterProfile` (+ the source `Matter` and the procedure graph) and
 * produces a presentation-ready `RoomViewModel` for the full first viewport.
 *
 * Everything here is presentation-only: machine tokens carried by deterministic
 * engine messages (the "(מצב: ...)" state code, field keys like
 * `employer_knowledge`, action scaffolds) are mapped to clean Hebrew for
 * display. No engine logic, findings, provenance, posture, score, deadline or
 * action ordering is altered or invented — unknown stays null.
 */
import type { Matter, MatterTeamMember } from "../types.ts";
import type { MatterProfile } from "../profile.ts";
import type { MatterPosture, DimensionState, ScoreDimensionId, ScoreDimension } from "../score/types.ts";
import type { WhenItem } from "../intelligence.ts";
import type { BlockingCondition } from "../state-machine.ts";
import { procedureFor, currentStage } from "../state-machine.ts";
import { orderedStages } from "../../legal-knowledge/procedure/graph.ts";
import {
  MATTER_ROOM_VM_VERSION,
  type ActionVM,
  type BlockerVM,
  type DeadlineVM,
  type DinoSealVM,
  type ReviewVM,
  type RoomViewModel,
  type ScoreRailVM,
  type ScoreRowVM,
  type SpineVM,
  type Tone,
} from "./types.ts";

const DOMAIN_HE: Record<string, string> = { labor: "דיני עבודה" };
const OWNER_ROLE_ORDER: MatterTeamMember["role"][] = ["partner", "senior_lawyer", "lawyer"];

const POSTURE: Record<MatterPosture, { labelHe: string; tone: Tone }> = {
  on_track: { labelHe: "במסלול", tone: "completed" },
  needs_attention: { labelHe: "דורש תשומת לב", tone: "today" },
  at_risk: { labelHe: "בסיכון", tone: "risk" },
  blocked: { labelHe: "חסום", tone: "urgent" },
  degraded: { labelHe: "הערכה חלקית", tone: "waiting" },
  requires_review: { labelHe: "דורש בדיקה", tone: "reviewed" },
  insufficient_data: { labelHe: "מידע חסר", tone: "waiting" },
};

const DIMENSION_STATE: Record<DimensionState, { labelHe: string; tone: Tone }> = {
  strong: { labelHe: "תקין", tone: "completed" },
  healthy: { labelHe: "תקין", tone: "completed" },
  attention: { labelHe: "תשומת לב", tone: "today" },
  at_risk: { labelHe: "בסיכון", tone: "risk" },
  blocked: { labelHe: "חסום", tone: "urgent" },
  // the weakest dimension reads as attention-red in the diagnostic (approved concept)
  requires_review: { labelHe: "דורש בדיקה", tone: "risk" },
  unavailable: { labelHe: "לא זמין", tone: "waiting" },
  stale: { labelHe: "לא עדכני", tone: "waiting" },
  unknown: { labelHe: "לא ידוע", tone: "waiting" },
  not_applicable: { labelHe: "לא רלוונטי", tone: "waiting" },
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

/** the score rail dimensions, in the approved order. */
const RAIL_DIMENSIONS: ScoreDimensionId[] = ["legal", "evidence", "deadlines", "documents", "team"];

function humanizeFields(s: string): string {
  let out = s;
  for (const [key, he] of Object.entries(FIELD_HE)) out = out.split(key).join(he);
  return out;
}

/** machine scaffolds the deterministic messages carry — stripped for display. */
const SCAFFOLDS: RegExp[] = [
  /עובדה חסרה לשלב:\s*/u,
  /ראיה חסרה:\s*/u,
  /ראיה חסרה לשלב:\s*/u,
];

function stripScaffolds(s: string): string {
  let out = humanizeFields(s);
  for (const r of SCAFFOLDS) out = out.replace(r, "");
  return out.replace(/\s{2,}/gu, " ").trim();
}

function stripStateCode(s: string): string {
  return s.replace(/\s*\(מצב:[^)]*\)\s*$/u, "").trim();
}

function stripTitlePrefix(s: string, title: string): string {
  const prefix = `${title}: `;
  return s.startsWith(prefix) ? s.slice(prefix.length) : s;
}

/** drop a trailing "(English)" gloss on a stage title — presentation only. */
function stripEnglishGloss(s: string): string {
  return s.replace(/\s*\([A-Za-z ]+\)\s*$/u, "").trim();
}

function ensurePeriod(s: string): string {
  return /[.!?׃]\s*$/u.test(s) ? s.trim() : `${s.trim()}.`;
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

const WEEKDAYS_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

/** full date — "יום חמישי, 16.7.2026" (deterministic weekday from the ISO date). */
function formatFullDateHe(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const [, y, mm, dd] = m;
  const weekday = WEEKDAYS_HE[new Date(Date.UTC(Number(y), Number(mm) - 1, Number(dd))).getUTCDay()];
  return `יום ${weekday}, ${Number(dd)}.${Number(mm)}.${y}`;
}

/** relative-time humanization for a deadline (never invents a date). */
function whenHe(days: number | null): string {
  if (days === null) return "מועד לא ידוע";
  if (days === 0) return "היום";
  if (days < 0) return Math.abs(days) === 1 ? "עבר אתמול" : `עבר לפני ${Math.abs(days)} ימים`;
  return days === 1 ? "בעוד יום" : `בעוד ${days} ימים`;
}

function deadlineTone(state: string): Tone {
  if (state === "overdue") return "urgent";
  if (state === "imminent") return "today";
  return "scheduled";
}

function concernCore(profile: MatterProfile, titleHe: string): string {
  const raw = profile.score.summary.dominantConcernHe
    ?? stripTitlePrefix(profile.narrative.headlineHe, titleHe);
  return humanizeFields(stripStateCode(raw)).replace(/[.]\s*$/u, "").trim();
}

/**
 * The situation briefing — one or two short, fully-sourced sentences, in the
 * register a senior partner uses before entering court. Sentence 1: the concern
 * with the decisive missing fact. Sentence 2: the tempo (deadline + review).
 * Every atom is engine-sourced; nothing is invented.
 */
function resolveBriefing(
  profile: MatterProfile,
  titleHe: string,
  primaryMissingHe: string | null,
  deadline: DeadlineVM | null,
  review: ReviewVM | null,
): string[] {
  const out: string[] = [];
  const core = concernCore(profile, titleHe);
  out.push(ensurePeriod(primaryMissingHe ? `${core} ללא אימות ${primaryMissingHe}` : core));

  if (deadline && review) {
    out.push(`${deadline.labelHe} ${deadline.whenHe}; ההערכה טעונה ${review.targetHe}.`);
  } else if (deadline) {
    out.push(`${deadline.labelHe} ${deadline.whenHe}${deadline.strict ? " (מועד קשיח)" : ""}.`);
  } else if (review) {
    out.push(`ההערכה טעונה ${review.targetHe}.`);
  }
  return out;
}

/** the single critical deadline, only when a real, near one exists. */
function resolveDeadline(when: WhenItem[]): DeadlineVM | null {
  const near = when.find((w) => w.daysRemaining !== null && (w.state === "imminent" || w.state === "overdue"));
  if (!near) return null;
  return {
    labelHe: near.labelHe,
    whenHe: whenHe(near.daysRemaining),
    dateHe: near.dueDate ? formatFullDateHe(near.dueDate) : "",
    daysRemaining: near.daysRemaining,
    strict: near.strict,
    tone: deadlineTone(near.state),
  };
}

function resolveReview(profile: MatterProfile): ReviewVM | null {
  if (!profile.state.requiresHumanReview) return null;
  const target = profile.narrative.reviewRoute?.primaryTarget ?? null;
  return {
    targetHe: target ? REVIEW_TARGET_HE[target] ?? "בדיקה אנושית" : "בדיקה אנושית",
    requiresApproval: profile.prioritizedActions[0]?.requiresHumanApproval ?? true,
  };
}

function resolveSpine(matter: Matter, profile: MatterProfile): SpineVM {
  const snap = profile.state.stage;
  const proc = procedureFor(matter);
  const cur = currentStage(matter);
  const ordered = proc ? orderedStages(proc) : [];
  const ci = cur ? ordered.findIndex((s) => s.id === cur.id) : -1;
  const prev = ci > 0 ? stripEnglishGloss(ordered[ci - 1].titleHe) : null;
  const next = snap.nextOptionsHe[0]?.toTitleHe
    ?? (ci >= 0 && ci < ordered.length - 1 ? ordered[ci + 1].titleHe : null);
  const blocked = !snap.canAdvance && snap.blocking.length > 0;
  return {
    prevHe: prev,
    currentHe: stripEnglishGloss(snap.currentStageTitleHe ?? "שלב לא מזוהה"),
    nextHe: next ? stripEnglishGloss(next) : null,
    stageNumberHe: snap.stageIndex >= 0 ? `שלב ${snap.stageIndex + 1} מתוך ${snap.totalStages}` : `${snap.totalStages} שלבים`,
    blocked,
    blockedReasonHe: blocked ? "המעבר לשלב הבא חסום — חסרות עובדות/ראיות מהותיות" : null,
  };
}

/** humanize a single blocking condition into a missing-item label. */
function missingLabel(b: BlockingCondition): string {
  if (b.kind === "missing_fact") {
    const field = b.code.replace(/^fact:/, "");
    return FIELD_HE[field] ?? field;
  }
  return stripScaffolds(b.messageHe);
}

function resolveBlocker(matter: Matter, profile: MatterProfile): BlockerVM | null {
  const blocking = profile.state.stage.blocking;
  if (blocking.length === 0) return null;
  const primary = blocking.find((b) => b.kind === "missing_fact") ?? blocking[0];
  const primaryLabel = missingLabel(primary);
  const titleHe = primary.kind === "missing_fact"
    ? `חסר אימות: ${primaryLabel}`
    : `חסרה ראיה: ${primaryLabel}`;
  const concern = stripStateCode(profile.score.summary.dominantConcernHe ?? "");
  const whyHe = ensurePeriod(
    concern
      ? `חוסם את השלמת השלב הנוכחי; ${humanizeFields(concern)} ללא אימות זה`
      : "חוסם את השלמת אימות העובדות המכריעות בשלב הנוכחי",
  );
  const stageSource = currentStage(matter)?.sources?.[0]?.citationHe ?? null;
  const factAction = profile.prioritizedActions.find((a) => a.actionId.startsWith("na-fact:"))
    ?? profile.prioritizedActions.find((a) => a.actionId.startsWith("na-evidence:"));
  return {
    titleHe,
    whyHe,
    stageHe: stripEnglishGloss(profile.state.stage.currentStageTitleHe ?? ""),
    missingHe: blocking.map(missingLabel),
    sourceHe: stageSource,
    tone: "urgent",
    actionLabelHe: factAction ? stripScaffolds(factAction.labelHe) : "לאמת את העובדה החסרה",
  };
}

/** resolve the action's owner to the assigned person, falling back to the role. */
function resolveActionOwnerHe(profile: MatterProfile, matter: Matter, topActionId: string, ownerRoleHe: string): string | null {
  const raw = profile.state.questions.whatNext.find((a) => a.id === topActionId);
  if (raw && raw.ownerRole !== "client") {
    const member = matter.team.find((m) => m.role === raw.ownerRole);
    if (member) return member.nameHe;
  }
  return ownerRoleHe === "לא ידוע" ? null : ownerRoleHe;
}

function resolveAction(profile: MatterProfile, matter: Matter): ActionVM | null {
  const top = profile.prioritizedActions[0];
  if (!top) return null;
  const reviewTarget = profile.state.requiresHumanReview
    ? profile.narrative.reviewRoute?.primaryTarget ?? null
    : null;
  return {
    labelHe: stripScaffolds(top.labelHe),
    reasonHe: top.reasonHe,
    ownerHe: resolveActionOwnerHe(profile, matter, top.actionId, top.ownerRoleHe),
    dueHe: top.dueHe === "לא ידוע" ? null : top.dueHe,
    requiresApproval: top.requiresHumanApproval,
    reviewTargetHe: reviewTarget ? REVIEW_TARGET_HE[reviewTarget] ?? null : null,
    expectedEffectHe: top.expectedEffectHe,
  };
}

function railStateHe(dim: ScoreDimension): string {
  // the single specialist nuance the founder called out — legal review is a specialist review
  if (dim.id === "legal" && dim.state === "requires_review") return "דורש בדיקת מומחה";
  return DIMENSION_STATE[dim.state].labelHe;
}

function resolveScoreRail(profile: MatterProfile): ScoreRailVM {
  const { dimensions, summary } = profile.score;
  const rows: ScoreRowVM[] = [];
  for (const id of RAIL_DIMENSIONS) {
    const dim = dimensions.find((d) => d.id === id);
    if (!dim) continue;
    rows.push({
      labelHe: dim.labelHe,
      stateHe: railStateHe(dim),
      tone: DIMENSION_STATE[dim.state].tone,
      emphasis: id === summary.weakestDimension ? "weak" : id === summary.strongestDimension ? "strong" : null,
    });
  }
  const gaps = summary.unavailableDimensions.length + summary.staleDimensions.length;
  const noteHe = gaps > 0 ? `${gaps} ממדים אינם עדכניים או זמינים — כיסוי חלקי` : null;
  return { rows, noteHe };
}

/** one quiet, fully-sourced Dino seal — only when there is a real finding to source. */
function resolveDino(profile: MatterProfile, matter: Matter): DinoSealVM | null {
  if (!profile.state.requiresHumanReview) return null;
  const target = profile.narrative.reviewRoute?.primaryTarget ?? null;
  const targetHe = target ? REVIEW_TARGET_HE[target] ?? "בדיקה אנושית" : "בדיקה אנושית";
  const areaHe = DOMAIN_HE[matter.legalDomain] ?? matter.legalDomain;
  // The seal tracks the real state: when legal coverage is the live concern it
  // names the bottleneck; once coverage is restored it stays honest and reflects
  // the standing human-review policy rather than a resolved finding.
  const legalDim = profile.score.dimensions.find((d) => d.id === "legal");
  const legalConcern = !!legalDim &&
    (legalDim.state === "requires_review" || legalDim.state === "at_risk" || legalDim.state === "blocked");
  const insightHe = legalConcern
    ? `דינו זיהה צוואר בקבוק בכיסוי המשפטי — טעון ${targetHe}.`
    : `דינו ממליץ על ${targetHe} לפני הסתמכות — בהתאם למדיניות הלקוח.`;
  const policyNoteHe = matter.client.aiPolicy === "allowed_with_review"
    ? "תובנת AI — מותנית בבדיקה אנושית"
    : matter.client.aiPolicy === "prohibited"
      ? "עיבוד AI חסום במדיניות הלקוח"
      : null;
  const provenanceHe = legalConcern
    ? ["הערכת כיסוי משפטי", `מסלול בדיקה: ${targetHe} · ${areaHe}`]
    : ["מדיניות בדיקה אנושית", `מסלול בדיקה: ${targetHe} · ${areaHe}`];
  return { insightHe, policyNoteHe, provenanceHe };
}

export function toRoomViewModel(profile: MatterProfile, matter: Matter): RoomViewModel {
  const { state, score } = profile;
  const posture = POSTURE[score.summary.posture];
  const deadline = resolveDeadline(state.questions.when);
  const review = resolveReview(profile);
  const blocker = resolveBlocker(matter, profile);
  const briefingHe = resolveBriefing(profile, state.titleHe, blocker?.missingHe[0] ?? null, deadline, review);

  return {
    identity: {
      matterId: state.matterId,
      titleHe: state.titleHe,
      fileNoHe: matter.fileNoHe ?? null,
      clientHe: matter.client.nameHe,
      practiceAreaHe: DOMAIN_HE[matter.legalDomain] ?? matter.legalDomain,
      forumHe: matter.forumHe ?? null,
      ownerHe: resolveOwnerHe(matter),
      stageTitleHe: stripEnglishGloss(state.stage.currentStageTitleHe ?? "") || null,
    },
    posture,
    briefingHe,
    deadline,
    review,
    spine: resolveSpine(matter, profile),
    blocker,
    action: resolveAction(profile, matter),
    scoreRail: resolveScoreRail(profile),
    dino: resolveDino(profile, matter),
    updatedHe: formatUpdatedHe(state.asOf),
    stale: score.freshness.stale,
    version: MATTER_ROOM_VM_VERSION,
  };
}
