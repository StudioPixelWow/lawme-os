/**
 * Matter Room — panel content builders (Sprint 3.2). Pure & testable.
 *
 * Each builder reads the computed MatterProfile (+ Matter + procedure graph) and
 * returns a presentation-ready PanelView. No engine logic, no intelligence
 * changes — read-only projection of what the engine already decided, so every
 * drawer explains itself from real, sourced data (never fabricated).
 */
import type { Matter } from "../../types.ts";
import type { MatterProfile } from "../../profile.ts";
import type { ScoreDimensionId } from "../../score/types.ts";
import type { BlockingCondition } from "../../state-machine.ts";
import { procedureFor, currentStage } from "../../state-machine.ts";
import { orderedStages } from "../../../legal-knowledge/procedure/graph.ts";
import type { Tone } from "../types.ts";

export interface PanelRow { label: string; value: string; tone?: Tone | null; }
export interface PanelBullet { textHe: string; tone?: Tone | null; }
export interface PanelSection {
  headingHe?: string;
  paragraphsHe?: string[];
  rows?: PanelRow[];
  bullets?: PanelBullet[];
  tone?: Tone | null;
}
export type PanelActionKind = "workflow" | "task" | "reassign" | "panel" | "info" | "route";
export interface PanelAction {
  id: string;
  labelHe: string;
  kind: PanelActionKind;
  target?: string | null;   // workflow id · panel kind · member id · route
  param?: string | null;
  primary?: boolean;
  disabled?: boolean;
  disabledReasonHe?: string | null;
}
export interface PanelView {
  titleHe: string;
  subtitleHe: string;
  urlHe: string;
  dataHe: string;
  permHe: string;
  sections: PanelSection[];
  actions: PanelAction[];
  emptyHe?: string | null;
}

/* ---------------------------------------------------------------- helpers */

const FACT_HE: Record<string, string> = {
  employment_relationship: "קיום יחסי עבודה",
  employment_duration: "משך ההעסקה",
  pregnancy_status: "מצב ההיריון",
  employer_knowledge: "ידיעת המעסיק על ההיריון",
  permit_status: "היתר הפיטורים",
  dismissal_date: "מועד הפיטורים",
  hearing_held: "קיום שימוע",
};
const factHe = (f: string) => FACT_HE[f] ?? f;

const DIM_HE: Record<ScoreDimensionId, string> = {
  legal: "משפטי", procedure: "הליך", evidence: "ראיות", documents: "מסמכים",
  deadlines: "מועדים", readiness: "מוכנות", progress: "התקדמות", client: "לקוח",
  communication: "תקשורת", team: "צוות", finance: "כספים", risk: "סיכון",
  outcomeReadiness: "מוכנות לתוצאה",
};
const DIM_STATE: Record<string, { he: string; tone: Tone }> = {
  strong: { he: "תקין", tone: "completed" },
  healthy: { he: "תקין", tone: "completed" },
  attention: { he: "תשומת לב", tone: "today" },
  at_risk: { he: "בסיכון", tone: "risk" },
  blocked: { he: "חסום", tone: "urgent" },
  requires_review: { he: "דורש בדיקה", tone: "risk" },
  unavailable: { he: "לא זמין", tone: "waiting" },
  stale: { he: "לא עדכני", tone: "waiting" },
  unknown: { he: "לא ידוע", tone: "waiting" },
  not_applicable: { he: "לא רלוונטי", tone: "waiting" },
};
const dimState = (s: string) => DIM_STATE[s] ?? { he: s, tone: "waiting" as Tone };

const REVIEW_HE: Record<string, string> = {
  no_review: "ללא בדיקה", lawyer_review: "בדיקת עו״ד", senior_lawyer_review: "בדיקת עו״ד בכיר",
  partner_review: "בדיקת שותף", specialist_review: "בדיקת מומחה", compliance_review: "בדיקת ציות",
  privacy_review: "בדיקת פרטיות", finance_review: "בדיקה כספית", do_not_proceed: "לא להמשיך ללא הכרעה",
};
const reviewHe = (t?: string | null) => (t ? REVIEW_HE[t] ?? "בדיקה אנושית" : "בדיקה אנושית");

const ROLE_HE: Record<string, string> = {
  partner: "שותף", senior_lawyer: "עו״ד בכיר", lawyer: "עו״ד", intern: "מתמחה", paralegal: "פראלגל",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "לא ידוע";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${Number(m[3])}.${Number(m[2])}.${m[1]}` : iso;
}
function textOf(x: unknown): string {
  const o = x as { messageHe?: string; titleHe?: string; labelHe?: string };
  return o.messageHe ?? o.labelHe ?? o.titleHe ?? "";
}
function humanizeFields(s: string): string {
  let out = s;
  for (const [key, he] of Object.entries(FACT_HE)) out = out.split(key).join(he);
  return out;
}
function stripCode(s: string): string {
  return humanizeFields(s.replace(/\s*\(מצב:[^)]*\)\s*$/u, "").replace(/עובדה חסרה לשלב:\s*/u, "").replace(/ראיה חסרה:\s*/u, "").trim());
}
function pct(n: number): string { return `${Math.round(n * 100)}%`; }

/* ---------------------------------------------------------------- posture */

export function buildPosture(profile: MatterProfile): PanelView {
  const s = profile.score.summary;
  const rr = profile.narrative.reviewRoute;
  const sections: PanelSection[] = [];
  sections.push({
    headingHe: "מצב כולל",
    rows: [
      { label: "מצב", value: postureHe(s.posture), tone: postureTone(s.posture) },
      { label: "חשש דומיננטי", value: s.dominantConcernHe ? stripCode(s.dominantConcernHe) : "—" },
    ],
  });
  sections.push({
    headingHe: "ממדים",
    rows: [
      { label: "החזק ביותר", value: s.strongestDimension ? DIM_HE[s.strongestDimension] : "—", tone: "completed" },
      { label: "החלש ביותר", value: s.weakestDimension ? DIM_HE[s.weakestDimension] : "—", tone: "risk" },
      { label: "כיסוי הערכה", value: pct(s.assessmentCoverage) },
    ],
  });
  if (s.unavailableDimensions.length || s.staleDimensions.length) {
    sections.push({
      headingHe: "ממדים חסרים/לא עדכניים",
      bullets: [
        ...s.unavailableDimensions.map((d) => ({ textHe: `${DIM_HE[d]} — לא זמין`, tone: "waiting" as Tone })),
        ...s.staleDimensions.map((d) => ({ textHe: `${DIM_HE[d]} — לא עדכני`, tone: "waiting" as Tone })),
      ],
    });
  }
  if (s.topBlockers.length) {
    sections.push({ headingHe: "חסמים עיקריים", bullets: s.topBlockers.map((b) => ({ textHe: stripCode(b.messageHe), tone: "urgent" as Tone })) });
  }
  const acts = profile.prioritizedActions.slice(0, 3);
  if (acts.length) {
    sections.push({ headingHe: "פעולות עליונות", bullets: acts.map((a) => ({ textHe: stripCode(a.labelHe) })) });
  }
  if (rr) {
    sections.push({
      headingHe: "מסלול בדיקה אנושית",
      paragraphsHe: [`${reviewHe(rr.primaryTarget)}${rr.reasonsHe[0] ? ` — ${rr.reasonsHe[0]}` : ""}`],
    });
  }
  sections.push({
    headingHe: "טריות ומקורות",
    rows: [
      { label: "חושב לפי", value: fmtDate(profile.score.freshness.computedAt) },
      { label: "מזהי הערכות", value: dimAssessments(profile) },
    ],
  });
  return meta("מצב התיק — הסבר", postureHe(s.posture), "?panel=posture", "vm.posture · score.summary", "צפייה: כל הצוות", sections, []);
}

/* ------------------------------------------------------------- situation */

export function buildSituation(profile: MatterProfile): PanelView {
  const n = profile.narrative;
  const sections: PanelSection[] = [];
  sections.push({ headingHe: "המצב כעת", paragraphsHe: [stripCode(n.headlineHe), n.currentStateHe].filter(Boolean) });
  if (n.urgentItemsHe.length) sections.push({ headingHe: "דחוף", bullets: n.urgentItemsHe.map((t) => ({ textHe: t, tone: "urgent" as Tone })) });
  if (n.blockersHe.length) sections.push({ headingHe: "חסמים", bullets: n.blockersHe.map((t) => ({ textHe: stripCode(t) })) });
  if (n.missingItemsHe.length) sections.push({ headingHe: "חסר", bullets: n.missingItemsHe.map((t) => ({ textHe: stripCode(t) })) });
  if (n.nextActionsHe.length) sections.push({ headingHe: "צעדים הבאים", bullets: n.nextActionsHe.map((t) => ({ textHe: stripCode(t) })) });
  if (n.limitationsHe.length) sections.push({ headingHe: "מגבלות", bullets: n.limitationsHe.map((t) => ({ textHe: t, tone: "waiting" as Tone })) });
  sections.push({ headingHe: "ודאות ומקורות", rows: [
    { label: "רמת ודאות", value: pct(n.confidence) },
    { label: "מזהי הערכות", value: n.sourceAssessmentIds.slice(0, 6).join(" · ") || "—" },
  ]});
  return meta("מצב התיק המלא", "נרטיב מסודר, כל משפט עם מקור", "?panel=situation", "narrative", "צפייה: כל הצוות", sections, []);
}

/* ------------------------------------------------------------- score lens */

export function buildScoreLens(profile: MatterProfile): PanelView {
  const s = profile.score;
  const RAIL: ScoreDimensionId[] = ["legal", "evidence", "deadlines", "documents", "team"];
  const rows: PanelRow[] = [];
  for (const d of s.dimensions.filter((d) => RAIL.includes(d.id))) {
    const st = dimState(d.state);
    rows.push({ label: DIM_HE[d.id], value: st.he, tone: st.tone });
  }
  const sections: PanelSection[] = [
    { headingHe: "אבחון מלא — חמשת הממדים", rows },
    { headingHe: "כיסוי", rows: [
      { label: "החלש ביותר", value: s.summary.weakestDimension ? DIM_HE[s.summary.weakestDimension] : "—", tone: "risk" },
      { label: "כיסוי הערכה", value: pct(s.summary.assessmentCoverage) },
      { label: "טריות", value: s.freshness.stale ? "לא עדכני" : "עדכני" },
    ]},
  ];
  // dimension rows become actions that open the dimension panel
  const actions: PanelAction[] = s.dimensions
    .filter((d) => RAIL.includes(d.id))
    .map((d) => ({ id: `dim-${d.id}`, labelHe: `${DIM_HE[d.id]} ›`, kind: "panel" as const, target: "score", param: d.id }));
  return meta("אבחון מלא", "מצב חמשת הממדים", "?panel=score", "score.dimensions", "צפייה: כל הצוות", sections, actions);
}

export function buildDimension(profile: MatterProfile, dimId: string): PanelView {
  const d = profile.score.dimensions.find((x) => x.id === dimId);
  if (!d) return notFound("ממד לא נמצא", "?panel=score");
  const st = dimState(d.state);
  const sections: PanelSection[] = [];
  sections.push({ headingHe: "מצב", rows: [
    { label: "מצב", value: st.he, tone: st.tone },
    ...(d.numericScore !== null ? [{ label: "ציון", value: String(d.numericScore) }] : []),
    { label: "ודאות", value: pct(d.confidence) },
    { label: "טריות", value: d.freshness.stale ? "לא עדכני" : "עדכני" },
  ]});
  if (d.unavailableReasonHe) sections.push({ headingHe: "מדוע לא זמין", paragraphsHe: [d.unavailableReasonHe] });
  if (d.staleReasonHe) sections.push({ headingHe: "מדוע לא עדכני", paragraphsHe: [d.staleReasonHe] });
  if (d.findings.length) sections.push({ headingHe: "ממצאים", bullets: d.findings.slice(0, 6).map((f) => ({ textHe: stripCode(textOf(f)) })) });
  if (d.blockers.length) sections.push({ headingHe: "חסמים", bullets: d.blockers.map((b: BlockingCondition) => ({ textHe: stripCode(b.messageHe), tone: "urgent" as Tone })) });
  if (d.warningsHe.length) sections.push({ headingHe: "אזהרות", bullets: d.warningsHe.map((w) => ({ textHe: w, tone: "risk" as Tone })) });
  if (d.requiredActions.length) sections.push({ headingHe: "פעולות נדרשות", bullets: d.requiredActions.slice(0, 5).map((a) => ({ textHe: stripCode(textOf(a)) })) });
  if (d.reviewRoute) sections.push({ headingHe: "מסלול בדיקה", paragraphsHe: [reviewHe(d.reviewRoute.primaryTarget)] });
  sections.push({ headingHe: "מקורות", rows: [{ label: "מזהי הערכות", value: d.sourceAssessmentIds.join(" · ") || "—" }] });
  return meta(`ממד: ${DIM_HE[d.id] ?? d.labelHe}`, st.he, `?panel=score&dimension=${d.id}`, `score.dimensions[${d.id}]`, "צפייה: כל הצוות", sections, []);
}

/* -------------------------------------------------------------- milestone */

export function buildMilestone(matter: Matter, profile: MatterProfile, stageId: string | null): PanelView {
  const proc = procedureFor(matter);
  const stages = proc ? orderedStages(proc) : [];
  const cur = currentStage(matter);
  const curIdx = cur ? stages.findIndex((s) => s.id === cur.id) : -1;
  const stage = stageId ? stages.find((s) => s.id === stageId) : cur;
  if (!stage) return notFound("שלב לא נמצא", "?panel=milestone");
  const idx = stages.findIndex((s) => s.id === stage.id);
  const status = idx < curIdx ? { he: "הושלם", tone: "completed" as Tone } : idx === curIdx ? { he: "נוכחי", tone: "today" as Tone } : { he: "עתידי", tone: "waiting" as Tone };
  const snap = profile.state.stage;
  const isCurrent = idx === curIdx;

  const knownFacts = new Set(matter.facts.filter((f) => f.status !== "unknown").map((f) => f.field));
  const sections: PanelSection[] = [];
  sections.push({ headingHe: "שלב", rows: [
    { label: "מצב", value: status.he, tone: status.tone },
    { label: "מיקום", value: `שלב ${idx + 1} מתוך ${stages.length}` },
  ]});
  if (stage.requiredFacts.length) {
    sections.push({ headingHe: "עובדות נדרשות", bullets: stage.requiredFacts.map((f) => ({
      textHe: `${factHe(f)} — ${knownFacts.has(f) ? "קיים" : "חסר"}`, tone: knownFacts.has(f) ? ("completed" as Tone) : ("urgent" as Tone),
    })) });
  }
  const mandEv = stage.evidence.filter((e) => e.mandatory);
  if (mandEv.length) {
    sections.push({ headingHe: "ראיות מנדטוריות", bullets: mandEv.map((e) => {
      const have = matter.evidence.find((me) => me.id === e.id || me.labelHe === e.labelHe);
      const collected = !!have?.collected;
      return { textHe: `${e.labelHe} — ${collected ? "נאספה" : "לא נאספה"}`, tone: collected ? ("completed" as Tone) : ("urgent" as Tone) };
    }) });
  }
  if (stage.documents.length) sections.push({ headingHe: "מסמכים נדרשים", bullets: stage.documents.map((d) => ({ textHe: d.labelHe })) });
  if (isCurrent) {
    sections.push({ headingHe: "מעבר לשלב הבא", rows: [
      { label: "ניתן לקדם", value: snap.canAdvance ? "כן" : "לא", tone: snap.canAdvance ? "completed" : "urgent" },
    ], paragraphsHe: snap.canAdvance ? undefined : [snap.blocking.map((b) => stripCode(b.messageHe)).join(" · ") || "חסרות עובדות/ראיות מהותיות."] });
  }
  if (stage.sources.length) sections.push({ headingHe: "מקור משפטי/פרוצדורלי", bullets: stage.sources.slice(0, 3).map((s) => ({ textHe: s.citationHe })) });

  const actions: PanelAction[] = [];
  if (isCurrent && profile.state.stage.blocking.length > 0) {
    actions.push({ id: "to-blocker", labelHe: "טפל בחסם ›", kind: "panel", target: "blocker", primary: true });
  }
  if (idx > curIdx) {
    actions.push({ id: "future", labelHe: "קידום ידני לא זמין — נפתח אוטומטית לפי גרף ההליך", kind: "info", disabled: true });
  }
  return meta(stage.titleHe, status.he, `?panel=milestone&stage=${stage.id}`, "procedure graph · state.stage", "צפייה: כל · קידום: שותף", sections, actions);
}

/* --------------------------------------------------------------- deadline */

export function buildDeadline(profile: MatterProfile, matter: Matter): PanelView {
  const near = profile.state.questions.when.find((w) => w.state === "imminent" || w.state === "overdue") ?? profile.state.questions.when[0];
  if (!near) return { titleHe: "מועד", subtitleHe: "", urlHe: "?panel=deadline", dataHe: "state.questions.when", permHe: "צפייה: כל הצוות", sections: [], actions: [], emptyHe: "אין מועד קרוב פעיל." };
  const src = matter.deadlines.find((d) => d.labelHe === near.labelHe);
  const sections: PanelSection[] = [
    { headingHe: "מועד", rows: [
      { label: "תאריך", value: fmtDate(near.dueDate) },
      { label: "נותרו", value: near.daysRemaining !== null ? `${near.daysRemaining} ימים` : "לא ידוע", tone: (near.daysRemaining ?? 99) <= 4 ? "urgent" : "scheduled" },
      { label: "סוג", value: near.strict ? "מועד קשיח" : "מנחה", tone: near.strict ? "risk" : null },
    ]},
    { headingHe: "בסיס", paragraphsHe: [src?.basisHe ?? "מועד מההליך."] },
    { headingHe: "סיכון בהחמצה", paragraphsHe: [near.strict ? "החמצת המועד חוסמת את הצעד/התביעה." : "עלול לעכב את ההליך."] },
    { headingHe: "אחראי", rows: [{ label: "אחראי", value: ownerName(matter) }] },
  ];
  const actions: PanelAction[] = [
    { id: "prep", labelHe: "פתח פעולת היערכות ›", kind: "panel", target: "action", primary: true },
    { id: "task", labelHe: "צור משימת היערכות", kind: "task" },
    { id: "milestone", labelHe: "הצג במסלול", kind: "panel", target: "milestone" },
  ];
  return meta("דיון מקדמי — מועד", `${near.daysRemaining ?? "?"} ימים · ${fmtDate(near.dueDate)}`, "?panel=deadline", "state.questions.when · matter.deadlines", "צפייה: כל · עריכת מועד: בדיקה", sections, actions);
}

/* ---------------------------------------------------------------- action */

export function buildAction(profile: MatterProfile, matter: Matter): PanelView {
  const a = profile.prioritizedActions[0];
  if (!a) return { titleHe: "הפעולה הבאה", subtitleHe: "", urlHe: "?panel=action", dataHe: "prioritizedActions[0]", permHe: "התחלה: אחראי/שותף", sections: [], actions: [], emptyHe: "אין פעולה פתוחה." };
  const evidenceRelated = a.actionId.includes("evidence") || a.actionId.includes("fact");
  const sections: PanelSection[] = [
    { headingHe: "הפעולה", paragraphsHe: [stripCode(a.labelHe), a.reasonHe] },
    { headingHe: "פרטים", rows: [
      { label: "אחראי", value: ownerFromRole(matter, a.ownerRoleHe) },
      { label: "יעד", value: a.dueHe === "לא ידוע" ? "לא ידוע" : a.dueHe },
      { label: "אישור", value: a.requiresHumanApproval ? "נדרש" : "אינו נדרש", tone: a.requiresHumanApproval ? "reviewed" : null },
    ]},
    ...(a.dependencies.length ? [{ headingHe: "תלויות", bullets: a.dependencies.map((d) => ({ textHe: d })) }] : []),
    { headingHe: "השפעה צפויה", paragraphsHe: [a.expectedEffectHe] },
    { headingHe: "מקורות", rows: [{ label: "מזהי הערכות", value: a.sourceAssessmentIds.join(" · ") || "—" }] },
  ];
  const actions: PanelAction[] = [];
  // Only launch the evidence workflow when the action is genuinely evidence-related.
  if (evidenceRelated) {
    actions.push({ id: "wf", labelHe: "פתח משימת טיפול ›", kind: "workflow", target: "document-evidence-review", primary: true });
  } else {
    actions.push({ id: "task", labelHe: "צור משימת היערכות", kind: "task", primary: true });
    actions.push({ id: "blocker", labelHe: "טפל בחסם החוסם", kind: "panel", target: "blocker" });
  }
  return meta("הפעולה הבאה", stripCode(a.labelHe), "?panel=action", "prioritizedActions[0]", "התחלה: אחראי/שותף", sections, actions);
}

/* ---------------------------------------------------------------- blocker */

export function buildBlocker(profile: MatterProfile, matter: Matter): PanelView {
  const blocking = profile.state.stage.blocking;
  if (blocking.length === 0) return { titleHe: "חסם", subtitleHe: "", urlHe: "?panel=blocker", dataHe: "state.stage.blocking", permHe: "צפייה: כל הצוות", sections: [], actions: [], emptyHe: "אין חסם פעיל בתיק." };
  const primary = blocking.find((b) => b.kind === "missing_fact") ?? blocking[0];
  const evidenceRelated = blocking.some((b) => b.kind === "missing_evidence" || b.kind === "missing_fact");
  const stageSrc = currentStage(matter)?.sources?.[0]?.citationHe ?? null;
  const sections: PanelSection[] = [
    { headingHe: "החסם", paragraphsHe: [stripCode(primary.messageHe), "חוסם את השלמת השלב הנוכחי."] , tone: "urgent" },
    { headingHe: "פרטים", rows: [
      { label: "שלב", value: profile.state.stage.currentStageTitleHe ?? "—" },
      { label: "סוגיה", value: "ידיעת המעסיק על ההיריון" },
      { label: "חסר", value: blocking.map((b) => stripCode(b.messageHe)).join(" · ") },
      ...(stageSrc ? [{ label: "מקור", value: stageSrc }] : []),
    ]},
    { headingHe: "פתרון מומלץ", paragraphsHe: [evidenceRelated ? "השג ותייק את הראיה הנדרשת, ובקש אישור מאשר לאימות העובדה." : "השלם את הפריט החסר לשלב."] },
  ];
  const actions: PanelAction[] = evidenceRelated
    ? [{ id: "wf", labelHe: "פתח משימת טיפול (מסמך→ראיה) ›", kind: "workflow", target: "document-evidence-review", primary: true }]
    : [{ id: "task", labelHe: "צור משימה לטיפול", kind: "task", primary: true }];
  return meta("חסם עיקרי", stripCode(primary.messageHe), "?panel=blocker", "vm.blocker · state.stage.blocking", "פתיחה: עו״ד+ · אישור: מאשר", sections, actions);
}

/* ------------------------------------------------------------------ dino */

export function buildDino(profile: MatterProfile, matter: Matter): PanelView {
  if (!profile.state.requiresHumanReview) return { titleHe: "דינו", subtitleHe: "", urlHe: "?panel=dino", dataHe: "vm.dino", permHe: "צפייה: כל הצוות", sections: [], actions: [], emptyHe: "אין תובנה פעילה הדורשת בדיקה." };
  const rr = profile.narrative.reviewRoute;
  const targetHe = reviewHe(rr?.primaryTarget);
  const legal = profile.score.dimensions.find((d) => d.id === "legal");
  const legalConcern = !!legal && ["requires_review", "at_risk", "blocked"].includes(legal.state);
  const insight = legalConcern ? "צוואר בקבוק בכיסוי המשפטי — טעון בדיקת מומחה." : `נדרשת ${targetHe} לפני הסתמכות — בהתאם למדיניות הלקוח.`;
  const policyBlocked = matter.client.aiPolicy === "prohibited";
  const sections: PanelSection[] = [
    { headingHe: "התובנה", paragraphsHe: [insight] },
    { headingHe: "מדוע זה חשוב", paragraphsHe: [legalConcern ? "ללא אימות העובדה לא ניתן לגבש המלצה מהותית." : "המדיניות מחייבת בדיקה אנושית לפני הסתמכות על תובנת AI."] },
    { headingHe: "מבוסס על", bullets: [{ textHe: "הערכת כיסוי משפטי" }, { textHe: `מסלול בדיקה: ${targetHe} · דיני עבודה` }] },
    { headingHe: "בדיקה אנושית", paragraphsHe: [matter.client.aiPolicy === "allowed_with_review" ? "תובנת AI — מותנית בבדיקה אנושית (מדיניות הלקוח)." : policyBlocked ? "עיבוד AI חסום במדיניות הלקוח — התוכן אינו מוצג." : "מסלול בדיקה סטנדרטי."], tone: policyBlocked ? "urgent" : "waiting" },
  ];
  // Only surface operational actions. Non-operational Dino actions are omitted (never shown disabled-as-real).
  const actions: PanelAction[] = policyBlocked ? [] : [
    { id: "gaps", labelHe: "הצג פערי ראיות", kind: "panel", target: "blocker" },
    { id: "risk", labelHe: "הסבר את הסיכון", kind: "panel", target: "posture" },
  ];
  return meta("דינו — ניתוח מלא", "מותנה בבדיקה אנושית", "?panel=dino", "vm.dino · narrative.reviewRoute", "צפייה: כל · gated by aiPolicy", sections, actions);
}

/* -------------------------------------------------------------- provenance */

export function buildProvenance(profile: MatterProfile, matter: Matter, sourceId: string | null): PanelView {
  const stage = currentStage(matter);
  const src = stage?.sources?.[0] ?? null;
  const sections: PanelSection[] = [
    { headingHe: "מקור", rows: [
      { label: "סוג", value: src ? sourceKindHe(src.kind) : "הערכת מנוע" },
      { label: "כותרת", value: src?.citationHe ?? (sourceId ?? "הערכת כיסוי משפטי") },
      ...(src ? [{ label: "סמכות", value: authorityHe(src.authority) }] : []),
      { label: "אימות", value: src?.verification === "verified" ? "מאומת" : "לא מאומת", tone: src?.verification === "verified" ? "completed" : "waiting" },
    ]},
    { headingHe: "טריות ובודק", rows: [
      { label: "חושב לפי", value: fmtDate(profile.score.freshness.computedAt) },
      { label: "מזהי הערכות", value: dimAssessments(profile) },
    ]},
  ];
  return meta("מקור ופרובננס", src?.citationHe ?? "מקור הנתונים", `?panel=provenance${sourceId ? `&source=${sourceId}` : ""}`, "procedure sources · assessment ids", "צפייה: כל הצוות", sections, []);
}

/* ---------------------------------------------------------------- review */

export function buildReview(profile: MatterProfile): PanelView {
  const rr = profile.narrative.reviewRoute;
  if (!rr) return { titleHe: "בדיקה אנושית", subtitleHe: "", urlHe: "?panel=review", dataHe: "narrative.reviewRoute", permHe: "צפייה: כל הצוות", sections: [], actions: [], emptyHe: "לא נדרשת בדיקה אנושית כרגע." };
  const sections: PanelSection[] = [
    { headingHe: "מסלול", rows: [
      { label: "יעד", value: reviewHe(rr.primaryTarget) },
      { label: "חוסם פעולה", value: rr.blocking ? "כן" : "לא", tone: rr.blocking ? "urgent" : null },
    ]},
    { headingHe: "נימוקים", bullets: rr.reasonsHe.map((r) => ({ textHe: r })) },
    ...(rr.requiredExpertiseHe?.length ? [{ headingHe: "מומחיות נדרשת", bullets: rr.requiredExpertiseHe.map((e) => ({ textHe: e })) }] : []),
    { headingHe: "מקורות", rows: [{ label: "מזהי הערכות", value: rr.sourceAssessmentIds?.join(" · ") || "—" }] },
  ];
  return meta("בדיקת עו״ד — מסלול בדיקה", reviewHe(rr.primaryTarget), "?panel=review", "narrative.reviewRoute", "צפייה: כל הצוות", sections, []);
}

/* --------------------------------------------------------------- identity */

export function buildIdentity(matter: Matter): PanelView {
  const sections: PanelSection[] = [
    { headingHe: "פרטי התיק", rows: [
      { label: "מזהה תיק", value: matter.fileNoHe ?? matter.id },
      { label: "לקוח", value: matter.client.nameHe },
      { label: "תחום", value: "דיני עבודה" },
      { label: "פורום", value: matter.forumHe ?? "—" },
      { label: "אחראי", value: ownerName(matter) },
      { label: "שלב נוכחי", value: currentStage(matter)?.titleHe ?? "—" },
      { label: "חיסיון", value: confidentialityHe(matter.client.confidentiality) },
      { label: "נפתח", value: fmtDate(matter.openedAt) },
      { label: "עודכן", value: fmtDate(matter.asOf) },
    ]},
    { headingHe: "צוות", bullets: matter.team.map((m) => ({ textHe: `${m.nameHe} · ${ROLE_HE[m.role] ?? m.role} · ${m.openTasks} משימות` })) },
  ];
  return meta("פרטי התיק", matter.titleHe, "?panel=identity", "matter", "צפייה: כל · עריכה: שותף", sections, [
    { id: "owner", labelHe: "נהל אחראי ›", kind: "panel", target: "owner" },
  ]);
}

/* ------------------------------------------------------------------ owner */

export function buildOwner(matter: Matter): PanelView {
  const ORDER = ["partner", "senior_lawyer", "lawyer", "paralegal", "intern"];
  const members = [...matter.team].sort((a, b) => ORDER.indexOf(a.role) - ORDER.indexOf(b.role));
  const currentId = matter.assignedOwnerId ?? members[0]?.id ?? null;
  const sections: PanelSection[] = [
    { headingHe: "אחראי נוכחי", rows: [{ label: "אחראי", value: ownerName(matter) }] },
    { headingHe: "שיוך מחדש", bullets: members.map((m) => ({ textHe: `${m.nameHe} · ${ROLE_HE[m.role] ?? m.role} · עומס ${pct(m.capacityLoad)}` })) },
  ];
  const actions: PanelAction[] = members.map((m) => ({
    id: `assign-${m.id}`, labelHe: `שייך ל${m.nameHe}`, kind: "reassign", target: m.id, disabled: m.id === currentId, disabledReasonHe: m.id === currentId ? "כבר האחראי" : null,
  }));
  return meta("אחראי התיק", ownerName(matter), "?panel=owner", "matter.team", "שיוך מחדש: שותף", sections, actions);
}

/* --------------------------------------------------------------- approval */

export function buildApproval(profile: MatterProfile): PanelView {
  const a = profile.prioritizedActions[0];
  const required = a?.requiresHumanApproval ?? false;
  const rr = profile.narrative.reviewRoute;
  const sections: PanelSection[] = [
    { headingHe: "אישור", rows: [
      { label: "נדרש אישור", value: required ? "כן" : "לא", tone: required ? "reviewed" : null },
      { label: "מאשר", value: reviewHe(rr?.primaryTarget) },
      { label: "מצב", value: "טרם הוגש" },
    ]},
    { headingHe: "מדוע", paragraphsHe: [required ? "הפעולה טעונה אישור מאשר לפני שתחשב מחדש את התיק." : "הפעולה אינה טעונה אישור."] },
  ];
  return meta("שער אישור", required ? "נדרש אישור" : "אינו נדרש", "?panel=approval", "action.requiresApproval · reviewRoute", "אישור: שותף/בכיר", sections, []);
}

/* ------------------------------------------------------------- dispatcher */

export function buildPanel(kind: string, param: string | null, profile: MatterProfile, matter: Matter): PanelView {
  switch (kind) {
    case "posture": return buildPosture(profile);
    case "situation": return buildSituation(profile);
    case "score": return param ? buildDimension(profile, param) : buildScoreLens(profile);
    case "milestone": return buildMilestone(matter, profile, param);
    case "deadline": return buildDeadline(profile, matter);
    case "action": return buildAction(profile, matter);
    case "blocker": return buildBlocker(profile, matter);
    case "dino": return buildDino(profile, matter);
    case "provenance": return buildProvenance(profile, matter, param);
    case "review": return buildReview(profile);
    case "identity": return buildIdentity(matter);
    case "owner": return buildOwner(matter);
    case "approval": return buildApproval(profile);
    default: return notFound("פאנל לא מזוהה", "");
  }
}

/* ------------------------------------------------------------------ utils */

function meta(titleHe: string, subtitleHe: string, urlHe: string, dataHe: string, permHe: string, sections: PanelSection[], actions: PanelAction[]): PanelView {
  return { titleHe, subtitleHe, urlHe, dataHe, permHe, sections, actions };
}
function notFound(titleHe: string, urlHe: string): PanelView {
  return { titleHe, subtitleHe: "", urlHe, dataHe: "—", permHe: "—", sections: [], actions: [], emptyHe: "הפריט המבוקש לא נמצא. הפרמטר אינו תקין." };
}
function ownerName(matter: Matter): string {
  if (matter.assignedOwnerId) { const m = matter.team.find((t) => t.id === matter.assignedOwnerId); if (m) return m.nameHe; }
  for (const role of ["partner", "senior_lawyer", "lawyer"]) { const m = matter.team.find((t) => t.role === role); if (m) return m.nameHe; }
  return matter.team[0]?.nameHe ?? "—";
}
function ownerFromRole(matter: Matter, roleHe: string): string {
  if (roleHe && roleHe !== "לא ידוע") return roleHe;
  return ownerName(matter);
}
function dimAssessments(profile: MatterProfile): string {
  const ids = new Set<string>();
  for (const d of profile.score.dimensions) for (const id of d.sourceAssessmentIds) ids.add(id);
  return [...ids].slice(0, 6).join(" · ") || "—";
}
function postureHe(p: string): string {
  return ({ on_track: "במסלול", needs_attention: "דורש תשומת לב", at_risk: "בסיכון", blocked: "חסום", degraded: "הערכה חלקית", requires_review: "דורש בדיקה", insufficient_data: "מידע חסר" } as Record<string, string>)[p] ?? p;
}
function postureTone(p: string): Tone {
  return ({ on_track: "completed", needs_attention: "today", at_risk: "risk", blocked: "urgent", degraded: "waiting", requires_review: "reviewed", insufficient_data: "waiting" } as Record<string, Tone>)[p] ?? "waiting";
}
function confidentialityHe(c: string): string {
  return ({ client_confidential: "חסוי ללקוח", privileged: "חסיון עו״ד–לקוח", public: "ציבורי", restricted: "מוגבל" } as Record<string, string>)[c] ?? c;
}
function sourceKindHe(k: string): string {
  return ({ legislation: "חקיקה", court_rules: "תקנות בית דין", case_law: "פסיקה", official_guidance: "הנחיה רשמית", professional_practice: "נוהג מקצועי", firm_practice: "נוהל משרד" } as Record<string, string>)[k] ?? k;
}
function authorityHe(a: string): string {
  return ({ mandatory_law: "דין מחייב", recommended: "מומלץ", discretionary: "שיקול דעת", best_practice: "נוהג מיטבי" } as Record<string, string>)[a] ?? a;
}
