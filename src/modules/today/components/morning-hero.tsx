import type { ReactNode } from "react";
import { AttentionPanel } from "./attention-panel";
import { AIIntelligencePanel } from "./ai-intelligence-panel";

/**
 * The hero composition — the workspace's opening breath.
 * Greeting at the start (right, RTL), generous air, then the
 * attention surface; עמית's intelligence surface at the end.
 */
export function MorningHero({ dateLine }: { dateLine: ReactNode }) {
  return (
    <section
      aria-label="פתיח הבוקר"
      className="grid grid-cols-1 gap-8 lg:grid-cols-[7fr_5fr] lg:gap-10"
    >
      <div className="animate-rise flex flex-col pt-2 lg:pt-6">
        <p className="text-caption font-medium tracking-wide text-foreground-faint">
          {dateLine}
        </p>
        <h1 className="mt-4 text-hero text-balance text-foreground">
          בוקר טוב, דניאל.
        </h1>
        <p className="mt-3 text-subheading text-foreground-soft">
          הנה מה שחשוב היום.
        </p>
        <div className="mt-12 flex-1">
          <AttentionPanel />
        </div>
      </div>

      <div className="animate-rise" style={{ animationDelay: "120ms" }}>
        <AIIntelligencePanel />
      </div>
    </section>
  );
}
