import { MatterRoomProvider } from "./room-store";
import { RoomShell } from "./room-shell";
import { IdentityHero } from "./objects/identity-hero";
import { Briefing } from "./objects/briefing";
import { MilestoneSpine } from "./objects/milestone-spine";
import { OperationalWorkspace } from "./objects/operational-focus";
import { ScoreRail } from "./objects/score-rail";
import type { RoomViewModel } from "./types";

/**
 * The Matter Room — one continuous workspace, not a stack of sections.
 * A slim identity band, then the partner's briefing on the gold meridian (with
 * Dino quietly supervising in the margin), the legal journey at the center, the
 * operational conversation (why it's blocked → what we do), and a living
 * diagnostic strip. No dividers, no cards fighting each other — one surface, held
 * together by rhythm and the meridian. Everything is derived from the engines.
 */
export function MatterRoom({ vm }: { vm: RoomViewModel }) {
  return (
    <MatterRoomProvider matterId={vm.identity.matterId}>
      <RoomShell ariaLabel={`תיק: ${vm.identity.titleHe}`}>
        <IdentityHero identity={vm.identity} posture={vm.posture} review={vm.review} />

        <Briefing briefingHe={vm.briefingHe} deadline={vm.deadline} dino={vm.dino} />

        <MilestoneSpine spine={vm.spine} />

        <OperationalWorkspace blocker={vm.blocker} action={vm.action} />

        <ScoreRail rail={vm.scoreRail} />

        <p className="mt-10 text-micro text-foreground-faint">
          {vm.stale ? "נתונים לא עדכניים · " : ""}
          עודכן {vm.updatedHe}
        </p>
      </RoomShell>
    </MatterRoomProvider>
  );
}
