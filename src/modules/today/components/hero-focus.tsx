import Link from "next/link";
import {
  CheckGlyph,
  CourtGlyph,
  DocumentGlyph,
} from "@/design-system/icons/glyphs";
import { IconContainer } from "@/design-system/primitives/icon-container";
import { AIMark, StatusText } from "@/design-system/primitives/indicators";
import { cx } from "@/design-system/utils/cx";
import { HERO_FOCUS, type HeroChecklistState } from "../data";
import { HealthRing } from "./matter-health";

const CHECK_TREATMENT: Record<
  HeroChecklistState,
  { label: string; className: string }
> = {
  ready: { label: "מוכן", className: "text-status-completed" },
  suggested: { label: "מומלץ", className: "text-gold-700" },
  missing: { label: "חסר", className: "text-status-today" },
};

/**
 * מוקד היום — the dynamic focus of the hero. On a hearing day it is
 * the hearing itself: countdown, readiness, preparation state,
 * required documents, team — the live moment, rendered in glass.
 */
export function HeroFocus() {
  return (
    <article
      aria-label="מוקד היום — הדיון הקרוב"
      className="glass rounded-xl border-s-2 border-accent p-6 shadow-gold-glow"
    >
      <div className="flex flex-wrap items-center gap-3">
        <IconContainer variant="urgent" size="lg">
          <CourtGlyph size={22} />
        </IconContainer>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <time className="text-title font-bold tracking-tight tabular-nums text-foreground">
              {HERO_FOCUS.time}
            </time>
            <span className="rounded-pill bg-gold-100 px-2.5 py-0.5 text-caption font-semibold text-gold-700">
              {HERO_FOCUS.countdown}
            </span>
          </div>
          <h3 className="mt-0.5 truncate text-subheading font-semibold text-foreground">
            {HERO_FOCUS.title}
          </h3>
          <p className="mt-0.5 truncate text-caption text-foreground-soft">
            {HERO_FOCUS.location}
          </p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <HealthRing value={HERO_FOCUS.readiness} status="completed" />
          <span className="text-micro text-foreground-faint">מוכנות</span>
        </div>
      </div>

      <ul className="mt-5 grid grid-cols-1 gap-x-6 gap-y-2 border-t border-line/50 pt-4 sm:grid-cols-2">
        {HERO_FOCUS.checklist.map((item) => {
          const t = CHECK_TREATMENT[item.state];
          return (
            <li key={item.id} className="flex items-center gap-2 text-small">
              {item.state === "suggested" ? (
                <AIMark className="shrink-0" />
              ) : (
                <CheckGlyph
                  size={13}
                  className={cx(
                    "shrink-0",
                    item.state === "ready"
                      ? "text-status-completed"
                      : "text-status-today",
                  )}
                />
              )}
              <span className="min-w-0 flex-1 truncate text-foreground">
                {item.label}
              </span>
              <span className={cx("shrink-0 text-micro font-medium", t.className)}>
                {t.label}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-line/50 pt-4">
        <span className="flex min-w-0 items-center gap-2 text-micro text-foreground-faint">
          <DocumentGlyph size={13} className="shrink-0" />
          <span className="truncate">{HERO_FOCUS.documents.join(" · ")}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="flex -space-x-1.5 space-x-reverse" dir="ltr">
            {HERO_FOCUS.team.map((member) => (
              <span
                key={member}
                title={member}
                className="flex h-6 w-6 items-center justify-center rounded-pill bg-ink-900 text-micro text-paper-0 shadow-seat ring-2 ring-paper-0"
              >
                {member[0]}
              </span>
            ))}
          </span>
          <StatusText status="completed">הצוות מתואם</StatusText>
        </span>
        <Link
          href="/matters"
          className="ms-auto inline-flex h-10 shrink-0 items-center rounded-md bg-ink-900 px-5 text-small font-medium text-paper-0 shadow-raised transition-all hover:-translate-y-px hover:bg-ink-800 hover:shadow-lift"
          style={{ transitionDuration: "var(--motion-quick)" }}
        >
          {HERO_FOCUS.cta}
        </Link>
      </div>
    </article>
  );
}
