import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertGlyph,
  BookGlyph,
  CourtGlyph,
  DocumentGlyph,
  PenGlyph,
  PhoneGlyph,
  PinGlyph,
  UserGlyph,
} from "@/design-system/icons/glyphs";
import { AIMark, StatusText } from "@/design-system/primitives/indicators";
import { cx } from "@/design-system/utils/cx";
import { HERO_FOCUS, HERO_MODES, HERO_ACTIVE_MODE, type TimelineEvent } from "../data";
import { PREPARED_WORK, matterForEvent, type PreparedItem } from "../focus";
import { HealthRing } from "./matter-health";
import { FocusTimeline } from "./focus-timeline";

const PREPARED_ICON: Record<PreparedItem["kind"], ReactNode> = {
  document: <DocumentGlyph size={15} />,
  draft: <PenGlyph size={15} />,
  precedent: <BookGlyph size={15} />,
  client: <UserGlyph size={15} />,
};

/** One prepared-work object — a small physical thing, not a row. */
function PreparedObject({ item, index }: { item: PreparedItem; index: number }) {
  return (
    <li
      className={cx(
        "living-edge surface-paper group relative flex w-full items-center gap-3 rounded-md p-3 transition-all hover:-translate-y-0.5 hover:shadow-lift",
        index > 0 && "-mt-1.5",
      )}
      style={{ transitionDuration: "var(--motion-quick)" }}
    >
      {/* layered paper edge — the object has thickness */}
      <span
        aria-hidden
        className="absolute inset-x-1.5 -bottom-1 -z-1 h-2 rounded-b-md bg-paper-300/70 shadow-seat"
      />
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-surface-sunken text-foreground-soft">
        {PREPARED_ICON[item.kind]}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-1.5">
          <span className="min-w-0 text-small leading-snug font-medium text-foreground">
            {item.title}
          </span>
          {item.ai ? <AIMark className="mt-1" /> : null}
        </span>
        <span className="mt-0.5 flex items-center gap-2 text-micro text-foreground-faint">
          <span className="font-medium">{item.kindLabel}</span>
          <StatusText status={item.status}>{item.meta}</StatusText>
        </span>
      </span>
    </li>
  );
}

/**
 * Today Focus — LawME's signature working scene. Not a card and not
 * a hero: a layered composition. A navy focal object (the hearing)
 * under a context halo, the day's gating facts, the prepared work as
 * physical objects, and the timeline flowing beneath — connected by
 * the gold meridian. Selecting a timeline event re-aims the scene.
 */
export function TodayFocus({
  dateLine,
  focusedEvent,
  onSelectEvent,
  isDefault,
}: {
  dateLine: ReactNode;
  focusedEvent: TimelineEvent;
  onSelectEvent: (id: string) => void;
  isDefault: boolean;
}) {
  const mode = HERO_MODES[HERO_ACTIVE_MODE];
  const matter = matterForEvent(focusedEvent.id);
  const hearing = focusedEvent.id === "ev-3";

  return (
    <section
      aria-label="מוקד היום"
      className="surface-hero relative rounded-xl px-6 pt-5 pb-6 md:px-8 md:pt-6 md:pb-7"
    >
      {/* one quiet contextual line — the greeting is secondary */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-small font-medium text-foreground">
          בוקר טוב, דניאל
        </p>
        <span aria-hidden className="hidden h-3 w-px self-center bg-line-strong sm:block" />
        <p className="text-caption text-foreground-faint">{dateLine}</p>
        <span aria-hidden className="hidden h-3 w-px self-center bg-line-strong sm:block" />
        <p className="text-caption font-medium text-gold-700">{mode.signature}</p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)]">
        {/* ── the focal object — under the context halo ── */}
        <div className="context-halo min-w-0">
          <article
            className="surface-navy relative overflow-hidden rounded-lg p-6 md:p-7"
            data-live="true"
          >
            {/* the gold meridian enters the object */}
            <span
              aria-hidden
              className="absolute inset-y-5 start-0 w-0.5 rounded-pill bg-gold-500/80"
            />
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-caption font-medium text-gold-300">
                  {focusedEvent.kind === "hearing" ? (
                    <CourtGlyph size={14} />
                  ) : focusedEvent.kind === "call" ? (
                    <PhoneGlyph size={14} />
                  ) : (
                    <AlertGlyph size={14} />
                  )}
                  {focusedEvent.kindLabel}
                  {matter ? ` · ${matter.practiceArea}` : null}
                </p>
                <h1 className="mt-2 text-title font-semibold tracking-tight text-balance text-paper-0">
                  {hearing ? HERO_FOCUS.title : focusedEvent.title}
                </h1>
              </div>
              <p className="shrink-0 text-start">
                <span className="block text-heading font-semibold tracking-tight text-gold-300">
                  {hearing ? HERO_FOCUS.countdown : focusedEvent.time}
                </span>
                {hearing ? (
                  <time className="mt-0.5 block text-small tabular-nums text-ink-200">
                    {HERO_FOCUS.time}
                  </time>
                ) : null}
              </p>
            </div>

            <p className="mt-3 flex items-center gap-1.5 text-small text-ink-200">
              <PinGlyph size={13} className="shrink-0" />
              {hearing ? HERO_FOCUS.location : focusedEvent.location}
            </p>

            {/* the actions — one primary, one contextual */}
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
              <Link
                href="/matters"
                className="inline-flex h-11 items-center rounded-md border border-gold-400/70 px-6 text-small font-semibold text-gold-200 shadow-gold-glow transition-all hover:-translate-y-px hover:border-gold-300 hover:bg-gold-500/10"
                style={{ transitionDuration: "var(--motion-quick)" }}
              >
                {hearing ? mode.cta : "פתח הכנה"}
              </Link>
              <button
                type="button"
                className="rounded-xs text-small font-medium text-ink-100 transition-colors hover:text-paper-0"
                style={{ transitionDuration: "var(--motion-quick)" }}
              >
                {hearing ? "פתח את הפסיקה החדשה ←" : "פתח את התיק ←"}
              </button>
            </div>
          </article>

          {/* ── the context strip — the gating facts ── */}
          <dl className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 ps-1">
            <div className="flex items-center gap-2.5">
              <HealthRing
                value={hearing ? HERO_FOCUS.readiness : (focusedEvent.prep ?? 0.5)}
                status={
                  (hearing ? HERO_FOCUS.readiness : (focusedEvent.prep ?? 0.5)) >= 0.8
                    ? "completed"
                    : "progress"
                }
              />
              <dt className="text-caption font-medium text-foreground-soft">
                מוכנות
              </dt>
            </div>
            {matter ? (
              <>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-micro text-foreground-faint">סיכון</dt>
                  <dd>
                    <StatusText status={matter.riskStatus} className="text-caption">
                      {matter.risk}
                    </StatusText>
                  </dd>
                </div>
                {matter.missingDocs > 0 ? (
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-micro text-foreground-faint">חסר</dt>
                    <dd className="flex items-center gap-2">
                      <StatusText status="today" className="text-caption">
                        {matter.missingDocs} נספחים
                      </StatusText>
                      <button
                        type="button"
                        className="rounded-xs text-micro font-medium text-gold-700 transition-colors hover:text-gold-600"
                        style={{ transitionDuration: "var(--motion-quick)" }}
                      >
                        בקש מהלקוח ←
                      </button>
                    </dd>
                  </div>
                ) : null}
                <div className="flex flex-col gap-0.5">
                  <dt className="text-micro text-foreground-faint">אחראי</dt>
                  <dd className="flex items-center gap-1.5 text-caption font-medium text-foreground">
                    <span className="flex h-6 w-6 items-center justify-center rounded-pill bg-ink-900 text-micro text-paper-0">
                      {matter.owner.slice(0, 1)}
                    </span>
                    עו״ד {matter.owner}
                  </dd>
                </div>
              </>
            ) : null}
            {!isDefault ? (
              <p className="text-micro text-foreground-faint">
                Esc — חזרה למיקוד היום
              </p>
            ) : null}
          </dl>
        </div>

        {/* ── the prepared work — physical objects, slightly stacked ── */}
        <aside aria-label="העבודה שהוכנה" className="min-w-0 lg:ps-2">
          <p className="flex items-center gap-2 text-caption font-semibold text-foreground-soft">
            <AIMark />
            דינו הכין לדיון
            <span className="text-micro font-normal text-foreground-faint">
              · עודכן 07:20
            </span>
          </p>
          <ul className="mt-3 flex flex-col">
            {PREPARED_WORK.map((item, i) => (
              <PreparedObject key={item.id} item={item} index={i} />
            ))}
          </ul>
        </aside>
      </div>

      {/* the meridian flows from the focal object into the day */}
      <div aria-hidden className="ms-8 h-5 w-px bg-gold-500/60 md:ms-10" />

      {/* ── the integrated timeline ── */}
      <FocusTimeline focusedId={focusedEvent.id} onSelect={onSelectEvent} />
    </section>
  );
}
