import type { Metadata } from "next";
import { Workspace } from "@/design-system/patterns/workspace";
import {
  ActiveMattersSection,
  AIInsightsSection,
  AIIntelligencePanel,
  DailySummaryPanel,
  DailyTimeline,
  FinancePanel,
  MeetingsPanel,
  MorningHero,
  RecentDocumentsSection,
} from "@/modules/today";
import { TodayDate } from "./today-date";

export const metadata: Metadata = { title: "היום" };

/**
 * היום — the Morning Workspace, day-oriented and action-oriented.
 * Hierarchy: dark mission hero → today's timeline (the day) →
 * active matters (the work) → contextual intelligence → documents →
 * meeting preparation → finance. Typed mock data only.
 */
export default function TodayPage() {
  return (
    <Workspace width="wide">
      <MorningHero dateLine={<TodayDate />} />

      {/* the bridge: the mission continues into the day's timeline */}
      <div aria-hidden className="flex justify-center">
        <span className="h-12 w-px bg-gold-400/60 md:h-16" />
      </div>

      {/* the day */}
      <div className="animate-rise" style={{ animationDelay: "240ms" }}>
        <DailyTimeline />
      </div>

      {/* the work — THE main workspace */}
      <div className="animate-rise mt-20 md:mt-28" style={{ animationDelay: "300ms" }}>
        <ActiveMattersSection />
      </div>

      {/* contextual intelligence */}
      <div
        className="animate-rise mt-20 grid grid-cols-1 gap-8 md:mt-28 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
        style={{ animationDelay: "360ms" }}
      >
        <AIIntelligencePanel />
        <AIInsightsSection />
      </div>

      {/* documents — a workspace, not a list */}
      <div className="animate-rise mt-20 md:mt-28" style={{ animationDelay: "420ms" }}>
        <RecentDocumentsSection />
      </div>

      {/* meeting preparation + daily summary */}
      <div
        className="animate-rise mt-20 grid grid-cols-1 gap-8 md:mt-28 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
        style={{ animationDelay: "480ms" }}
      >
        <MeetingsPanel />
        <DailySummaryPanel />
      </div>

      {/* the business */}
      <div className="animate-rise mt-20 md:mt-28" style={{ animationDelay: "540ms" }}>
        <FinancePanel />
      </div>
    </Workspace>
  );
}
