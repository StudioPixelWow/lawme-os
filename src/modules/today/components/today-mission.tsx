import Link from "next/link";
import {
  AlertGlyph,
  CheckGlyph,
  CourtGlyph,
  DocumentGlyph,
  UsersGlyph,
} from "@/design-system/icons/glyphs";
import { IconContainer } from "@/design-system/primitives/icon-container";
import { AIMark } from "@/design-system/primitives/indicators";
import { cx } from "@/design-system/utils/cx";
import {
  HERO_ACTIVE_MODE,
  HERO_FACTS,
  HERO_FOCUS,
  HERO_MODES,
  type HeroFact,
} from "../data";
import { HealthRing } from "./matter-health";

const FACT_ICON: Record<
  HeroFact["kind"],
  { Glyph: typeof CheckGlyph; className: string }
> = {
  missing: { Glyph: DocumentGlyph, className: "text-status-today-onnavy" },
  ai: { Glyph: CheckGlyph, className: "text-gold-400" },
  team: { Glyph: UsersGlyph, className: "text-status-completed-onnavy" },
  risk: { Glyph: AlertGlyph, className: "text-status-risk-onnavy" },
  ready: { Glyph: CheckGlyph, className: "text-status-completed-onnavy" },
};

/**
 * המשימה המרכזית — Today's Mission: the operational heart of the
 * hero. One mission, one countdown, one readiness, the facts that
 * gate it, and one champagne CTA that starts the day.
 */
export function TodayMission() {
  const mode = HERO_MODES[HERO_ACTIVE_MODE];

  return (
    <article
      aria-label="המשימה המרכזית של היום"
      className="glass-navy group rounded-xl p-6 transition-all hover:-translate-y-0.5 md:p-7"
      style={{ transitionDuration: "var(--motion-settle)" }}
    >
      <p className="flex items-center gap-2 text-caption font-semibold tracking-wide text-gold-400">
        <span aria-hidden className="h-px w-6 bg-gold-500/70" />
        {mode.missionLabel}
      </p>
      <h2 className="mt-3 max-w-2xl text-title font-semibold leading-snug tracking-tight text-balance text-paper-0">
        {mode.mission}
      </h2>

      {/* countdown · readiness · hearing identity */}
      <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-paper-0/10 pt-5">
        <div className="flex items-center gap-3">
          <IconContainer variant="urgent" surface="navy" size="lg">
            <CourtGlyph size={20} />
          </IconContainer>
          <div>
            <p className="flex items-baseline gap-2.5">
              <time className="text-title font-bold tracking-tight tabular-nums text-paper-0">
                {HERO_FOCUS.time}
              </time>
              <span className="rounded-pill bg-gold-500/15 px-2.5 py-0.5 text-caption font-semibold text-gold-300">
                {HERO_FOCUS.countdown}
              </span>
            </p>
            <p className="mt-0.5 text-caption text-ink-100">
              {HERO_FOCUS.title}
            </p>
            <p className="text-micro text-ink-200">{HERO_FOCUS.location}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <HealthRing
            value={HERO_FOCUS.readiness}
            status="completed"
            surface="navy"
          />
          <div>
            <p className="text-small font-semibold text-paper-0">מוכנות לדיון</p>
            <p className="text-micro text-ink-200">
              {HERO_FOCUS.documents.join(" · ")}
            </p>
          </div>
        </div>

        <div className="ms-auto flex items-center gap-2.5">
          <span className="flex -space-x-1.5 space-x-reverse" dir="ltr">
            {HERO_FOCUS.team.map((member) => (
              <span
                key={member}
                title={member}
                className="flex h-7 w-7 items-center justify-center rounded-pill bg-paper-0/15 text-micro font-medium text-paper-0 ring-2 ring-ink-800"
              >
                {member[0]}
              </span>
            ))}
          </span>
          <span className="text-micro text-ink-200">הצוות מוכן</span>
        </div>
      </div>

      {/* the facts that gate the mission — each with its next action */}
      <ul className="mt-5 grid grid-cols-1 gap-x-8 gap-y-2.5 border-t border-paper-0/10 pt-5 sm:grid-cols-2">
        {HERO_FACTS.map((fact) => {
          const icon = FACT_ICON[fact.kind];
          return (
            <li key={fact.id} className="flex items-center gap-2.5 text-small">
              {fact.kind === "ai" ? (
                <AIMark surface="navy" className="shrink-0" />
              ) : (
                <icon.Glyph
                  size={14}
                  className={cx("shrink-0", icon.className)}
                />
              )}
              <span className="min-w-0 flex-1 truncate text-ink-100">
                {fact.text}
              </span>
              {fact.action ? (
                <button
                  type="button"
                  className="shrink-0 rounded-xs text-micro font-medium text-ink-200 transition-colors hover:text-gold-300"
                  style={{ transitionDuration: "var(--motion-quick)" }}
                >
                  {fact.action} ←
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>

      {/* the champagne CTA — the natural starting point of the day */}
      <div className="mt-6 flex items-center gap-4">
        <Link
          href="/matters"
          className="inline-flex h-12 items-center rounded-md bg-gold-500 px-7 text-body font-semibold text-ink-950 shadow-gold-glow transition-all hover:-translate-y-px hover:bg-gold-400"
          style={{ transitionDuration: "var(--motion-quick)" }}
        >
          {mode.cta}
        </Link>
        <span className="text-micro text-ink-200">
          עמית סידר את החומרים לפי סדר הטיעון
        </span>
      </div>
    </article>
  );
}
