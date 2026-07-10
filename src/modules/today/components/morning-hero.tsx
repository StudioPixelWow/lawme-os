import type { ReactNode } from "react";
import { AIMark } from "@/design-system/primitives/indicators";
import { HERO_DAY } from "../data";
import { AttentionPanel } from "./attention-panel";
import { AIIntelligencePanel } from "./ai-intelligence-panel";
import { HeroFocus } from "./hero-focus";

/**
 * The hero — LawME's signature opening experience, on a lit ivory
 * stage. Day-aware: today is a hearing day, so the hearing leads.
 * Composition: day signature → greeting → עמית's read of the day →
 * the live focus (glass) + the morning route | Mission Control.
 */
export function MorningHero({ dateLine }: { dateLine: ReactNode }) {
  return (
    <section
      aria-label="פתיח הבוקר"
      className="surface-hero relative overflow-hidden rounded-xl px-6 py-10 md:px-12 md:py-14"
    >
      {/* the day signature */}
      <div className="animate-rise flex flex-wrap items-center gap-x-4 gap-y-1">
        <p className="text-caption font-medium tracking-wider text-foreground-faint">
          {dateLine}
        </p>
        <span aria-hidden className="hidden h-3 w-px bg-line-strong sm:block" />
        <p className="flex items-center gap-1.5 text-caption font-medium text-gold-700">
          <span aria-hidden className="h-1.5 w-1.5 rounded-pill bg-gold-500" />
          {HERO_DAY.signature}
        </p>
      </div>

      {/* the greeting */}
      <div className="animate-rise mt-6" style={{ animationDelay: "80ms" }}>
        <h1 className="text-hero text-balance text-foreground">
          בוקר טוב, דניאל.
        </h1>
        <p className="mt-5 flex max-w-reading items-start gap-2.5 text-subheading leading-relaxed text-pretty text-foreground-soft">
          <AIMark className="mt-2 shrink-0" />
          {HERO_DAY.aiLine}
        </p>
      </div>

      {/* the working band: live focus + route | mission control */}
      <div className="mt-10 grid grid-cols-1 gap-10 md:mt-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12">
        <div className="animate-rise min-w-0" style={{ animationDelay: "160ms" }}>
          <HeroFocus />
          <div className="mt-8">
            <AttentionPanel />
          </div>
        </div>
        <div
          className="animate-rise relative min-w-0"
          style={{ animationDelay: "240ms" }}
        >
          <span aria-hidden className="bloom-gold" />
          <div className="relative h-full">
            <AIIntelligencePanel />
          </div>
        </div>
      </div>
    </section>
  );
}
