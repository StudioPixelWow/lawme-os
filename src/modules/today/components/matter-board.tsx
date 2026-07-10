"use client";

import Link from "next/link";
import {
  BriefcaseGlyph,
  CalendarGlyph,
  DocumentGlyph,
} from "@/design-system/icons/glyphs";
import { IconContainer } from "@/design-system/primitives/icon-container";
import { AIMark } from "@/design-system/primitives/indicators";
import { cx } from "@/design-system/utils/cx";
import type { Matter } from "../data";
import { BOARD } from "../focus";
import { HealthStateChip, MatterSignature } from "./matter-signature";
import { SectionHeading } from "./section-heading";

/** The featured matter — the board's dominant operational object. */
function FeaturedMatter({
  matter,
  selected,
  onSelect,
}: {
  matter: Matter;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <article
      data-live={selected || undefined}
      className={cx(
        "living-edge surface-paper-raised relative flex min-w-0 flex-col rounded-xl p-6 md:p-7",
        selected && "context-halo",
      )}
    >
      {/* the meridian — this is today's matter */}
      <span
        aria-hidden
        className="absolute inset-y-6 start-0 w-0.5 rounded-pill bg-gold-500/80"
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <IconContainer variant="gold" size="lg" interactive>
          <BriefcaseGlyph size={20} />
        </IconContainer>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <button
              type="button"
              onClick={onSelect}
              aria-pressed={selected}
              className="rounded-xs text-start text-heading font-semibold tracking-tight text-foreground transition-colors hover:text-ink-700"
              style={{ transitionDuration: "var(--motion-quick)" }}
            >
              {matter.name}
            </button>
            <HealthStateChip matter={matter} />
          </div>
          <p className="mt-1 truncate text-caption text-foreground-soft">
            {matter.client} · {matter.practiceArea} · עו״ד {matter.owner} ·
            עדכון אחרון {matter.lastUpdate}
          </p>
        </div>
        <Link
          href="/matters"
          className="hidden h-11 shrink-0 items-center rounded-md bg-ink-900 px-6 text-small font-medium text-paper-0 shadow-raised transition-all hover:-translate-y-px hover:bg-ink-800 hover:shadow-lift sm:inline-flex"
          style={{ transitionDuration: "var(--motion-quick)" }}
        >
          {matter.action}
        </Link>
      </div>

      {/* the health signature — the proceeding, visualized */}
      <div className="mt-5">
        <MatterSignature matter={matter} />
      </div>

      {/* the irreversible facts */}
      <dl className="mt-5 flex flex-wrap items-center gap-x-7 gap-y-2.5 border-t border-line/50 pt-4">
        <div className="flex items-center gap-2 text-small">
          <CalendarGlyph size={14} className="shrink-0 text-foreground-faint" />
          <dt className="text-foreground-faint">האירוע הבא:</dt>
          <dd className="font-semibold text-foreground">{matter.nextEvent}</dd>
        </div>
        <div className="flex items-center gap-2 text-small">
          <DocumentGlyph size={14} className="shrink-0 text-foreground-faint" />
          <dt className="text-foreground-faint">מסמכים מוכנים:</dt>
          <dd className="font-medium tabular-nums text-foreground">
            {matter.files}
          </dd>
        </div>
        <div className="flex items-center gap-2 text-small">
          <dt className="text-foreground-faint">עומס היום:</dt>
          <dd className="font-medium text-foreground">{matter.workload}</dd>
        </div>
        <div className="flex items-center gap-2 text-small">
          <dt className="text-foreground-faint">טרם חויב:</dt>
          <dd className="font-medium tabular-nums text-status-scheduled">
            3.5 שעות
          </dd>
        </div>
        <div className="flex items-center gap-2 text-small">
          <dt className="text-foreground-faint">צוות:</dt>
          <dd className="flex items-center gap-1.5">
            <span aria-hidden className="flex -space-x-1.5">
              {matter.team.map((member) => (
                <span
                  key={member}
                  className="flex h-7 w-7 items-center justify-center rounded-pill bg-ink-900 text-micro text-paper-0 ring-2 ring-surface-raised"
                >
                  {member.slice(0, 1)}
                </span>
              ))}
            </span>
          </dd>
        </div>
      </dl>

      {/* דינו's recommendation */}
      <p className="mt-4 flex max-w-3xl items-start gap-2 border-s-2 border-accent ps-3 text-small leading-relaxed text-pretty text-foreground-soft">
        <AIMark className="mt-1 shrink-0" />
        <span className="min-w-0">{matter.aiNote}</span>
      </p>

      {/* progressive disclosure */}
      <details className="group/details mt-4">
        <summary
          className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-xs text-caption font-medium text-foreground-faint transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden"
          style={{ transitionDuration: "var(--motion-quick)" }}
        >
          פרטים נוספים
          <span aria-hidden className="transition-transform group-open/details:rotate-90">
            ‹
          </span>
        </summary>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
          <Link
            href="/documents"
            className="rounded-xs text-caption font-medium text-foreground-soft hover:text-foreground"
          >
            {matter.files} קבצים ←
          </Link>
          <Link
            href="/calendar"
            className="rounded-xs text-caption font-medium text-foreground-soft hover:text-foreground"
          >
            {matter.workload} ←
          </Link>
          <span className="text-caption text-foreground-faint">
            המשימה הבאה: {matter.nextTask}
          </span>
        </div>
      </details>
    </article>
  );
}

/** A supporting matter — less anatomy, still operational. */
function SupportingMatter({
  matter,
  selected,
  onSelect,
}: {
  matter: Matter;
  selected: boolean;
  onSelect: () => void;
}) {
  const issue = matter.waitingOn
    ? `ממתין: ${matter.waitingOn}`
    : matter.missingDocs > 0
      ? `${matter.missingDocs} מסמכים חסרים`
      : matter.nextTask;

  return (
    <article
      data-live={selected || undefined}
      className={cx(
        "living-edge surface-paper-raised group relative min-w-0 flex-1 rounded-xl p-5 md:p-6",
        selected && "context-halo",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onSelect}
            aria-pressed={selected}
            className="rounded-xs text-start text-subheading leading-snug font-semibold tracking-tight text-balance text-foreground transition-colors hover:text-ink-700"
            style={{ transitionDuration: "var(--motion-quick)" }}
          >
            {matter.name}
          </button>
          <p className="mt-0.5 truncate text-micro text-foreground-faint">
            {matter.client} · {matter.stage}
          </p>
        </div>
        <HealthStateChip matter={matter} />
      </div>

      <div className="mt-4">
        <MatterSignature matter={matter} compact />
      </div>

      <div className="mt-3.5 flex items-center gap-2 text-caption">
        <CalendarGlyph size={13} className="shrink-0 text-foreground-faint" />
        <span className="font-medium text-foreground">{matter.nextEvent}</span>
      </div>
      <p className="mt-1 truncate text-caption text-foreground-soft">{issue}</p>

      {/* one דינו insight — quiet, meridian-marked */}
      <p className="mt-2.5 flex items-start gap-1.5 border-s-2 border-accent ps-2.5 text-micro leading-relaxed text-foreground-soft">
        <AIMark className="mt-0.5 shrink-0" />
        <span className="min-w-0 line-clamp-2">{matter.aiNote}</span>
      </p>

      {/* hover: the next action + recent activity surface */}
      <div
        className="mt-3 flex items-center justify-between gap-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        style={{ transitionDuration: "var(--motion-quick)" }}
      >
        <span className="truncate text-micro text-foreground-faint">
          עדכון אחרון: {matter.lastUpdate}
        </span>
        <Link
          href="/matters"
          className="shrink-0 rounded-xs text-caption font-semibold text-gold-700 transition-colors hover:text-gold-600"
          style={{ transitionDuration: "var(--motion-quick)" }}
        >
          {matter.action} ←
        </Link>
      </div>
    </article>
  );
}

/** The low-priority queue — one compact operational line each. */
function QueueMatter({
  matter,
  selected,
  onSelect,
}: {
  matter: Matter;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li className="min-w-0 flex-1">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        data-live={selected || undefined}
        className={cx(
          "living-edge surface-paper group flex w-full items-center gap-3 rounded-lg px-4 py-3 text-start transition-all hover:-translate-y-px hover:shadow-lift",
        )}
        style={{ transitionDuration: "var(--motion-quick)" }}
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="truncate text-small font-semibold text-foreground">
              {matter.name}
            </span>
            <HealthStateChip matter={matter} className="px-2 py-0.5 text-micro" />
          </span>
          <span className="mt-0.5 block truncate text-micro text-foreground-faint">
            {matter.nextEvent} · {matter.workload}
          </span>
        </span>
        <span
          className="shrink-0 text-caption font-medium text-foreground-faint opacity-0 transition-opacity group-hover:opacity-100"
          style={{ transitionDuration: "var(--motion-quick)" }}
        >
          {matter.action} ←
        </span>
      </button>
    </li>
  );
}

/**
 * The Matter Operations Board — the work, as a working system.
 * One featured matter, two supporting, a compact queue. Selecting
 * a matter re-aims the Context Dock and moves the halo.
 */
export function MatterBoard({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <section aria-label="לוח התיקים">
      <SectionHeading
        title="לוח התיקים"
        caption="5 תיקים פעילים · ממוינים לפי מה שדורש אותך קודם"
        href="/matters"
        linkLabel="כל התיקים"
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,8fr)_minmax(0,5fr)]">
        <FeaturedMatter
          matter={BOARD.featured}
          selected={selectedId === BOARD.featured.id}
          onSelect={() => onSelect(BOARD.featured.id)}
        />
        <div className="flex min-w-0 flex-col gap-6">
          {BOARD.supporting.map((matter) => (
            <SupportingMatter
              key={matter.id}
              matter={matter}
              selected={selectedId === matter.id}
              onSelect={() => onSelect(matter.id)}
            />
          ))}
        </div>
      </div>

      <ul className="mt-5 flex flex-col gap-3 sm:flex-row">
        {BOARD.queue.map((matter) => (
          <QueueMatter
            key={matter.id}
            matter={matter}
            selected={selectedId === matter.id}
            onSelect={() => onSelect(matter.id)}
          />
        ))}
      </ul>
    </section>
  );
}
