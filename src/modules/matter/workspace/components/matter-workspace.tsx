import type { CSSProperties } from "react";
import type { MatterWorkspaceView } from "../types";
import { MatterHeroBand } from "./hero";
import { DeadlinesSection } from "./deadlines";
import { TimelineSection } from "./timeline";
import { FactsSection } from "./facts";
import { DocumentsSection } from "./documents";
import { ParticipantsSection } from "./participants";
import { EvidenceSection } from "./evidence";
import { AiPanelPlaceholder } from "./ai-panel";

/**
 * The Matter Workspace — the first user-facing LawME screen (Slice 2.0.0).
 * A calm, read-only room composed entirely from persisted Capability-1 data:
 * a navy identity hero, then a two-column canvas. The main column carries the
 * operational read (deadlines → timeline → facts → documents); the rail carries
 * the cast and the reserved assistant region. One choreography, then still.
 */
export function MatterWorkspace({ view }: { view: MatterWorkspaceView }) {
  return (
    <div className="space-y-5">
      <div className="animate-rise" style={{ animationDelay: "0ms" } as CSSProperties}>
        <MatterHeroBand hero={view.hero} />
      </div>

      <div
        className="grid animate-rise gap-5 xl:grid-cols-3"
        style={{ animationDelay: "80ms" } as CSSProperties}
      >
        <div className="space-y-5 xl:col-span-2">
          <DeadlinesSection deadlines={view.deadlines} />
          <TimelineSection timeline={view.timeline} />
          <FactsSection facts={view.facts} />
          <DocumentsSection documents={view.documents} />
        </div>

        <div className="space-y-5">
          <ParticipantsSection participants={view.participants} />
          <EvidenceSection evidence={view.evidence} />
          <AiPanelPlaceholder />
        </div>
      </div>
    </div>
  );
}
