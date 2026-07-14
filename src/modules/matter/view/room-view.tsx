"use client";

/**
 * Matter App — the live room view (Sprint 2).
 * Composes the approved Matter Room from the LIVE view-model in the store, so
 * the moment the Missing-Evidence workflow files evidence the whole room
 * re-renders from the engine's recomputation — blocker gone, milestone
 * unblocked, diagnostic greener. Adds the workflow entry (on the blocker),
 * the workflow drawer, and a quiet post-resolution summary strip.
 */
import { cx } from "@/design-system/utils/cx";
import { CheckGlyph, HistoryGlyph } from "@/design-system/icons/glyphs";
import { RoomShell } from "./room-shell";
import { useRoom } from "./room-store";
import { IdentityHero } from "./objects/identity-hero";
import { DecisionArea } from "./objects/decision-area";
import { MilestoneSpine } from "./objects/milestone-spine";
import { BlockerCard } from "./objects/operational-focus";
import { ActionCard } from "./objects/action-card";
import { ScoreRail } from "./objects/score-rail";
import { DinoSeal } from "./objects/dino-seal";
import { WorkflowDrawer } from "./objects/workflow-drawer";
import { applicableWorkflows } from "../workflow/registry";
import { describeHealthDelta, greenCount } from "./health-delta";

export function RoomView() {
  const { state, dispatch, vm } = useRoom();
  const resolved = state.instance?.status === "completed";
  const workflowId = applicableWorkflows(state.baseline)[0]?.id ?? state.instance?.definitionId ?? null;

  return (
    <RoomShell ariaLabel={`תיק: ${vm.identity.titleHe}`}>
      <IdentityHero identity={vm.identity} posture={vm.posture} review={vm.review} />

      {resolved && <HealthStrip onOpenLog={() => dispatch({ type: "open-drawer" })} />}

      <DecisionArea briefingHe={vm.briefingHe} deadline={vm.deadline} action={vm.action} />

      <MilestoneSpine spine={vm.spine} />

      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {vm.blocker ? (
          <BlockerCard
            blocker={vm.blocker}
            onAction={workflowId ? () => dispatch({ type: "open-workflow", defId: workflowId }) : undefined}
          />
        ) : null}
        {vm.action ? <ActionCard action={vm.action} /> : null}
        <ScoreRail rail={vm.scoreRail} />
        {vm.dino ? <DinoSeal dino={vm.dino} /> : null}
      </div>

      <p className="mt-6 text-micro text-foreground-faint">
        {vm.stale ? "נתונים לא עדכניים · " : ""}
        עודכן {vm.updatedHe}
      </p>

      <WorkflowDrawer />
    </RoomShell>
  );
}

function HealthStrip({ onOpenLog }: { onOpenLog: () => void }) {
  const { vm, baselineVm } = useRoom();
  const changes = describeHealthDelta(baselineVm, vm);
  const greens = greenCount(vm);

  return (
    <section
      className="mt-6 rounded-xl border border-status-completed/30 bg-status-completed-wash/50 p-4 md:p-5"
      aria-label="התיק נעשה בריא יותר"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-pill bg-status-completed text-paper-0">
            <CheckGlyph size={16} />
          </span>
          <div>
            <h2 className="text-body font-semibold text-foreground">התיק נעשה בריא יותר</h2>
            <p className="text-caption text-foreground-soft">
              החסם הראייתי טופל — האינטליגנציה חושבה מחדש ({greens} מתוך 5 ממדים תקינים).
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenLog}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-sm px-3 py-2 text-caption font-medium text-foreground-soft shadow-hairline transition-colors hover:bg-surface"
        >
          <HistoryGlyph size={13} /> יומן הביקורת
        </button>
      </div>

      {changes.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2 border-t border-status-completed/20 pt-3">
          {changes.map((c, i) => (
            <li
              key={i}
              className={cx(
                "inline-flex items-center gap-1.5 rounded-pill bg-surface/80 px-2.5 py-1",
                "text-caption text-foreground-soft shadow-hairline",
              )}
            >
              <CheckGlyph size={11} className="text-status-completed" />
              {c.labelHe}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
