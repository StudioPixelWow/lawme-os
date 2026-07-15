/**
 * Matter Room — panel/URL state model (Sprint 3.2). Pure & isomorphic.
 *
 * One interaction grammar: every contextual surface is a "panel" whose open
 * state lives in the URL (?panel=…), so refresh restores it and browser Back
 * closes it. The workflow drawer is the one non-panel surface (?workflow=…).
 * Invalid params fail safe (parse to null / no panel).
 */
export type PanelKind =
  | "identity"
  | "posture"
  | "review"
  | "situation"
  | "deadline"
  | "action"
  | "blocker"
  | "milestone"
  | "score"
  | "dino"
  | "provenance"
  | "owner"
  | "approval"
  | "work";

/** The Matter working surface lenses (Capability 1). Only one is active at a time. */
export type WorkLens = "documents" | "evidence" | "tasks" | "notes" | "activity" | "research";
export const WORK_LENSES: readonly WorkLens[] = ["documents", "evidence", "tasks", "notes", "activity", "research"];
const VALID_LENS: ReadonlySet<string> = new Set<WorkLens>(WORK_LENSES);
/** Normalise a raw lens param, defaulting to the first (documents). */
export function normalizeLens(raw: string | null | undefined): WorkLens {
  return raw && VALID_LENS.has(raw) ? (raw as WorkLens) : "documents";
}

export interface PanelState {
  kind: PanelKind;
  /** score→dimension id · milestone→stage id · provenance→source id */
  param?: string | null;
}

const VALID: ReadonlySet<string> = new Set<PanelKind>([
  "identity", "posture", "review", "situation", "deadline", "action",
  "blocker", "milestone", "score", "dino", "provenance", "owner", "approval", "work",
]);

/** which panels carry a param, and under which query key. */
const PARAM_KEY: Partial<Record<PanelKind, string>> = {
  score: "dimension",
  milestone: "stage",
  provenance: "source",
  work: "lens",
};

export type ConfirmKind = "reject" | "reopen" | "approve";
const VALID_CONFIRM: ReadonlySet<string> = new Set<ConfirmKind>(["reject", "reopen", "approve"]);

export interface MatterUrlSurface {
  panel: PanelState | null;
  workflow: string | null;
  confirm: ConfirmKind | null;
}

/** Parse a location.search string into the open surface. Fails safe. */
export function parseMatterUrl(search: string): MatterUrlSurface {
  let sp: URLSearchParams;
  try {
    sp = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  } catch {
    return { panel: null, workflow: null, confirm: null };
  }
  const confirmRaw = sp.get("confirm");
  const confirm = confirmRaw && VALID_CONFIRM.has(confirmRaw) ? (confirmRaw as ConfirmKind) : null;
  const panelRaw = sp.get("panel");
  if (panelRaw && VALID.has(panelRaw)) {
    const kind = panelRaw as PanelKind;
    const key = PARAM_KEY[kind];
    const param = key ? sp.get(key) : null;
    return { panel: { kind, param: param ?? null }, workflow: null, confirm: null };
  }
  const workflow = sp.get("workflow");
  return { panel: null, workflow: workflow && workflow.length > 0 ? workflow : null, confirm };
}

/** Build the query string for a surface (empty string when nothing is open). */
export function surfaceToSearch(surface: { panel: PanelState | null; workflow: string | null; confirm?: ConfirmKind | null }): string {
  const sp = new URLSearchParams();
  if (surface.panel) {
    sp.set("panel", surface.panel.kind);
    const key = PARAM_KEY[surface.panel.kind];
    if (key && surface.panel.param) sp.set(key, surface.panel.param);
  } else if (surface.workflow) {
    sp.set("workflow", surface.workflow);
    if (surface.confirm) sp.set("confirm", surface.confirm);
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function samePanel(a: PanelState | null, b: PanelState | null): boolean {
  if (a === null || b === null) return a === b;
  return a.kind === b.kind && (a.param ?? null) === (b.param ?? null);
}
