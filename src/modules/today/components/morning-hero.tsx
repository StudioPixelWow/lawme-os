import type { ReactNode } from "react";
import { AttentionPanel } from "./attention-panel";
import { AIIntelligencePanel } from "./ai-intelligence-panel";

/**
 * The hero — one continuous opening experience, not three widgets:
 * a full-width emotional greeting under dawn light, then a single
 * band where the attention surface and עמית's intelligence anchor
 * live together (a champagne bloom behind עמית ties them into one
 * composition).
 */
export function MorningHero({ dateLine }: { dateLine: ReactNode }) {
  return (
    <section aria-label="פתיח הבוקר" className="overflow-x-clip">
      {/* the greeting — full width, luxurious air */}
      <div className="animate-rise pt-2 md:pt-6">
        <p className="text-caption font-medium tracking-wider text-foreground-faint">
          {dateLine}
        </p>
        <h1 className="mt-4 text-hero text-balance text-foreground">
          בוקר טוב, דניאל.
        </h1>
        <div className="mt-5 flex items-center gap-4">
          <span aria-hidden className="h-px w-10 bg-accent" />
          <p className="text-subheading text-foreground-soft">
            הנה מה שחשוב היום.
          </p>
        </div>
      </div>

      {/* the working band — attention + intelligence as one composition */}
      <div className="mt-12 grid grid-cols-1 gap-8 md:mt-16 lg:grid-cols-[7fr_5fr] lg:gap-12">
        <div className="animate-rise min-w-0" style={{ animationDelay: "100ms" }}>
          <AttentionPanel />
        </div>
        <div
          className="animate-rise relative min-w-0"
          style={{ animationDelay: "180ms" }}
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
