import { MatterRoomProvider } from "./room-store";
import { RoomShell } from "./room-shell";
import { IdentityHero } from "./objects/identity-hero";
import { MatterBrief } from "./objects/matter-brief";
import { MilestoneSpine } from "./objects/milestone-spine";
import { OperationalFocus } from "./objects/operational-focus";
import { ScoreRail } from "./objects/score-rail";
import { DinoSeal } from "./objects/dino-seal";
import type { RoomViewModel } from "./types";

/**
 * The Matter Room — the complete first viewport.
 * A server component that seeds the client store with the open matter and
 * composes the room as one spatial experience (not a card grid): a navy
 * identity hero, the state brief, the milestone spine on the gold meridian, the
 * operational focus (blocker + next move), and the intelligence summary (score
 * rail + Dino seal). Everything is derived by the adapter from the engines.
 */
export function MatterRoom({ vm }: { vm: RoomViewModel }) {
  return (
    <MatterRoomProvider matterId={vm.identity.matterId}>
      <RoomShell ariaLabel={`תיק: ${vm.identity.titleHe}`}>
        <IdentityHero identity={vm.identity} posture={vm.posture} review={vm.review} />

        <MatterBrief narrativeHe={vm.narrativeHe} deadline={vm.deadline} review={vm.review} />

        <MilestoneSpine spine={vm.spine} />

        <OperationalFocus blocker={vm.blocker} action={vm.action} />

        <section className="mt-10 border-t border-ink-900/10 pt-8" aria-label="סיכום מודיעין">
          <div className="grid gap-8 md:grid-cols-[1.3fr_1fr] md:gap-10">
            <ScoreRail rail={vm.scoreRail} />
            {vm.dino ? <DinoSeal dino={vm.dino} /> : null}
          </div>
        </section>

        <p className="mt-8 text-micro text-foreground-faint">
          {vm.stale ? "נתונים לא עדכניים · " : ""}
          עודכן {vm.updatedHe}
        </p>
      </RoomShell>
    </MatterRoomProvider>
  );
}
