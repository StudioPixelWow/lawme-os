"use client";

/**
 * Matter App — client view-state store (Sprint 2.1: the workflow engine).
 *
 * Holds the LIVE matter and the active workflow INSTANCE. All lifecycle logic
 * lives in the pure engine; the store only threads events into it and recomputes
 * the presentation view-model through the real intelligence engine whenever the
 * engine reports the matter changed (approve/complete/reopen). One source of
 * truth, no duplicated workflow logic, no manual refresh.
 */
import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import { buildMatterProfile } from "@/modules/matter";
import { toRoomViewModel } from "./adapter";
import type { RoomViewModel } from "./types";
import type { Matter } from "../types";
import {
  applyEvent,
  createInstance,
  type WorkflowEvent,
  type WorkflowInstance,
} from "../workflow/engine";
import { findWorkflow } from "../workflow/registry";

export interface RoomState {
  matterId: string;
  matter: Matter;
  baseline: Matter;
  /** the workflow the drawer is currently focused on (may pre-date the instance). */
  activeDefId: string | null;
  /** the live workflow instance, once created. */
  instance: WorkflowInstance | null;
  drawerOpen: boolean;
}

export type RoomAction =
  | { type: "open-workflow"; defId: string }
  | { type: "create-instance" }
  | { type: "wf"; event: WorkflowEvent }
  | { type: "open-drawer" }
  | { type: "close-drawer" }
  | { type: "reset" };

function roomReducer(state: RoomState, action: RoomAction): RoomState {
  switch (action.type) {
    case "open-workflow": {
      const def = findWorkflow(action.defId);
      if (!def || !def.detect(state.matter)) return state;
      // if an instance for this workflow already exists, just reopen the drawer
      if (state.instance && state.instance.definitionId === action.defId) {
        return { ...state, activeDefId: action.defId, drawerOpen: true };
      }
      return { ...state, activeDefId: action.defId, instance: null, drawerOpen: true };
    }

    case "create-instance": {
      const def = findWorkflow(state.activeDefId);
      if (!def) return state;
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
      return state.instance ? { ...state, drawerOpen: true } : state;

    case "close-drawer":
      return { ...state, drawerOpen: false };

    case "reset":
      return makeInitial(state.baseline);

    default:
      return state;
  }
}

function makeInitial(matter: Matter): RoomState {
  return {
    matterId: matter.id,
    matter,
    baseline: matter,
    activeDefId: null,
    instance: null,
    drawerOpen: false,
  };
}

interface RoomContextValue {
  state: RoomState;
  dispatch: Dispatch<RoomAction>;
  vm: RoomViewModel;
  baselineVm: RoomViewModel;
}

const RoomContext = createContext<RoomContextValue | null>(null);

export function MatterRoomProvider({
  seedMatter,
  children,
}: {
  seedMatter: Matter;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(roomReducer, seedMatter, makeInitial);
  const vm = useMemo(() => toRoomViewModel(buildMatterProfile(state.matter), state.matter), [state.matter]);
  const baselineVm = useMemo(
    () => toRoomViewModel(buildMatterProfile(state.baseline), state.baseline),
    [state.baseline],
  );
  return (
    <RoomContext.Provider value={{ state, dispatch, vm, baselineVm }}>{children}</RoomContext.Provider>
  );
}

export function useRoom(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (!ctx) {
    throw new Error("useRoom must be used within <MatterRoomProvider>");
  }
  return ctx;
}
