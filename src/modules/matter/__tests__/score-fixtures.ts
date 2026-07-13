/** Epic 4.2 scenario fixtures for Matter Score + Narrative tests. asOf fixed. */
import type { Matter } from "../types.ts";
import { readyMatter } from "./fixtures.ts";

const AS_OF = "2026-07-12";

/** Scenario B — hearing/interim relief in 4 days, missing supporting affidavit. */
export function hearingSoonMissingAffidavit(): Matter {
  const m = readyMatter();
  m.currentStageId = "preg-7"; // interim_relief; mandatory evidence preg-e4 (תצהיר תומך)
  m.evidence = [
    { id: "preg-e4", labelHe: "תצהיר תומך", evidenceType: "document", collected: false, mandatory: true },
  ];
  m.deadlines = [
    { id: "dl-hearing", labelHe: "דיון בבקשה לסעד זמני", dueDate: "2026-07-16", strict: true, basisHe: "מועד דיון" },
  ];
  return m;
}

/** Scenario C — client not updated for eight days, awaiting a response. */
export function clientSilence(): Matter {
  const m = readyMatter();
  m.client.responsiveness = "slow";
  m.client.lastContactAt = "2026-07-04"; // 8 days before asOf
  m.communications = [
    { id: "c1", at: "2026-07-04", direction: "inbound", channel: "email", awaitingResponse: true, summaryHe: "שאלה מהלקוחה" },
  ];
  return m;
}

/** Scenario E — no legal coverage available for the topic (empty legislation refs). */
export function missingLegalCoverage(): Matter {
  const m = readyMatter();
  m.availableLegislationRefIds = []; // no governing legislation in corpus → legal requires_review
  return m;
}

/** Scenario H — a required fact is disputed between the parties. */
export function conflictingFacts(): Matter {
  const m = readyMatter();
  // employer_knowledge is required at the fact-confirmation stage; mark it disputed
  m.facts = m.facts.map((f) =>
    f.field === "employer_knowledge"
      ? { ...f, status: "disputed", statementHe: "הצדדים חלוקים אם המעסיק ידע על ההיריון" }
      : f,
  );
  return m;
}

export { AS_OF };
