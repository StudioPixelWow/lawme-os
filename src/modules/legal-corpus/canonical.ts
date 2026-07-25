/**
 * Verified-corpus → Legal Research adapter (P1-S1 Phase 9).
 *
 * A drop-in `KnowledgeSourceAdapter` that serves VERIFIED legislation for the
 * two covered doctrines from the verified corpus. It emits CanonicalSource
 * records with `verification: "verified"` and `usableForClaim: true` so the
 * Legal Research Orchestrator (and hence LegalOpinion) can consume real
 * verified provisions instead of the planning catalog.
 *
 * INTEGRATION NOTE: this adapter is provided and unit-proven but deliberately
 * NOT registered into DEFAULT_ADAPTERS in this slice, so the frozen research/
 * reasoning/reasoned suites remain green. Flipping the registration is the
 * one-line live-pipeline cutover (its own regression run) — see the P1-S1
 * implementation record.
 */
import type {
  KnowledgeSourceAdapter,
  AdapterSearchResult,
  CanonicalSource,
  SearchPlan,
} from "../legal-research/types.ts";
import type { DoctrineId } from "./types.ts";
import { VerifiedCorpusStore, verifiedCorpus, type ResolvedProvision } from "./store.ts";
import { classifyDoctrine } from "./answer.ts";

function doctrineFromPlan(plan: SearchPlan): DoctrineId | null {
  const hay = [...plan.queryTerms, ...plan.topics, ...plan.sections].join(" ");
  return classifyDoctrine(hay);
}

function toCanonical(r: ResolvedProvision): CanonicalSource {
  const titleHe =
    r.source.sourceId === "vlc-notice-2002"
      ? "חוק הודעה לעובד ולמועמד לעבודה (תנאי עבודה והליכי מיון וקבלה לעבודה)"
      : "חוק שכר מינימום";
  return {
    sourceId: "verified-legislation",
    sourceKind: "legislation",
    recordId: r.provision.provisionId,
    citationHe: `${titleHe}, ${r.pinpoint.provisionOrParagraph}`,
    titleHe,
    authorityLevel: "legislation",
    bindingClass: "binding",
    court: null,
    dateISO: r.version.effectiveDate,
    sectionHe: r.pinpoint.provisionOrParagraph,
    url: r.version.permalink,
    verification: "verified",
    usableForClaim: r.canSupport,
    status: "current",
    topics: [],
    matchedTerms: [],
    citationFrequency: 0,
    publisherHe: "מקור חקיקה מאומת",
    provenanceHe: r.source.provenance,
    limitationsHe: r.pinpoint.pinpointStatus === "none" ? ["אין הפניה נקודתית מאומתת לסעיף"] : [],
  };
}

export function createVerifiedLegislationAdapter(
  store: VerifiedCorpusStore = verifiedCorpus,
  asOfISO = "2026-07-25T09:00:00+03:00",
): KnowledgeSourceAdapter {
  return {
    id: "verified-legislation",
    kind: "legislation",
    labelHe: "חקיקה מאומתת",
    available: true,
    async search(plan: SearchPlan): Promise<AdapterSearchResult> {
      const doctrineId = doctrineFromPlan(plan);
      if (doctrineId === null || !store.coveredDoctrines().includes(doctrineId)) {
        return { sourceId: "verified-legislation", sourceKind: "legislation", matchedCount: 0, sources: [], notesHe: ["מחוץ לתחום המכוסה"] };
      }
      const resolved = store.resolve(doctrineId, asOfISO).filter((r) => r.canSupport);
      return {
        sourceId: "verified-legislation",
        sourceKind: "legislation",
        matchedCount: resolved.length,
        sources: resolved.map(toCanonical),
        notesHe: [`חקיקה מאומתת עבור ${doctrineId}`],
      };
    },
  };
}
