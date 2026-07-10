"use client";

import { useState } from "react";
import { AIMark, StatusText } from "@/design-system/primitives/indicators";
import { cx } from "@/design-system/utils/cx";
import { TEAM_CAPACITY } from "../office";
import { SectionHeading } from "./section-heading";

const LOAD_FILL: Record<string, string> = {
  urgent: "bg-status-urgent",
  risk: "bg-status-risk",
  scheduled: "bg-status-scheduled",
  completed: "bg-status-completed",
};

/** The capacity gauge — a machined bar with the 80% overload tick. */
function CapacityGauge({ load, status }: { load: number; status: string }) {
  const pct = Math.round(load * 100);
  return (
    <div
      role="img"
      aria-label={`עומס ${pct}%`}
      className="relative h-2 w-full overflow-hidden rounded-pill bg-surface-sunken"
    >
      <span
        className={cx("block h-full rounded-pill", LOAD_FILL[status] ?? "bg-status-progress")}
        style={{ width: `${pct}%` }}
      />
      {/* the overload threshold */}
      <span
        aria-hidden
        className="absolute inset-y-0 w-px bg-ink-900/30"
        style={{ insetInlineStart: "80%" }}
      />
    </div>
  );
}

/**
 * Team & Workload — the firm's capacity instrument. Who is loaded,
 * who is free, who is blocked, and what דינו suggests moving.
 * Presence and capacity for legal work — not an HR dashboard.
 */
export function TeamWorkload() {
  const [selected, setSelected] = useState(TEAM_CAPACITY[0].id);
  const active = TEAM_CAPACITY.find((m) => m.id === selected) ?? TEAM_CAPACITY[0];

  return (
    <section id="section-team" aria-label="הצוות והעומס">
      <SectionHeading
        title="הצוות והעומס"
        caption="קיבולת מבצעית לעבודה משפטית · עכשיו"
      />

      <div className="surface-paper-raised mt-6 rounded-xl">
        {/* the bench — one column per member */}
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {TEAM_CAPACITY.map((member, i) => {
            const isSelected = member.id === selected;
            const pct = Math.round(member.load * 100);
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => setSelected(member.id)}
                aria-pressed={isSelected}
                data-live={isSelected || undefined}
                className={cx(
                  "living-edge relative flex min-w-0 flex-col gap-3 p-5 text-start transition-colors md:p-6",
                  isSelected ? "bg-gold-100/30" : "hover:bg-surface-sunken/40",
                  i > 0 && "border-s border-line/60",
                )}
                style={{ transitionDuration: "var(--motion-quick)" }}
              >
                {isSelected ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-5 top-0 h-0.5 rounded-pill bg-gold-500/80"
                  />
                ) : null}
                <span className="flex items-center gap-3">
                  <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-ink-900 text-small font-medium text-paper-0 shadow-seat">
                    {member.initial}
                    <span
                      aria-hidden
                      className={cx(
                        "absolute -bottom-0.5 -start-0.5 h-3 w-3 rounded-pill ring-2 ring-surface-raised",
                        member.state === "available"
                          ? "bg-status-completed"
                          : member.state === "in-hearing"
                            ? "bg-status-scheduled"
                            : "bg-status-urgent",
                      )}
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-small font-semibold text-foreground">
                      {member.name}
                    </span>
                    <span className="block truncate text-micro text-foreground-faint">
                      {member.role}
                    </span>
                  </span>
                </span>

                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-heading font-bold tracking-tight tabular-nums text-foreground">
                    {pct}%
                  </span>
                  <StatusText status={member.status} className="text-micro">
                    {member.stateLabel}
                  </StatusText>
                </span>
                <CapacityGauge load={member.load} status={member.status} />

                <span className="flex flex-wrap gap-x-3 gap-y-1 text-micro text-foreground-faint">
                  <span>{member.matters} תיקים</span>
                  {member.criticalDeadlines > 0 ? (
                    <span className="font-medium text-status-urgent">
                      {member.criticalDeadlines} מועדים קריטיים
                    </span>
                  ) : null}
                  {member.overdueTasks > 0 ? (
                    <span className="font-medium text-status-risk">
                      {member.overdueTasks} באיחור
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>

        {/* the selected member — one operational line + דינו's move */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line/60 px-5 py-4 md:px-6">
          <p className="min-w-0 flex-1 text-small text-foreground">
            <span className="font-semibold">{active.name}</span>
            <span className="text-foreground-soft"> — {active.line}</span>
            {active.blocker ? (
              <span className="mt-0.5 block text-caption text-status-risk">
                חסימה: {active.blocker}
              </span>
            ) : null}
          </p>
          {active.suggestion ? (
            <p className="flex min-w-0 items-center gap-1.5 text-caption text-foreground-soft">
              <AIMark />
              <span className="min-w-0">{active.suggestion}</span>
            </p>
          ) : null}
          <button
            type="button"
            className="shrink-0 rounded-xs text-caption font-semibold text-gold-700 transition-colors hover:text-gold-600"
            style={{ transitionDuration: "var(--motion-quick)" }}
          >
            {active.suggestion ? "העבר משימה ←" : "פתח יומן ←"}
          </button>
        </div>
      </div>
    </section>
  );
}
