import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertGlyph,
  BookGlyph,
  CourtGlyph,
  DocumentGlyph,
  PenGlyph,
  PhoneGlyph,
  UserGlyph,
} from "@/design-system/icons/glyphs";
import { AIMark, StatusText } from "@/design-system/primitives/indicators";
import { HERO_FOCUS, HERO_MODES, HERO_ACTIVE_MODE, type TimelineEvent } from "../data";
import { PREPARED_WORK, matterForEvent, type PreparedItem } from "../focus";
import { HealthRing } from "./matter-health";
import { FocusTimeline } from "./focus-timeline";

const PREPARED_ICON: Record<PreparedItem["kind"], ReactNode> = {
  document: <DocumentGlyph size={14} />,
  draft: <PenGlyph size={14} />,
  precedent: <BookGlyph size={14} />,
  client: <UserGlyph size={14} />,
};

/**
 * Today Focus — mission control. ONE hero object owns the first
 * impression: the navy focal block with one dominant number (the
 * countdown), one objective, one דינו insight and one action.
 * Everything else in the scene is support: the gating facts, the
 * quiet prepared-work list, the timeline flowing beneath.
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
  const readiness = hearing ? HERO_FOCUS.readiness : (focusedEvent.prep ?? 0.5);

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

      <div className="mt-5">
        {/* ── THE hero object — mission control ── */}
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

            <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
              <div className="min-w-0 flex-1">
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

                {/* the objective */}
                <h1 className="mt-1.5 text-heading font-semibold tracking-tight text-balance text-paper-0">
                  {hearing ? HERO_FOCUS.title : focusedEvent.title}
                </h1>

                {/* THE number */}
                {hearing ? (
                  <p className="mt-2.5">
                    <span className="block text-caption font-medium text-ink-200">
                      בעוד
                    </span>
                    <span className="block text-display leading-none font-bold tracking-tight whitespace-nowrap text-gold-300">
                      {HERO_FOCUS.countdown.replace(/^בעוד\s*/, "")}
                    </span>
                  </p>
                ) : (
                  <p className="mt-2.5 text-display leading-none font-bold tracking-tight tabular-nums text-gold-300">
                    {focusedEvent.time}
                  </p>
                )}

                <p className="mt-3 text-small text-ink-200">
                  {hearing ? (
                    <>
                      <time className="font-medium tabular-nums text-paper-0">
                        {HERO_FOCUS.time}
                      </time>
                      {" · "}
                      {HERO_FOCUS.location}
                    </>
                  ) : (
                    focusedEvent.location
                  )}
                </p>
              </div>

              {/* readiness — inside the hero, one glance */}
              <div className="flex shrink-0 flex-col items-center gap-1">
                <HealthRing
                  value={readiness}
                  status={readiness >= 0.8 ? "completed" : "progress"}
                  surface="navy"
                />
                <span className="text-micro text-ink-200">מוכנות</span>
              </div>
            </div>

            {/* one דינו insight */}
            <p className="mt-5 flex max-w-2xl items-start gap-2 border-t border-paper-0/10 pt-4 text-small leading-relaxed text-ink-100">
              <AIMark surface="navy" className="mt-1 shrink-0" />
              <span className="min-w-0">
                {hearing
                  ? "דינו: התדריך מוכן ומסודר לפי סדר הטיעון. מומלץ לאזכר את ע״א 4881/25 — מחזק את טענת ההתיישנות."
                  : (matter?.aiNote ?? mode.aiLine)}
              </span>
            </p>

            {/* one dominant action */}
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link
                href="/matters"
                className="inline-flex h-11 items-center rounded-md border border-gold-400/70 px-7 text-small font-semibold text-gold-200 shadow-gold-glow transition-all hover:-translate-y-px hover:border-gold-300 hover:bg-gold-500/10"
                style={{ transitionDuration: "var(--motion-quick)" }}
              >
                {hearing ? mode.cta : "פתח הכנה"}
              </Link>
              {!isDefault ? (
                <p className="text-micro text-ink-300">Esc — חזרה למיקוד היום</p>
              ) : null}
            </div>
          </article>

          {/* ── the gating facts — quiet support ── */}
          {matter ? (
            <dl className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 ps-1">
              <div className="flex items-center gap-1.5 text-caption">
                <dt className="text-foreground-faint">סיכון:</dt>
                <dd>
                  <StatusText status={matter.riskStatus} className="text-caption">
                    {matter.risk}
                  </StatusText>
                </dd>
              </div>
              {matter.missingDocs > 0 ? (
                <div className="flex items-center gap-1.5 text-caption">
                  <dt className="text-foreground-faint">חסר:</dt>
                  <dd className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {matter.missingDocs} נספחים
                    </span>
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
              <div className="flex items-center gap-1.5 text-caption">
                <dt className="text-foreground-faint">אחראי:</dt>
                <dd className="font-medium text-foreground">
                  עו״ד {matter.owner} · {matter.team.join(", ")}
                </dd>
              </div>
            </dl>
          ) : null}
        </div>

        {/* ── the prepared work — one quiet manifest row ── */}
        <div className="mt-5 border-t border-line/50 pt-4">
          <p className="flex items-center gap-2 text-caption font-semibold text-foreground-soft">
            <AIMark />
            דינו הכין
            <span className="text-micro font-normal text-foreground-faint">
              · 07:20
            </span>
          </p>
          <ul className="mt-2.5 flex flex-wrap gap-2">
            {PREPARED_WORK.map((item) => (
              <li key={item.id} className="min-w-0">
                <button
                  type="button"
                  className="living-edge group flex items-center gap-2 rounded-md bg-surface-sunken/60 px-2.5 py-1.5 text-start transition-all hover:-translate-y-px hover:bg-surface-raised hover:shadow-lift"
                  style={{ transitionDuration: "var(--motion-quick)" }}
                >
                  <span className="shrink-0 text-foreground-faint">
                    {PREPARED_ICON[item.kind]}
                  </span>
                  <span className="min-w-0">
                    <span className="block max-w-44 truncate text-caption font-medium text-foreground">
                      {item.title}
                    </span>
                    <span className="block truncate text-micro text-foreground-faint">
                      {item.kindLabel} · {item.meta}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* the meridian flows from the hero into the day */}
      <div aria-hidden className="ms-8 h-5 w-px bg-gold-500/60 md:ms-10" />

      {/* ── the integrated timeline ── */}
      <FocusTimeline focusedId={focusedEvent.id} onSelect={onSelectEvent} />
    </section>
  );
}
