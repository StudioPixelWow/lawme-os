"use client";

/**
 * Matter App — client view-state store (Sprint 1).
 * The client-state seam for the room, established early so every interactive
 * object built in later sprints reads one source of truth. Sprint 1 anchors the
 * open matter's id; the reducer grows with the interactions that need it.
 * Mirrors the shell's provider pattern (React context + useReducer).
 */
import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";

export interface RoomState {
  /** the matter currently open in the room */
  matterId: string;
}

export type RoomAction = { type: "open-matter"; matterId: string };

function roomReducer(state: RoomState, action: RoomAction): RoomState {
  switch (action.type) {
    case "open-matter":
      return state.matterId === action.matterId ? state : { ...state, matterId: action.matterId };
    default:
      return state;
  }
}

interface RoomContextValue {
  state: RoomState;
  dispatch: Dispatch<RoomAction>;
}

const RoomContext = createContext<RoomContextValue | null>(null);

export function MatterRoomProvider({
  matterId,
  children,
}: {
  matterId: string;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(roomReducer, { matterId });
  return <RoomContext.Provider value={{ state, dispatch }}>{children}</RoomContext.Provider>;
}

export function useRoom(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (!ctx) {
    throw new Error("useRoom must be used within <MatterRoomProvider>");
  }
  return ctx;
}
