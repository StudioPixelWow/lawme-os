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
 * היום — the Morning Workspace.
 * Hero (greeting + attention + עמית) → daily timeline →
 * operational sections → intelligence summary, meetings, finance.
 * Visual implementation with typed mock data (src/modules/today/data.ts).
 */
export default function TodayPage() {
  return (
    <Workspace width="wide">
      <MorningHero dateLine={<TodayDate />} />

      <div className="animate-rise mt-16 md:mt-20" style={{ animationDelay: "200ms" }}>
        <DailyTimeline />
      </div>

      <div
        className="animate-rise mt-16 grid grid-cols-1 gap-8 md:mt-20 lg:grid-cols-3"
        style={{ animationDelay: "280ms" }}
      >
        <ActiveMattersSection />
        <AIInsightsSection />
        <RecentDocumentsSection />
      </div>

      <div
        className="animate-rise mt-16 grid grid-cols-1 gap-8 md:mt-20 lg:grid-cols-3"
        style={{ animationDelay: "360ms" }}
      >
        <DailySummaryPanel />
        <MeetingsPanel />
        <FinancePanel />
      </div>
    </Workspace>
  );
}
