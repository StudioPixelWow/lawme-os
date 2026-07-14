/**
 * Missing-Evidence workflow — the first WorkflowDefinition (Sprint 2.1).
 *
 * The operational workflow that closes the decisive evidentiary gap
 * ("ידיעת המעסיק על ההיריון"). After Sprint 2.1 it owns NO lifecycle logic —
 * that lives in the generic engine. This module supplies only the domain parts:
 * detection, the seeded task, the fields to collect, who approves, and the pure
 * matter mutation (and its reversal). Any future workflow implements the same
 * `WorkflowDefinition` contract and plugs into the same engine.
 */
import type { Matter, MatterTeamMember } from "../types.ts";
import type { OwnerOption, WorkflowDefinition, WorkflowTask } from "./engine.ts";

/** The decisive gap this workflow closes (the demo matter's real ids). */
export const TARGET_FACT = "employer_knowledge";
export const TARGET_EVIDENCE = "preg-e2";
export const TARGET_FACT_LABEL_HE = "ידיעת המעסיק על ההיריון";
export const DEFAULT_EVIDENCE_STATEMENT_HE = "המעסיק ידע על ההיריון במועד הפיטורים";
const UNKNOWN_STATEMENT_HE = "טרם אומת אם המעסיק ידע על ההיריון";

/* -------------------------------------------------------------- detection */

export interface EvidenceGap {
  factField: string;
  factLabelHe: string;
  evidenceId: string;
  evidenceLabelHe: string;
}

export function hasEvidenceGap(matter: Matter): boolean {
  const factUnknown = matter.facts.some((f) => f.field === TARGET_FACT && f.status === "unknown");
  const evidenceMissing = matter.evidence.some((e) => e.id === TARGET_EVIDENCE && e.mandatory && !e.collected);
  return factUnknown || evidenceMissing;
}

export function detectEvidenceGap(matter: Matter): EvidenceGap | null {
  if (!hasEvidenceGap(matter)) return null;
  const evidence = matter.evidence.find((e) => e.id === TARGET_EVIDENCE);
  return {
    factField: TARGET_FACT,
    factLabelHe: TARGET_FACT_LABEL_HE,
    evidenceId: TARGET_EVIDENCE,
    evidenceLabelHe: evidence?.labelHe ?? "ראיה נדרשת",
  };
}

/* ------------------------------------------------------------------ owners */

const ROLE_ORDER: MatterTeamMember["role"][] = ["partner", "senior_lawyer", "lawyer", "paralegal", "intern"];
const ROLE_HE: Record<MatterTeamMember["role"], string> = {
  partner: "שותף",
  senior_lawyer: "עו״ד בכיר",
  lawyer: "עו״ד",
  paralegal: "פראלגל",
  intern: "מתמחה",
};

export function ownerOptions(matter: Matter): OwnerOption[] {
  return [...matter.team]
    .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role))
    .map((m) => ({ id: m.id, nameHe: m.nameHe, roleHe: ROLE_HE[m.role] }));
}

/* ---------------------------------------------------------------- mutation */

export interface EvidenceResolutionInput {
  statementHe: string;
  sourceHe: string;
}

/** File the mandatory evidence and confirm the fact it establishes. Pure. */
export function applyEvidenceResolution(matter: Matter, input: EvidenceResolutionInput): Matter {
  const statementHe = input.statementHe.trim();
  const sourceHe = input.sourceHe.trim();
  return {
    ...matter,
    facts: matter.facts.map((f) =>
      f.field === TARGET_FACT
        ? { ...f, status: "confirmed" as const, statementHe: statementHe || f.statementHe, source: sourceHe || f.source }
        : f,
    ),
    evidence: matter.evidence.map((e) => (e.id === TARGET_EVIDENCE ? { ...e, collected: true } : e)),
  };
}

/** Reverse the resolution — the gap returns (used on reopen). Pure. */
export function revertEvidenceResolution(matter: Matter): Matter {
  return {
    ...matter,
    facts: matter.facts.map((f) =>
      f.field === TARGET_FACT
        ? { ...f, status: "unknown" as const, statementHe: UNKNOWN_STATEMENT_HE, source: "" }
        : f,
    ),
    evidence: matter.evidence.map((e) => (e.id === TARGET_EVIDENCE ? { ...e, collected: false } : e)),
  };
}

/* --------------------------------------------------------- the definition */

function partnerName(matter: Matter): string | null {
  return matter.team.find((m) => m.role === "partner")?.nameHe ?? null;
}

function earliestStrictDue(matter: Matter): string | null {
  const future = matter.deadlines
    .filter((d) => d.strict && d.dueDate && d.dueDate > matter.asOf)
    .map((d) => d.dueDate as string)
    .sort();
  return future[0] ?? null;
}

export const evidenceWorkflow: WorkflowDefinition = {
  id: "missing-evidence",
  titleHe: "טיפול בחסם ראייתי",
  subtitleHe: "אימות ידיעת המעסיק על ההיריון",
  kindHe: "ראיות",

  detect: hasEvidenceGap,

  seedTask(matter: Matter): WorkflowTask {
    const gap = detectEvidenceGap(matter);
    const evidenceLabelHe = gap?.evidenceLabelHe ?? "הראיה הנדרשת";
    return {
      id: `task-${TARGET_EVIDENCE}`,
      titleHe: `לאמת את ${TARGET_FACT_LABEL_HE}`,
      detailHe: `להשיג ולתייק: ${evidenceLabelHe}. אימות העובדה חוסם את סגירת שלב אימות העובדות המכריעות.`,
      ownerId: null,
      ownerNameHe: null,
      dueDateISO: null,
      fields: { statement: DEFAULT_EVIDENCE_STATEMENT_HE, source: "" },
    };
  },

  ownerOptions,

  fields: [
    { key: "statement", labelHe: "מה מוכיחה הראיה", kind: "text", required: true },
    { key: "source", labelHe: "מקור הראיה", kind: "text", placeholderHe: "למשל: תכתובת דוא״ל מיום 12.4.2026", required: true },
  ],

  dueMaxISO: earliestStrictDue,

  requiresApproval: true,
  approverFor: partnerName,

  canSubmit(task: WorkflowTask): boolean {
    return (task.fields.statement ?? "").trim().length > 0 && (task.fields.source ?? "").trim().length > 0;
  },

  resolve(matter: Matter, task: WorkflowTask): Matter {
    return applyEvidenceResolution(matter, {
      statementHe: task.fields.statement ?? "",
      sourceHe: task.fields.source ?? "",
    });
  },

  revert: revertEvidenceResolution,
};
