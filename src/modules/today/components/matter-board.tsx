"use client";

import Link from "next/link";
import {
  CalendarGlyph,
  DocumentGlyph,
  HourglassGlyph,
  LedgerGlyph,
} from "@/design-system/icons/glyphs";
import { practiceGlyph } from "@/design-system/icons/practice";
import { ICON } from "@/design-system/icons/tokens";
import { IconContainer } from "@/design-system/primitives/icon-container";
import { AIMark } from "@/design-system/primitives/indicators";
import { cx } from "@/design-system/utils/cx";
import type { Matter } from "../data";
import { BOARD, healthState } from "../focus";
import { HealthRing } from "./matter-health";
import { HealthStateChip, MatterSignature } from "./matter-signature";
import { SectionHeading } from "./section-heading";

/**
 * The featured matter — a mini legal workspace, not a card.
 * Identity → the proceeding (milestone track) → the gating facts +
 * דינו's recommendation → the operational floor (unbilled time,
 * team, one action). Hover surfaces the latest activity.
 */
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
        "living-edge surface-paper-raised group relative flex min-w-0 flex-col rounded-xl",
        selected && "context-halo",
      )}
    >
      {/* the meridian — this is today's matter */}
      <span
        aria-hidden
        className="absolute inset-y-6 start-0 w-0.5 rounded-pill bg-gold-500/80"
      />

      <div className="flex-1 p-6 md:p-7">
        <p className="text-micro font-semibold tracking-wide text-gold-700">
          התיק המרכזי
        </p>

        {/* identity */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <IconContainer variant="gold" size="lg" interactive>
            {practiceGlyph(matter.practiceArea, ICON.nav)}
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
            <p className="mt-0.5 truncate text-caption text-foreground-soft">
              {matter.client} · {matter.practiceArea} · עו״ד {matter.owner}
            </p>
          </div>
        </div>

        {/* the proceeding */}
        <div className="mt-6">
          <MatterSignature matter={matter} />
        </div>

        {/* the gating facts + דינו — two grouped zones */}
        <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-4 border-t border-line/50 pt-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <dl className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-small">
              <CalendarGlyph size={ICON.inline} className="shrink-0 text-foreground-faint" />
              <dt className="text-foreground-faint">האירוע הבא:</dt>
              <dd className="font-semibold text-foreground">{matter.nextEvent}</dd>
            </div>
            <div className="flex items-center gap-2 text-small">
              <DocumentGlyph size={ICON.inline} className="shrink-0 text-foreground-faint" />
              <dt className="text-foreground-faint">מסמכים בתיק:</dt>
              <dd className="font-medium tabular-nums text-foreground">
                {matter.files}
              </dd>
            </div>
            <div className="flex items-center gap-2 text-small">
              <HourglassGlyph size={ICON.inline} className="shrink-0 text-foreground-faint" />
              <dt className="text-foreground-faint">המשימה הבאה:</dt>
              <dd className="min-w-0 truncate font-medium text-foreground">
                {matter.nextTask}
              </dd>
            </div>
          </dl>

          <div className="rounded-md border-s-2 border-accent bg-gold-100/40 p-4">
            <p className="flex items-center gap-2 text-caption font-semibold text-foreground">
              <AIMark />
              המלצת דינו
            </p>
            <p className="mt-1.5 text-small leading-relaxed text-pretty text-foreground-soft">
              {matter.aiNote}
            </p>
            <button
              type="button"
              className="mt-2 rounded-xs text-caption font-semibold text-gold-700 transition-colors hover:text-gold-600"
              style={{ transitionDuration: "var(--motion-quick)" }}
            >
              צפה בניתוח המלא ←
            </button>
          </div>
        </div>

        {/* latest activity */}
        <p className="mt-4 text-micro text-foreground-faint">
          פעילות אחרונה: {matter.lastUpdate} · עדכון תצהיר לפי הפסיקה החדשה ·
          עומס היום {matter.workload}
        </p>
      </div>

      {/* the operational floor */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-b-xl border-t border-line/60 bg-surface-sunken/40 px-6 py-4 md:px-7">
        <p className="flex items-center gap-2 text-caption text-foreground-soft">
          <LedgerGlyph size={ICON.inline} className="text-foreground-faint" />
          <span className="font-semibold tabular-nums text-foreground">3.5 שעות</span>
          טרם חויבו
        </p>
        <span aria-hidden className="hidden h-4 w-px bg-line-strong sm:block" />
        <p className="flex items-center gap-2">
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
          <span className="text-micro text-foreground-faint">
            {matter.team.join(", ")}
          </span>
        </p>
        <Link
          href="/matters"
          className="ms-auto inline-flex h-10 items-center rounded-md bg-ink-900 px-6 text-small font-medium text-paper-0 shadow-raised transition-all hover:-translate-y-px hover:bg-ink-800 hover:shadow-lift"
          style={{ transitionDuration: "var(--motion-quick)" }}
        >
          פתח את התיק
        </Link>
      </div>
    </article>
  );
}

/** A supporting matter — smaller premium object with its own state. */
function SupportingMatter({
  matter,
  selected,
  onSelect,
}: {
  matter: Matter;
  selected: boolean;
  onSelect: () => void;
}) {
  const state = healthState(matter);
  const issue = matter.waitingOn
    ? `ממתין: ${matter.waitingOn}`
    : matter.missingDocs > 0
      ? `${matter.missingDocs} מסמכים חסרים`
      : matter.nextTask;

  return (
    <article
      data-live={selected || undefined}
      className={cx(
        "living-edge surface-paper group relative min-w-0 flex-1 rounded-xl p-4",
        selected && "context-halo surface-paper-raised",
      )}
    >
      {/* matter-state accent on the start edge */}
      <span
        aria-hidden
        className={cx(
          "absolute inset-y-4 start-0 w-0.5 rounded-pill",
          state.status === "urgent"
            ? "bg-status-urgent"
            : state.status === "waiting"
              ? "bg-status-waiting"
              : state.status === "risk"
                ? "bg-status-risk"
                : "bg-status-scheduled",
        )}
      />

      <div className="flex items-start gap-3.5">
        <HealthRing value={matter.progress} status={state.status} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <button
              type="button"
              onClick={onSelect}
              aria-pressed={selected}
              className="rounded-xs text-start text-subheading leading-snug font-semibold tracking-tight text-foreground transition-colors hover:text-ink-700"
              style={{ transitionDuration: "var(--motion-quick)" }}
            >
              {matter.name}
            </button>
            <HealthStateChip matter={matter} className="px-2 py-0.5 text-micro" />
          </div>
          <p className="mt-0.5 truncate text-micro text-foreground-faint">
            {matter.client} · שלב: {matter.stage}
          </p>
          <div className="mt-2.5 flex items-center gap-2 text-caption">
            <CalendarGlyph size={ICON.metadata} className="shrink-0 text-foreground-faint" />
            <span className="font-medium text-foreground">{matter.nextEvent}</span>
          </div>
          <p className="mt-1 truncate text-caption text-foreground-soft">{issue}</p>
          <p className="mt-2 flex items-start gap-1.5 text-micro leading-relaxed text-foreground-soft">
            <AIMark className="mt-0.5 shrink-0" />
            <span className="min-w-0 truncate">דינו: {matter.aiNote}</span>
          </p>
        </div>
      </div>

      {/* hover: the action surfaces */}
      <div
        className="mt-2 flex items-center justify-between gap-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
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

/**
 * Active Matters — the approved mixed composition: one featured
 * matter as the dominant workspace, three supporting matters beside
 * it, and the quiet queue folded below.
 */
export function MatterBoard({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <section aria-label="התיקים הפעילים">
      <SectionHeading
        title="התיקים הפעילים"
        caption="ממוינים לפי מה שדורש אותך קודם"
        href="/matters"
        linkLabel="צפה בכל התיקים"
      />

      <div className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <FeaturedMatter
          matter={BOARD.featured}
          selected={selectedId === BOARD.featured.id}
          onSelect={() => onSelect(BOARD.featured.id)}
        />
        <div className="flex min-w-0 flex-col gap-4">
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

      {/* the quiet queue */}
      <details className="group/queue mt-4">
        <summary
          className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-xs text-caption font-medium text-foreground-faint transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden"
          style={{ transitionDuration: "var(--motion-quick)" }}
        >
          {BOARD.queue.length === 1
            ? "עוד תיק אחד במעקב שוטף"
            : `עוד ${BOARD.queue.length} תיקים במעקב שוטף`}
          <span aria-hidden className="transition-transform group-open/queue:rotate-90">
            ‹
          </span>
        </summary>
        <ul className="animate-rise mt-3 flex flex-col gap-2">
          {BOARD.queue.map((matter) => (
            <li key={matter.id}>
              <button
                type="button"
                onClick={() => onSelect(matter.id)}
                aria-pressed={selectedId === matter.id}
                data-live={selectedId === matter.id || undefined}
                className="living-edge surface-paper group flex w-full items-center gap-3 rounded-lg px-4 py-3 text-start transition-all hover:-translate-y-px hover:shadow-lift"
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
          ))}
        </ul>
      </details>
    </section>
  );
}
