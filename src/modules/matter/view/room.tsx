import { MatterRoomProvider } from "./room-store";
import { RoomView } from "./room-view";
import type { Matter } from "../types";

/**
 * The Matter Room — the approved concept, now live (Sprint 2).
 * A server component that seeds the client store with the source matter and
 * hands rendering to the live room view. The store computes the presentation
 * view-model through the real intelligence engine, so an interaction that
 * mutates the matter (the Missing-Evidence workflow) recomputes the entire room
 * automatically — no manual refresh, no fake state.
 */
export function MatterRoom({ matter }: { matter: Matter }) {
  return (
    <MatterRoomProvider seedMatter={matter}>
      <RoomView />
    </MatterRoomProvider>
  );
}
