/** Matter Intelligence engines (Epic 4) — registry of all 17 engines. */
export * from "./framework.ts";

import type { MatterEngine } from "../types.ts";
import { deadlineEngine } from "./deadline.ts";
import { missingInformationEngine } from "./missing-information.ts";
import { evidenceEngine } from "./evidence.ts";
import { documentEngine } from "./document.ts";
import { readinessEngine } from "./readiness.ts";
import { riskEngine } from "./risk.ts";
import { nextActionEngine } from "./next-action.ts";
import { healthEngine } from "./health.ts";
import { timelineEngine } from "./timeline.ts";
import { progressEngine } from "./progress.ts";
import { strategyEngine } from "./strategy.ts";
import { clientEngine } from "./client.ts";
import { teamEngine } from "./team.ts";
import { financialEngine } from "./financial.ts";
import { communicationEngine } from "./communication.ts";
import { legalEngine } from "./legal.ts";
import { outcomeEngine } from "./outcome.ts";

export {
  deadlineEngine, missingInformationEngine, evidenceEngine, documentEngine,
  readinessEngine, riskEngine, nextActionEngine, healthEngine, timelineEngine,
  progressEngine, strategyEngine, clientEngine, teamEngine, financialEngine,
  communicationEngine, legalEngine, outcomeEngine,
};

/**
 * The component engines, in a stable order. Health is intentionally EXCLUDED
 * here — it is a roll-up meta-engine run by the orchestrator after the
 * components, so it can summarize them.
 */
export const COMPONENT_ENGINES: MatterEngine[] = [
  timelineEngine,
  readinessEngine,
  missingInformationEngine,
  evidenceEngine,
  documentEngine,
  deadlineEngine,
  riskEngine,
  legalEngine,
  strategyEngine,
  progressEngine,
  clientEngine,
  teamEngine,
  financialEngine,
  communicationEngine,
  outcomeEngine,
  nextActionEngine,
];

/** total engine count including the health roll-up engine */
export const MATTER_ENGINE_COUNT = COMPONENT_ENGINES.length + 1;
