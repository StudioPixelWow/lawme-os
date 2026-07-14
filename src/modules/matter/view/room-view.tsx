"use client";

/**
 * Matter App — the live room view (Sprint 3.2: the interaction pass).
 * Composes the approved Matter Room from the live view-model and makes every
 * visible object a real action: each opens its contextual panel (URL-backed) or
 * launches the workflow. The Matter stays visible behind every drawer.
 */
import { cx } from "@/design-system/utils/cx";
import { CheckGlyph, HistoryGlyph, ChatGlyph } from "@/design-system/icons/glyphs";
import type { ActivityEntry } from "../activity/activity";
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
import { PanelHost } from "./panels/panel-host";
import { ConfirmDialog } from "./panels/confirm-dialog";
import { describeHealthDelta, greenCount } from "./health-delta";
import { deriveActivity } from "../activity/activity";

export function RoomView() {
  const { state, dispatch, vm, baselineVm, open } = useRoom();
  const changes = describeHealthDelta(baselineVm, vm);
  const improved = state.instance?.status === "completed" && changes.length > 0;
  const workflowActivity = state.instance ? deriveActivity(state.instance, changes) : [];
  const activity: ActivityEntry[] = [...workflowActivity, ...state.matterActivity];

  return (
    <RoomShell ariaLabel={`תיק: ${vm.identity.titleHe}`}>
      <IdentityHero identity={vm.identity} posture={vm.posture} review={vm.review} open={open} />

      {improved && <HealthStrip onOpenLog={() => dispatch({ type: "open-drawer" })} />}
      {activity.length > 0 && <ActivitySurface activity={activity} onOpen={() => dispatch({ type: "open-drawer" })} />}

      <DecisionArea briefingHe={vm.briefingHe} deadline={vm.deadline} action={vm.action} open={open} />

      <MilestoneSpine spine={vm.spine} open={open} />

      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {vm.blocker ? <BlockerCard blocker={vm.blocker} onAction={() => open("blocker")} /> : null}
        {vm.action ? <ActionCard action={vm.action} onStart={() => open("action")} /> : null}
        <ScoreRail rail={vm.scoreRail} open={open} />
        {vm.dino ? <DinoSeal dino={vm.dino} open={open} /> : null}
      </div>

      <p className="mt-6 flex items-center gap-2 text-micro text-foreground-faint">
        <span>{vm.stale ? "נתונים לא עדכניים · " : ""}עודכן {vm.updatedHe}</span>
        <button type="button" onClick={() => open("provenance")} className="rounded-sm underline transition-colors hover:text-foreground-soft">
          מקורות הנתונים
        </button>
      </p>

      <WorkflowDrawer />
      <PanelHost />
      <ConfirmDialog />
    </RoomShell>
  );
}

const ACTIVITY_DOT: Record<ActivityEntry["tone"], string> = {
  info: "bg-status-scheduled",
  progress: "bg-status-progress",
  success: "bg-status-completed",
  warn: "bg-status-risk",
};

function ActivitySurface({ activity, onOpen }: { activity: ActivityEntry[]; onOpen: () => void }) {
  return (
    <section className="mt-6 rounded-xl border border-line-strong bg-surface p-4 shadow-lift md:p-5" aria-label="פעילות בתיק">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-caption font-semibold text-foreground-soft">
          <ChatGlyph size={14} /> פעילות בתיק
        </h2>
        <button type="button" onClick={onOpen} className="rounded-sm text-caption text-foreground-faint transition-colors hover:text-foreground-soft">
          פתח את המשימה <span aria-hidden>‹</span>
        </button>
      </div>
      <ol className="space-y-2">
        {activity.map((a) => (
          <li key={a.id} className="flex items-start gap-2.5 text-small">
            <span className={cx("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-pill", ACTIVITY_DOT[a.tone])} />
            <span className="text-foreground-soft">{a.textHe}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function HealthStrip({ onOpenLog }: { onOpenLog: () => void }) {
  const { vm, baselineVm } = useRoom();
  const changes = describeHealthDelta(baselineVm, vm);
  const greens = greenCount(vm);

  return (
    <section className="mt-6 rounded-xl border border-status-completed/30 bg-status-completed-wash/50 p-4 md:p-5" aria-label="התיק נעשה בריא יותר">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-pill bg-status-completed text-paper-0">
            <CheckGlyph size={16} />
          </span>
          <div>
            <h2 className="text-body font-semibold text-foreground">התיק נעשה בריא יותר</h2>
            <p className="text-caption text-foreground-soft">החסם הראייתי טופל — האינטליגנציה חושבה מחדש ({greens} מתוך 5 ממדים תקינים).</p>
          </div>
        </div>
        <button type="button" onClick={onOpenLog} className="inline-flex shrink-0 items-center gap-1.5 rounded-sm px-3 py-2 text-caption font-medium text-foreground-soft shadow-hairline transition-colors hover:bg-surface">
          <HistoryGlyph size={13} /> יומן הביקורת
        </button>
      </div>
      {changes.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2 border-t border-status-completed/20 pt-3">
          {changes.map((c, i) => (
            <li key={i} className={cx("inline-flex items-center gap-1.5 rounded-pill bg-surface/80 px-2.5 py-1", "text-caption text-foreground-soft shadow-hairline")}>
              <CheckGlyph size={11} className="text-status-completed" />
              {c.labelHe}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
