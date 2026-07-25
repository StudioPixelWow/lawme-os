/**
 * Procedure-catalog adapter for the reasoning engine (Slice 4.0.0). PURE.
 * Resolves the governing procedure for the issue and extracts the legal ELEMENTS
 * (required facts), the statutory EXCEPTIONS, the legal RISKS and the governing
 * legislation refIds — the raw material for element-by-element analysis and the
 * adversarial self-challenge. Reads the reviewed employment procedure catalog.
 */
import { EMPLOYMENT_PROCEDURE_GRAPH } from "../legal-knowledge/procedure/catalog.ts";
import { findProcedure } from "../legal-knowledge/procedure/graph.ts";
import { TOPIC_PROCEDURE } from "../legal-knowledge/triad/coverage.ts";

/** Hebrew labels for the recurring employment fact/element keys. */
export const FACT_KEY_HE: Record<string, string> = {
  employment_relationship: "קיום יחסי עובד–מעסיק",
  employment_duration: "משך ההעסקה",
  pregnancy_status: "היות העובדת בהיריון",
  employer_knowledge: "ידיעת המעסיק על ההיריון",
  permit_status: "קבלת היתר פיטורים",
  dismissal_date: "מועד הפיטורים",
  hearing_held: "קיום שימוע כדין",
  dismissal_reason: "עילת הפיטורים",
  severance_eligibility: "זכאות לפיצויי פיטורים",
  notice_given: "מתן הודעה מוקדמת",
  wage_components: "רכיבי השכר",
  overtime_hours: "היקף השעות הנוספות",
};

export interface RequiredElement {
  readonly key: string;
  readonly labelHe: string;
  readonly whyRequiredHe: string;
}

export interface GoverningProcedure {
  readonly procedureType: string | null;
  readonly titleHe: string | null;
  readonly requiredElements: readonly RequiredElement[];
  readonly statutoryExceptionsHe: readonly string[];
  readonly legalRisksHe: readonly string[];
  readonly governingRefIds: readonly string[];
  readonly limitationsHe: readonly string[];
}

/** Resolve the governing procedure from the matter's procedure type or the
 *  research topics, and extract its legal elements / exceptions / risks. */
export function resolveGoverningProcedure(procedureType: string | null, topics: readonly string[]): GoverningProcedure {
  let type = procedureType;
  if (!type) {
    for (const t of topics) { if (TOPIC_PROCEDURE[t]) { type = TOPIC_PROCEDURE[t]; break; } }
  }
  const proc = type ? findProcedure(EMPLOYMENT_PROCEDURE_GRAPH, type) : null;
  if (!proc) {
    return { procedureType: type, titleHe: null, requiredElements: [], statutoryExceptionsHe: [], legalRisksHe: [], governingRefIds: [], limitationsHe: [] };
  }

  const elementKeys: string[] = [];
  const exceptions = new Set<string>();
  const risks = new Set<string>();
  const refIds = new Set<string>();

  for (const link of proc.governingLegislation) if (link.kind === "legislation" && link.refId) refIds.add(link.refId);
  for (const stage of proc.stages) {
    for (const f of stage.requiredFacts) if (!elementKeys.includes(f)) elementKeys.push(f);
    for (const e of stage.exceptionsHe) exceptions.add(e);
    for (const r of stage.risksHe) risks.add(r);
    for (const link of stage.sources) if (link.kind === "legislation" && link.refId) refIds.add(link.refId);
  }

  const requiredElements: RequiredElement[] = elementKeys.map((key) => ({
    key, labelHe: FACT_KEY_HE[key] ?? key, whyRequiredHe: `רכיב הכרחי לביסוס העילה בהליך ${proc.titleHe}`,
  }));

  return {
    procedureType: type,
    titleHe: proc.titleHe,
    requiredElements,
    statutoryExceptionsHe: [...exceptions],
    legalRisksHe: [...risks],
    governingRefIds: [...refIds],
    limitationsHe: proc.limitationsHe,
  };
}
