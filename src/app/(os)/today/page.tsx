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
 * היום — the Morning Workspace, built around WORK, not modules.
 * Hierarchy: hero → the active matters command center → today's
 * timeline → AI intelligence + documents → supporting workspaces.
 * Visual implementation with typed mock data (src/modules/today/data.ts).
 */
export default function TodayPage() {
  return (
    <Workspace width="wide">
      <MorningHero dateLine={<TodayDate />} />

      {/* THE main workspace */}
      <div className="animate-rise mt-16 md:mt-24" style={{ animationDelay: "240ms" }}>
        <ActiveMattersSection />
      </div>

      <div className="animate-rise mt-16 md:mt-20" style={{ animationDelay: "300ms" }}>
        <DailyTimeline />
      </div>

      {/* intelligence + documents — asymmetric, not a card grid */}
      <div
        className="animate-rise mt-16 grid grid-cols-1 gap-8 md:mt-20 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
        style={{ animationDelay: "360ms" }}
      >
        <AIInsightsSection />
        <RecentDocumentsSection />
      </div>

      {/* supporting workspaces */}
      <div
        className="animate-rise mt-16 grid grid-cols-1 gap-8 md:mt-20 lg:grid-cols-[minmax(0,4fr)_minmax(0,3fr)_minmax(0,5fr)]"
        style={{ animationDelay: "420ms" }}
      >
        <DailySummaryPanel />
        <MeetingsPanel />
        <FinancePanel />
      </div>
    </Workspace>
  );
}
