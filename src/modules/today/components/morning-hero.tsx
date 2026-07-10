import type { ReactNode } from "react";
import { AIMark } from "@/design-system/primitives/indicators";
import { HERO_ACTIVE_MODE, HERO_MODES, HERO_PROVENANCE } from "../data";
import { SupportingPriorities } from "./supporting-priorities";
import { TodayMission } from "./today-mission";

/**
 * The hero — LawME's iconic entry: a deep navy environment lit by
 * one sun from the top-start, with warm ivory light and champagne
 * reflections. One composition: greeting → עמית's read of the day →
 * Today's Mission (glass, dominant) → quiet supporting priorities.
 * Day-aware via HERO_MODES; today renders the hearing-day mode.
 */
export function MorningHero({ dateLine }: { dateLine: ReactNode }) {
  const mode = HERO_MODES[HERO_ACTIVE_MODE];

  return (
    <section
      aria-label="פתיח הבוקר"
      className="surface-hero-dark relative overflow-hidden rounded-xl px-6 py-10 md:px-12 md:py-14"
    >
      {/* the day signature */}
      <div className="animate-rise flex flex-wrap items-center gap-x-4 gap-y-1">
        <p className="text-caption font-medium tracking-wider text-ink-200">
          {dateLine}
        </p>
        <span aria-hidden className="hidden h-3 w-px bg-paper-0/20 sm:block" />
        <p className="flex items-center gap-1.5 text-caption font-medium text-gold-300">
          <span
            aria-hidden
            className="animate-breath h-1.5 w-1.5 rounded-pill bg-gold-400"
          />
          {mode.signature}
        </p>
      </div>

      {/* the greeting */}
      <div className="animate-rise mt-6" style={{ animationDelay: "80ms" }}>
        <h1 className="text-hero text-balance text-paper-0">
          בוקר טוב, דניאל.
        </h1>
        <p className="mt-5 flex max-w-reading items-start gap-2.5 text-subheading leading-relaxed text-pretty text-ink-100">
          <AIMark surface="navy" className="mt-2 shrink-0" />
          <span>
            {mode.aiLine}
            <span className="mt-1.5 block text-micro text-ink-200">
              {HERO_PROVENANCE}
            </span>
          </span>
        </p>
      </div>

      {/* the mission — the dominant element */}
      <div
        className="animate-rise mt-10 md:mt-12"
        style={{ animationDelay: "180ms" }}
      >
        <TodayMission />
      </div>

      {/* quiet supporting priorities */}
      <div className="animate-rise" style={{ animationDelay: "260ms" }}>
        <SupportingPriorities />
      </div>
    </section>
  );
}
