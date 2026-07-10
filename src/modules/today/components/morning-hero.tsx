import Link from "next/link";
import type { ReactNode } from "react";
import { DocumentGlyph } from "@/design-system/icons/glyphs";
import { AIMark } from "@/design-system/primitives/indicators";
import { HERO_ACTIVE_MODE, HERO_FOCUS, HERO_MODES } from "../data";
import { HealthRing } from "./matter-health";

/**
 * The hero — one authored composition on precision-machined navy.
 * No cards inside. One focal point (the mission line), one readiness
 * accent, two quiet facts, one edge-lit champagne action.
 * Answers only: what matters today · how ready am I · what next ·
 * what LawME already prepared. Everything else lives below the fold.
 */
export function MorningHero({ dateLine }: { dateLine: ReactNode }) {
  const mode = HERO_MODES[HERO_ACTIVE_MODE];

  return (
    <section
      aria-label="פתיח הבוקר"
      className="surface-hero-dark relative overflow-hidden rounded-xl px-6 py-8 md:px-10 md:py-9"
    >
      {/* quiet header line */}
      <div className="animate-rise flex flex-wrap items-center gap-x-4 gap-y-1">
        <p className="text-caption font-medium tracking-wider text-ink-200">
          {dateLine}
        </p>
        <span aria-hidden className="hidden h-3 w-px bg-paper-0/15 sm:block" />
        <p className="text-caption font-medium text-gold-300">
          {mode.signature}
        </p>
      </div>

      {/* the greeting */}
      <h1
        className="animate-rise mt-5 text-display font-bold tracking-tight text-balance text-paper-0"
        style={{ animationDelay: "80ms" }}
      >
        בוקר טוב, דניאל.
      </h1>

      {/* THE focal point — the mission line */}
      <div className="animate-rise mt-4" style={{ animationDelay: "160ms" }}>
        <p className="text-heading font-semibold tracking-tight text-balance text-paper-0">
          דיון בתיק כהן{" "}
          <span className="text-gold-300">{HERO_FOCUS.countdown}</span>
          <span className="text-ink-200"> · </span>
          <time className="tabular-nums">{HERO_FOCUS.time}</time>
        </p>
        <p className="mt-2 text-small text-ink-200">{HERO_FOCUS.location}</p>
      </div>

      {/* the supporting cluster — readiness + two facts, no containers */}
      <div
        className="animate-rise mt-6 flex flex-wrap items-center gap-x-7 gap-y-4"
        style={{ animationDelay: "240ms" }}
      >
        <span className="flex items-center gap-3">
          <HealthRing
            value={HERO_FOCUS.readiness}
            status="completed"
            surface="navy"
          />
          <span className="text-small font-medium text-paper-0">
            מוכנות לדיון
          </span>
        </span>

        <span aria-hidden className="hidden h-8 w-px bg-paper-0/12 md:block" />

        <span className="flex min-w-0 items-center gap-2.5 text-small text-ink-100">
          <DocumentGlyph size={14} className="shrink-0 text-status-today-onnavy" />
          חסרים 2 נספחים
          <button
            type="button"
            className="shrink-0 rounded-xs font-medium text-gold-300 transition-colors hover:text-gold-200"
            style={{ transitionDuration: "var(--motion-quick)" }}
          >
            בקש מהלקוח ←
          </button>
        </span>

        <span className="flex min-w-0 items-center gap-2.5 text-small text-ink-100">
          <AIMark surface="navy" className="shrink-0" />
          עמית מצא פסיקה חדשה — ע״א 4881/25
          <button
            type="button"
            className="shrink-0 rounded-xs font-medium text-gold-300 transition-colors hover:text-gold-200"
            style={{ transitionDuration: "var(--motion-quick)" }}
          >
            השווה לתיק ←
          </button>
        </span>
      </div>

      {/* one action */}
      <div
        className="animate-rise mt-7 flex flex-wrap items-center gap-5"
        style={{ animationDelay: "320ms" }}
      >
        <Link
          href="/matters"
          className="inline-flex h-11 items-center rounded-md border border-gold-400/70 px-7 text-small font-semibold text-gold-200 shadow-gold-glow transition-all hover:-translate-y-px hover:border-gold-300 hover:bg-gold-500/10"
          style={{ transitionDuration: "var(--motion-quick)" }}
        >
          {mode.cta}
        </Link>
        <p className="text-micro text-ink-200">
          עמית סידר את החומרים לפי סדר הטיעון · עודכן 07:20
        </p>
      </div>
    </section>
  );
}
