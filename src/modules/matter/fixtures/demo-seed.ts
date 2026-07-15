/**
 * Demo seed data (Capability 1, Slice A). Stable UUIDs so the demo tenant and
 * matter are durable and re-seedable without duplication. Mirrors the in-memory
 * demo fixture header + evidence requirements. Data only — no secrets, no logic.
 */
export const DEMO_SEED = {
  organizationId: "d0e30000-0000-4000-8000-000000000001",
  organizationName: "משרד הדגמה — LawME",
  organizationSlug: "org-demo",

  matterId: "d0e31000-0000-4000-8000-000000000001",
  matterSlug: "demo",
  titleHe: "פיטורי עובדת בהיריון — כהן נ׳ טק־לייף",
  fileNoHe: "23-07-57631",
  forumHe: "בית הדין האזורי לעבודה תל אביב",
  procedureType: "pregnancy_dismissal",
  topic: "pregnancy_dismissal",
  currentStageId: "preg-2",

  evidenceRequirements: [
    {
      id: "d0e3e001-0000-4000-8000-000000000001",
      labelHe: "אישור העסקה ומשך העסקה",
      evidenceType: "document" as const,
      mandatory: true,
      status: "collected" as const,
      linkedFactField: "employment_duration" as string | null,
    },
    {
      id: "d0e3e002-0000-4000-8000-000000000002",
      labelHe: "ראיה לידיעת המעסיק על ההיריון",
      evidenceType: "communication" as const,
      mandatory: true,
      status: "missing" as const,
      linkedFactField: "employer_knowledge" as string | null,
    },
  ],
} as const;
