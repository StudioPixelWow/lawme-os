/**
 * DinoRequiredSourcePlanner (Epic 3A, Phase 8).
 * Defines the minimum acceptable evidence per issue. Encodes the
 * substitution law: a secondary article can NEVER replace statutory
 * text; a regional decision does not automatically replace binding
 * appellate authority; an outdated statute version cannot support a
 * current-law proposition; one weak source is never enough.
 */
import type { IssueGraph } from "../issues/types.ts";
import type { SourcePlan, SourceRequirement } from "./types.ts";

export const SOURCE_PLANNER_VERSION = "source-planner-1.0.0";

export function planRequiredSources(issueGraph: IssueGraph): SourcePlan {
  const requirements: SourceRequirement[] = [];
  let n = 1;

  for (const issue of issueGraph.issues) {
    // every issue needs current statutory grounding
    requirements.push({
      id: `req-${n++}`,
      issueId: issue.id,
      sourceType: "current_statutory_text",
      authorityLevel: "binding",
      minimumCount: 1,
      freshnessHe: "הנוסח בתוקף במועד הרלוונטי",
      versionDate: null,
      mandatory: issue.issueType !== "procedural_requirement",
      acceptableSubstitutes: [],
      unacceptableSubstitutesHe: [
        "מאמר משני אינו תחליף לנוסח חוק עדכני",
        "גרסה היסטורית אינה תומכת בטענת דין נוכחי",
      ],
    });
    // binding case law for binding-threshold issues
    if (issue.authorityThreshold === "binding") {
      requirements.push({
        id: `req-${n++}`,
        issueId: issue.id,
        sourceType: "national_labor_authority",
        authorityLevel: "binding",
        minimumCount: 1,
        freshnessHe: "הלכה שלא נהפכה",
        versionDate: null,
        mandatory: true,
        acceptableSubstitutes: ["binding_supreme_authority"],
        unacceptableSubstitutesHe: [
          "פסיקה אזורית אינה תחליף אוטומטי להלכה מחייבת",
        ],
      });
    } else {
      requirements.push({
        id: `req-${n++}`,
        issueId: issue.id,
        sourceType: "regional_persuasive_authority",
        authorityLevel: "persuasive",
        minimumCount: 1,
        freshnessHe: "עדיפות לפסיקה מהעשור האחרון",
        versionDate: null,
        mandatory: false,
        acceptableSubstitutes: ["national_labor_authority", "binding_supreme_authority"],
        unacceptableSubstitutesHe: ["מקור משני לבדו אינו מספיק לקביעה משפטית"],
      });
    }
    issue.sourceRequirementIds = requirements.filter((r) => r.issueId === issue.id).map((r) => r.id);
  }

  return {
    requirements,
    substitutionRulesHe: [
      "מאמר משני אינו יכול להחליף נוסח חוק עדכני",
      "החלטה אזורית אינה מחליפה אוטומטית הלכה מחייבת של ערכאת ערעור",
      "גרסה לא עדכנית של חוק אינה תומכת בטענת דין נוכחי",
      "מקור חלש אחד אינו מספיק לתשובה בביטחון גבוה",
    ],
    plannerVersion: SOURCE_PLANNER_VERSION,
  };
}
