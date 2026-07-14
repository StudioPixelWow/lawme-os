"use client";

/**
 * Matter App — client view-state store (Sprint 3.2: the interaction pass).
 *
 * One source of truth for the live matter, the workflow instance, the open
 * contextual surface (detail panel OR workflow drawer — mutually exclusive), and
 * matter-level actions (owner reassignment, task creation) with their activity +
 * audit. The open surface is mirrored to the URL so refresh restores it and the
 * browser Back button closes it. The intelligence engine is untouched — the
 * store only holds the matter and recomputes the profile/view-model from it.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import { buildMatterProfile } from "@/modules/matter";
import type { MatterProfile } from "../profile";
import { toRoomViewModel } from "./adapter";
import type { RoomViewModel } from "./types";
import type { Matter } from "../types";
import { applyEvent, createInstance, type WorkflowEvent, type WorkflowInstance } from "../workflow/engine";
import { findWorkflow } from "../workflow/registry";
import type { ActivityEntry } from "../activity/activity";
import { parseMatterUrl, surfaceToSearch, type PanelState, type ConfirmKind } from "./panels/panel-state";

export interface MatterTask {
  id: string;
  titleHe: string;
  ownerNameHe: string | null;
  dueDateISO: string | null;
  atISO: string;
}
export interface MatterAuditEvent {
  id: string;
  action: string;
  atISO: string;
  actorHe: string;
  objectId: string;
  prevHe: string | null;
  nextHe: string | null;
  correlationId: string;
}

export interface RoomState {
  matterId: string;
  matter: Matter;
  baseline: Matter;
  activeDefId: string | null;
  instance: WorkflowInstance | null;
  drawerOpen: boolean;
  panel: PanelState | null;
  confirm: ConfirmKind | null;
  matterActivity: ActivityEntry[];
  matterAudit: MatterAuditEvent[];
  tasks: MatterTask[];
  seq: number;
}

export type RoomAction =
  | { type: "open-panel"; panel: PanelState }
  | { type: "close-panel" }
  | { type: "open-confirm"; kind: ConfirmKind }
  | { type: "close-confirm" }
  | { type: "open-workflow"; defId: string }
  | { type: "create-instance" }
  | { type: "wf"; event: WorkflowEvent }
  | { type: "open-drawer" }
  | { type: "close-drawer" }
  | { type: "reassign-owner"; memberId: string }
  | { type: "create-task"; titleHe: string; ownerId?: string | null; dueDateISO?: string | null }
  | { type: "reset" };

function stamp(matter: Matter, seq: number): string {
  const day = /^(\d{4}-\d{2}-\d{2})/.exec(matter.asOf)?.[1] ?? "2026-07-12";
  const mm = String(9 + Math.floor(seq / 60)).padStart(2, "0");
  const ss = String(seq % 60).padStart(2, "0");
  return `${day}T${mm}:${ss}:00`;
}

function roomReducer(state: RoomState, action: RoomAction): RoomState {
  switch (action.type) {
    case "open-panel":
      return { ...state, panel: action.panel, drawerOpen: false, confirm: null };

    case "close-panel":
      return { ...state, panel: null };

    case "open-confirm":
      return { ...state, confirm: action.kind };

    case "close-confirm":
      return { ...state, confirm: null };

    case "open-workflow": {
      const def = findWorkflow(action.defId);
      if (!def || !def.detect(state.matter)) return state;
      const keep = state.instance && state.instance.definitionId === action.defId;
      return { ...state, activeDefId: action.defId, instance: keep ? state.instance : null, drawerOpen: true, panel: null };
    }
    case "create-instance": {
      const def = findWorkflow(state.activeDefId);
      if (!def) return state;
      // idempotent: keep an existing instance for the same workflow (avoids
      // wiping in-progress state on back/forward navigation).
      if (state.instance && state.instance.definitionId === state.activeDefId) return state;
      return { ...state, instance: createInstance(def, state.matter) };
    }
    case "wf": {
      if (!state.instance) return state;
      const def = findWorkflow(state.instance.definitionId);
      if (!def) return state;
      const { instance, matter } = applyEvent(def, state.instance, state.matter, action.event);
      return { ...state, instance, matter };
    }
    case "open-drawer":
      return state.instance ? { ...state, drawerOpen: true, panel: null } : state;
    case "close-drawer":
      return { ...state, drawerOpen: false };

    case "reassign-owner": {
      const member = state.matter.team.find((m) => m.id === action.memberId);
      if (!member || state.matter.assignedOwnerId === action.memberId) return state;
      const prev = ownerNameOf(state.matter);
      const matter = { ...state.matter, assignedOwnerId: action.memberId };
      const atISO = stamp(matter, state.seq);
      return {
        ...state,
        matter,
        matterActivity: [...state.matterActivity, { id: `ma-${state.seq}`, atISO, textHe: `האחראי שונה ל${member.nameHe}`, tone: "info" }],
        matterAudit: [...state.matterAudit, { id: `au-${state.seq}`, action: "owner_reassigned", atISO, actorHe: "שותף", objectId: state.matterId, prevHe: prev, nextHe: member.nameHe, correlationId: `cor-${state.seq}` }],
        seq: state.seq + 1,
      };
    }

    case "create-task": {
      const owner = action.ownerId ? state.matter.team.find((m) => m.id === action.ownerId)?.nameHe ?? null : null;
      const atISO = stamp(state.matter, state.seq);
      const task: MatterTask = { id: `task-${state.seq}`, titleHe: action.titleHe, ownerNameHe: owner, dueDateISO: action.dueDateISO ?? null, atISO };
      return {
        ...state,
        tasks: [...state.tasks, task],
        matterActivity: [...state.matterActivity, { id: `ma-${state.seq}`, atISO, textHe: `נוצרה משימה: ${action.titleHe}`, tone: "progress" }],
        matterAudit: [...state.matterAudit, { id: `au-${state.seq}`, action: "task_created", atISO, actorHe: "אחראי", objectId: task.id, prevHe: null, nextHe: action.titleHe, correlationId: `cor-${state.seq}` }],
        seq: state.seq + 1,
      };
    }

    case "reset":
      return makeInitial(state.baseline);
    default:
      return state;
  }
}

function ownerNameOf(matter: Matter): string {
  if (matter.assignedOwnerId) { const m = matter.team.find((t) => t.id === matter.assignedOwnerId); if (m) return m.nameHe; }
  for (const role of ["partner", "senior_lawyer", "lawyer"]) { const m = matter.team.find((t) => t.role === role); if (m) return m.nameHe; }
  return matter.team[0]?.nameHe ?? "—";
}

function makeInitial(matter: Matter): RoomState {
  return {
    matterId: matter.id, matter, baseline: matter,
    activeDefId: null, instance: null, drawerOpen: false, panel: null, confirm: null,
    matterActivity: [], matterAudit: [], tasks: [], seq: 0,
  };
}

interface RoomContextValue {
  state: RoomState;
  dispatch: Dispatch<RoomAction>;
  profile: MatterProfile;
  vm: RoomViewModel;
  baselineVm: RoomViewModel;
  /** URL-backed surface helpers (push history so Back closes). */
  open: (kind: string, param?: string | null) => void;
  openWorkflow: (defId: string) => void;
  openConfirm: (kind: ConfirmKind) => void;
  closeConfirm: () => void;
  close: () => void;
}

const RoomContext = createContext<RoomContextValue | null>(null);

function currentSearch(state: RoomState): string {
  if (state.panel) return surfaceToSearch({ panel: state.panel, workflow: null, confirm: null });
  if (state.drawerOpen && state.activeDefId) return surfaceToSearch({ panel: null, workflow: state.activeDefId, confirm: state.confirm });
  return "";
}

export function MatterRoomProvider({ seedMatter, children }: { seedMatter: Matter; children: ReactNode }) {
  const [state, dispatch] = useReducer(roomReducer, seedMatter, makeInitial);
  const profile = useMemo(() => buildMatterProfile(state.matter), [state.matter]);
  const vm = useMemo(() => toRoomViewModel(profile, state.matter), [profile, state.matter]);
  const baselineVm = useMemo(() => toRoomViewModel(buildMatterProfile(state.baseline), state.baseline), [state.baseline]);

  const reconcile = useCallback(() => {
    const { panel, workflow, confirm } = parseMatterUrl(window.location.search);
    if (panel) { dispatch({ type: "open-panel", panel }); return; }
    if (workflow) {
      dispatch({ type: "open-workflow", defId: workflow });
      dispatch({ type: "create-instance" });
      dispatch(confirm ? { type: "open-confirm", kind: confirm } : { type: "close-confirm" });
      return;
    }
    dispatch({ type: "close-panel" });
    dispatch({ type: "close-drawer" });
    dispatch({ type: "close-confirm" });
  }, []);

  // deep-link restore on mount
  useEffect(() => { reconcile(); }, [reconcile]);
  // reconcile on back/forward navigation
  useEffect(() => {
    window.addEventListener("popstate", reconcile);
    return () => window.removeEventListener("popstate", reconcile);
  }, [reconcile]);

  const open = useCallback((kind: string, param?: string | null) => {
    const panel = { kind: kind as PanelState["kind"], param: param ?? null };
    const search = surfaceToSearch({ panel, workflow: null });
    window.history.pushState({ lawme: true }, "", window.location.pathname + search);
    dispatch({ type: "open-panel", panel });
  }, []);

  const openWorkflow = useCallback((defId: string) => {
    const search = surfaceToSearch({ panel: null, workflow: defId });
    window.history.pushState({ lawme: true }, "", window.location.pathname + search);
    dispatch({ type: "open-workflow", defId });
    dispatch({ type: "create-instance" });
  }, []);

  const openConfirm = useCallback((kind: ConfirmKind) => {
    const url = new URL(window.location.href);
    url.searchParams.set("confirm", kind);
    window.history.pushState({ lawme: true }, "", url.pathname + url.search);
    dispatch({ type: "open-confirm", kind });
  }, []);

  const closeConfirm = useCallback(() => {
    if (window.history.state && (window.history.state as { lawme?: boolean }).lawme) {
      window.history.back();
    } else {
      const url = new URL(window.location.href);
      url.searchParams.delete("confirm");
      window.history.replaceState(null, "", url.pathname + url.search);
      dispatch({ type: "close-confirm" });
    }
  }, []);

  const close = useCallback(() => {
    if (window.history.state && (window.history.state as { lawme?: boolean }).lawme) {
      window.history.back(); // unwind our pushed entry → popstate reconciles
    } else {
      window.history.replaceState(null, "", window.location.pathname);
      dispatch({ type: "close-panel" });
      dispatch({ type: "close-drawer" });
    }
  }, []);

  // keep the URL honest if the surface changed via a non-history path (e.g. workflow completing)
  useEffect(() => {
    const want = currentSearch(state);
    const have = window.location.search;
    if (!want && have && !(window.history.state && (window.history.state as { lawme?: boolean }).lawme)) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [state]);

  return (
    <RoomContext.Provider value={{ state, dispatch, profile, vm, baselineVm, open, openWorkflow, openConfirm, closeConfirm, close }}>
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoom must be used within <MatterRoomProvider>");
  return ctx;
}
