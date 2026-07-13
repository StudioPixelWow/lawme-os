import { MatterRoomProvider } from "./room-store";
import { RoomShell } from "./room-shell";
import { DecisionCore } from "./objects/decision-core";
import type { RoomViewModel } from "./types";

/**
 * The Matter Room.
 * A server component: it seeds the client store with the open matter, wraps the
 * room in its client boundary, and renders its single hero — the Decision Core.
 * The room is the Decision Core. Every other region (the Milestone Spine, the
 * context surfaces) waits until the Core creates an instant, honest WOW.
 */
export function MatterRoom({ vm }: { vm: RoomViewModel }) {
  return (
    <MatterRoomProvider matterId={vm.decisionCore.matterId}>
      <RoomShell ariaLabel={`תיק: ${vm.decisionCore.titleHe}`}>
        <DecisionCore vm={vm.decisionCore} />
      </RoomShell>
    </MatterRoomProvider>
  );
}
