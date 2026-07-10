import type { Metadata } from "next";
import { Workspace } from "@/design-system/patterns/workspace";
import {
  ActiveMattersSection,
  AIInsightsSection,
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

      {/* the surface catches the hero's light; the meridian flows on */}
      <div aria-hidden className="reflection-floor mx-6 -mt-1 h-8 rounded-b-xl md:mx-10" />
      <div aria-hidden className="-mt-2 flex justify-center">
        <span className="h-8 w-px bg-gold-400/60 md:h-10" />
      </div>

      {/* the work — THE main product area */}
      <div className="animate-rise" style={{ animationDelay: "240ms" }}>
        <ActiveMattersSection />
      </div>

      {/* the day */}
      <div className="animate-rise mt-16 md:mt-20" style={{ animationDelay: "300ms" }}>
        <DailyTimeline />
      </div>

      {/* contextual intelligence */}
      <div className="animate-rise mt-16 md:mt-20" style={{ animationDelay: "360ms" }}>
        <AIInsightsSection />
      </div>

      {/* documents requiring action */}
      <div className="animate-rise mt-16 md:mt-20" style={{ animationDelay: "420ms" }}>
        <RecentDocumentsSection />
      </div>

      {/* supporting: meeting preparation + daily summary */}
      <div
        className="animate-rise mt-16 grid grid-cols-1 gap-8 md:mt-20 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
        style={{ animationDelay: "480ms" }}
      >
        <MeetingsPanel />
        <DailySummaryPanel />
      </div>

      {/* the business — executive summary, not a dominant module */}
      <div className="animate-rise mt-16 md:mt-20" style={{ animationDelay: "540ms" }}>
        <FinancePanel />
      </div>
    </Workspace>
  );
}
