import { MatterRoomProvider } from "./room-store";
import { RoomShell } from "./room-shell";
import { IdentityHero } from "./objects/identity-hero";
import { DecisionArea } from "./objects/decision-area";
import { MilestoneSpine } from "./objects/milestone-spine";
import { BlockerCard } from "./objects/operational-focus";
import { ActionCard } from "./objects/action-card";
import { ScoreRail } from "./objects/score-rail";
import { DinoSeal } from "./objects/dino-seal";
import type { RoomViewModel } from "./types";

/**
 * The Matter Room — the approved concept.
 * A server component that seeds the client store and composes the room exactly
 * as approved: the navy identity hero, the decision area (deadline · state ·
 * next action), the milestone spine, and the four operational cards (blocker,
 * action, diagnostic, Dino). Everything is derived by the adapter from the
 * engines.
 */
export function MatterRoom({ vm }: { vm: RoomViewModel }) {
  return (
    <MatterRoomProvider matterId={vm.identity.matterId}>
      <RoomShell ariaLabel={`תיק: ${vm.identity.titleHe}`}>
        <IdentityHero identity={vm.identity} posture={vm.posture} review={vm.review} />

        <DecisionArea briefingHe={vm.briefingHe} deadline={vm.deadline} action={vm.action} />

        <MilestoneSpine spine={vm.spine} />

        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {vm.blocker ? <BlockerCard blocker={vm.blocker} /> : null}
          {vm.action ? <ActionCard action={vm.action} /> : null}
          <ScoreRail rail={vm.scoreRail} />
          {vm.dino ? <DinoSeal dino={vm.dino} /> : null}
        </div>

        <p className="mt-6 text-micro text-foreground-faint">
          {vm.stale ? "נתונים לא עדכניים · " : ""}
          עודכן {vm.updatedHe}
        </p>
      </RoomShell>
    </MatterRoomProvider>
  );
}
