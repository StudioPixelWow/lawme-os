import { MatterRoomProvider } from "./room-store";
import { RoomShell } from "./room-shell";
import { IdentityHero } from "./objects/identity-hero";
import { Briefing } from "./objects/briefing";
import { MilestoneSpine } from "./objects/milestone-spine";
import { Blocker } from "./objects/operational-focus";
import { ScoreRail } from "./objects/score-rail";
import { DinoSeal } from "./objects/dino-seal";
import type { RoomViewModel } from "./types";

/**
 * The Matter Room — the complete first viewport.
 * A server component that seeds the client store and composes the room as one
 * connected working surface, in a single reading order: identity (a compact navy
 * band) → situation + next move (on the gold meridian) → the milestone backbone
 * → the operational blocker beside a calm diagnostic → a near-invisible Dino
 * line. Everything is derived by the adapter from the engines.
 */
export function MatterRoom({ vm }: { vm: RoomViewModel }) {
  return (
    <MatterRoomProvider matterId={vm.identity.matterId}>
      <RoomShell ariaLabel={`תיק: ${vm.identity.titleHe}`}>
        <IdentityHero identity={vm.identity} posture={vm.posture} review={vm.review} />

        <Briefing
          briefingHe={vm.briefingHe}
          action={vm.action}
          deadline={vm.deadline}
          review={vm.review}
        />

        <MilestoneSpine spine={vm.spine} />

        <section className="mt-10 border-t border-ink-900/10 pt-8" aria-label="מוקד תפעולי ואבחון">
          <div className="grid gap-10 md:grid-cols-[1.5fr_1fr] md:gap-14">
            {vm.blocker ? <Blocker blocker={vm.blocker} /> : <div />}
            <ScoreRail rail={vm.scoreRail} />
          </div>
        </section>

        {vm.dino ? (
          <div className="mt-8 border-t border-ink-900/10 pt-5">
            <DinoSeal dino={vm.dino} />
          </div>
        ) : null}

        <p className="mt-6 text-micro text-foreground-faint">
          {vm.stale ? "נתונים לא עדכניים · " : ""}
          עודכן {vm.updatedHe}
        </p>
      </RoomShell>
    </MatterRoomProvider>
  );
}
