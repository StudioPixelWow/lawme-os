import type { ReactNode } from "react";
import { AttentionPanel } from "./attention-panel";
import { AIIntelligencePanel } from "./ai-intelligence-panel";

/**
 * The hero composition: greeting + attention surface at the start
 * (right, RTL); עמית's intelligence surface at the end (left).
 * Stacks to a single column below lg.
 */
export function MorningHero({ dateLine }: { dateLine: ReactNode }) {
  return (
    <section
      aria-label="פתיח הבוקר"
      className="grid grid-cols-1 gap-6 lg:grid-cols-[7fr_5fr]"
    >
      <div className="animate-rise flex flex-col">
        <p className="text-caption font-medium text-foreground-faint">
          {dateLine}
        </p>
        <h1 className="mt-3 text-display font-bold tracking-tight text-balance text-foreground">
          בוקר טוב, דניאל.
        </h1>
        <p className="mt-2 text-subheading text-foreground-soft">
          הנה מה שחשוב היום.
        </p>
        <div className="mt-8 flex-1">
          <AttentionPanel />
        </div>
      </div>

      <div className="animate-rise" style={{ animationDelay: "120ms" }}>
        <AIIntelligencePanel />
      </div>
    </section>
  );
}
