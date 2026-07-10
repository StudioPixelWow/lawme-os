import Link from "next/link";
import {
  BriefcaseGlyph,
  CalendarGlyph,
  TaskGlyph,
} from "@/design-system/icons/glyphs";
import { IconContainer } from "@/design-system/primitives/icon-container";
import { AIMark, StateLine, StatusText } from "@/design-system/primitives/indicators";
import { cx } from "@/design-system/utils/cx";
import { ACTIVE_MATTERS } from "../data";
import { MatterHealth } from "./matter-health";
import { SectionHeading } from "./section-heading";

/**
 * התיקים הפעילים — THE main workspace: a full-width operational
 * command center. Each matter is a living operational surface:
 * identity · Matter Health · next hearing/task · עמית's note ·
 * team, files, workload · one main CTA.
 */
export function ActiveMattersSection() {
  return (
    <section aria-label="התיקים הפעילים">
      <SectionHeading
        title="התיקים הפעילים"
        caption="5 תיקים · ממוינים לפי מה שדורש אותך קודם"
        href="/matters"
        linkLabel="כל התיקים"
      />

      <div className="surface-paper-raised mt-6 rounded-xl">
        {ACTIVE_MATTERS.map((matter, index) => (
          <article
            key={matter.id}
            className={cx(
              "group relative p-6 transition-colors hover:bg-surface-sunken/40 md:p-7",
              index > 0 && "border-t border-line/60",
            )}
            style={{ transitionDuration: "var(--motion-quick)" }}
          >
            <StateLine status={matter.status} />

            {/* identity row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <IconContainer
                variant={matter.status === "urgent" ? "urgent" : "navy"}
                size="md"
                interactive
              >
                <BriefcaseGlyph size={17} />
              </IconContainer>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h3 className="text-subheading font-semibold tracking-tight text-foreground">
                    {matter.name}
                  </h3>
                  <StatusText status={matter.status}>
                    {matter.statusLabel}
                  </StatusText>
                </div>
                <p className="mt-0.5 truncate text-caption text-foreground-soft">
                  {matter.client} · {matter.practiceArea} · שלב: {matter.stage}
                </p>
              </div>
              <Link
                href="/matters"
                className="hidden h-10 shrink-0 items-center rounded-md bg-ink-900 px-5 text-small font-medium text-paper-0 shadow-raised transition-all hover:-translate-y-px hover:bg-ink-800 hover:shadow-lift sm:inline-flex"
                style={{ transitionDuration: "var(--motion-quick)" }}
              >
                {matter.action}
              </Link>
            </div>

            {/* עמית's micro-intelligence line */}
            <p className="mt-4 flex items-start gap-2 border-s-2 border-accent ps-3 text-small leading-relaxed text-foreground-soft">
              <AIMark className="mt-1" />
              <span className="min-w-0">{matter.aiNote}</span>
            </p>

            {/* operational band: health · next · logistics */}
            <div className="mt-5 flex flex-wrap items-center gap-x-10 gap-y-4">
              <MatterHealth matter={matter} />

              <dl className="flex min-w-0 flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-caption text-foreground-soft">
                  <CalendarGlyph size={13} className="shrink-0 text-foreground-faint" />
                  <dt className="text-foreground-faint">הבא:</dt>
                  <dd className="truncate font-medium text-foreground">
                    {matter.nextEvent}
                  </dd>
                </div>
                <div className="flex items-center gap-1.5 text-caption text-foreground-soft">
                  <TaskGlyph size={13} className="shrink-0 text-foreground-faint" />
                  <dt className="text-foreground-faint">משימה:</dt>
                  <dd className="truncate">{matter.nextTask}</dd>
                </div>
              </dl>

              <div className="ms-auto flex items-center gap-5 text-micro text-foreground-faint">
                <span className="flex items-center gap-1.5" title={matter.team.join(", ")}>
                  <span className="flex -space-x-1.5 space-x-reverse" dir="ltr">
                    {matter.team.map((member) => (
                      <span
                        key={member}
                        className="flex h-6 w-6 items-center justify-center rounded-pill bg-ink-900 text-micro text-paper-0 shadow-seat ring-2 ring-surface-raised"
                      >
                        {member[0]}
                      </span>
                    ))}
                  </span>
                </span>
                <span className="tabular-nums">{matter.files} קבצים</span>
                <span>{matter.workload}</span>
                <span>עדכון {matter.lastUpdate}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
