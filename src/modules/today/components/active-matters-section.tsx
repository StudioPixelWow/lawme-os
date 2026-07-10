import Link from "next/link";
import { BriefcaseGlyph, CalendarGlyph, TaskGlyph } from "@/design-system/icons/glyphs";
import { IconContainer } from "@/design-system/primitives/icon-container";
import {
  AIMark,
  StateLine,
  StatusText,
} from "@/design-system/primitives/indicators";
import { cx } from "@/design-system/utils/cx";
import { ACTIVE_MATTERS } from "../data";
import { MatterHealth } from "./matter-health";
import { SectionHeading } from "./section-heading";

/**
 * התיקים הפעילים — the full-width command center. Each matter is a
 * premium operational dossier in three layers: identity → health →
 * action. The matter tied to today's mission carries the gold
 * meridian at its start edge.
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
        {ACTIVE_MATTERS.map((matter, index) => {
          const missionMatter = matter.id === "m-1";
          return (
            <article
              key={matter.id}
              className={cx(
                "group relative p-7 transition-colors hover:bg-surface-sunken/40",
                missionMatter ? "bg-gold-100/25 md:p-9" : "md:p-8",
                index > 0 && "border-t border-line/60",
              )}
              style={{ transitionDuration: "var(--motion-quick)" }}
            >
              {missionMatter ? (
                <span
                  aria-hidden
                  className="absolute inset-y-6 start-0 w-0.5 rounded-pill bg-gold-500"
                  title="המשימה של היום"
                />
              ) : (
                <StateLine status={matter.status} />
              )}

              {/* layer 1 — identity */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <IconContainer
                  variant={missionMatter ? "gold" : "navy"}
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
                  <p className="mt-1 truncate text-caption text-foreground-soft">
                    {matter.client} · {matter.practiceArea} · {matter.stage} ·
                    עו״ד {matter.owner}
                  </p>
                </div>
                {/* layer 3 — the action */}
                <Link
                  href="/matters"
                  className="hidden h-10 shrink-0 items-center rounded-md bg-ink-900 px-5 text-small font-medium text-paper-0 shadow-raised transition-all hover:-translate-y-px hover:bg-ink-800 hover:shadow-lift sm:inline-flex"
                  style={{ transitionDuration: "var(--motion-quick)" }}
                >
                  {matter.action}
                </Link>
              </div>

              {/* layer 2 — health */}
              <div className="mt-6 flex flex-wrap items-center gap-x-12 gap-y-5">
                <MatterHealth matter={matter} />
                <dl className="flex min-w-0 flex-col gap-2">
                  <div className="flex items-center gap-2 text-caption">
                    <CalendarGlyph
                      size={13}
                      className="shrink-0 text-foreground-faint"
                    />
                    <dt className="text-foreground-faint">הבא:</dt>
                    <dd className="truncate font-medium text-foreground">
                      {matter.nextEvent}
                    </dd>
                  </div>
                  <div className="flex items-center gap-2 text-caption">
                    <TaskGlyph
                      size={13}
                      className="shrink-0 text-foreground-faint"
                    />
                    <dt className="text-foreground-faint">משימה:</dt>
                    <dd className="truncate text-foreground-soft">
                      {matter.nextTask}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* עמית's note — quiet, meridian-marked */}
              <p className="mt-5 flex max-w-3xl items-start gap-2 border-s-2 border-accent ps-3 text-small leading-relaxed text-pretty text-foreground-soft">
                <AIMark className="mt-1 shrink-0" />
                <span className="min-w-0">{matter.aiNote}</span>
              </p>

              {/* progressive disclosure — secondary details on demand */}
              <details className="group/details mt-4">
                <summary
                  className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-xs text-micro font-medium text-foreground-faint transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden"
                  style={{ transitionDuration: "var(--motion-quick)" }}
                >
                  פרטים נוספים
                  <span
                    aria-hidden
                    className="transition-transform group-open/details:rotate-90"
                  >
                    ‹
                  </span>
                </summary>
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                  <Link
                    href="/documents"
                    className="rounded-xs text-micro font-medium text-foreground-soft hover:text-foreground"
                  >
                    {matter.files} קבצים ←
                  </Link>
                  <Link
                    href="/calendar"
                    className="rounded-xs text-micro font-medium text-foreground-soft hover:text-foreground"
                  >
                    {matter.workload} ←
                  </Link>
                  <span className="text-micro text-foreground-faint">
                    עדכון אחרון: {matter.lastUpdate}
                  </span>
                  <span className="text-micro text-foreground-faint">
                    צוות: {matter.team.join(", ")}
                  </span>
                </div>
              </details>
            </article>
          );
        })}
      </div>
    </section>
  );
}
