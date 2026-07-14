/**
 * Workflow registry (Sprint 2.1).
 * The list of workflows that plug into the engine. Future workflows are added
 * here — the engine, store and drawer need no changes to run them.
 */
import type { Matter } from "../types.ts";
import type { WorkflowDefinition } from "./engine.ts";
import { evidenceWorkflow } from "./evidence-task.ts";

export const WORKFLOWS: WorkflowDefinition[] = [evidenceWorkflow];

export function findWorkflow(id: string | null | undefined): WorkflowDefinition | null {
  return WORKFLOWS.find((w) => w.id === id) ?? null;
}

/** the workflows that currently apply to a matter (detection fired). */
export function applicableWorkflows(matter: Matter): WorkflowDefinition[] {
  return WORKFLOWS.filter((w) => w.detect(matter));
}
