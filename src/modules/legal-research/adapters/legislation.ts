/**
 * Legislation adapter (Slice 3.1.0). PURE + DETERMINISTIC. No AI, no DB.
 *
 * The corpus has no standalone legislation catalog, so this adapter derives one
 * from the reviewed SourceLinks embedded in the procedure catalog (the real
 * statute citations + permalinks) keyed by their `E3B-LEG-###` refIds, and by
 * the topic→legislation map. It normalizes every hit into a CanonicalSource.
 */
import { EMPLOYMENT_PROCEDURES } from "../../legal-knowledge/procedure/catalog.ts";
import { allSources } from "../../legal-knowledge/procedure/graph.ts";
import { TOPIC_LEGISLATION } from "../../legal-knowledge/triad/coverage.ts";
import type { SourceLink } from "../../legal-knowledge/procedure/types.ts";
import type { KnowledgeSourceAdapter, SearchPlan, AdapterSearchResult, CanonicalSource } from "../types.ts";

const MAX_RESULTS = 12;

interface LegislationEntry {
  readonly recordId: string;
  readonly citationHe: string;
  readonly url: string | null;
  readonly binding: boolean;
  readonly verified: boolean;
  readonly topics: readonly string[];
}

function buildCatalog(): LegislationEntry[] {
  // refId → topics (reverse of the topic→legislation map)
  const refTopics = new Map<string, Set<string>>();
  for (const [topic, refs] of Object.entries(TOPIC_LEGISLATION)) {
    for (const r of refs) {
      const s = refTopics.get(r) ?? new Set<string>();
      s.add(topic);
      refTopics.set(r, s);
    }
  }

  const byId = new Map<string, LegislationEntry>();
  for (const proc of EMPLOYMENT_PROCEDURES) {
    for (const link of allSources(proc) as SourceLink[]) {
      if (link.kind !== "legislation") continue;
      const recordId = link.refId ?? link.citationHe;
      if (byId.has(recordId)) continue;
      byId.set(recordId, {
        recordId,
        citationHe: link.citationHe,
        url: link.canonicalUrl,
        binding: link.authority === "mandatory_law",
        verified: link.verification === "verified",
        topics: [...(link.refId ? refTopics.get(link.refId) ?? new Set<string>() : new Set<string>())],
      });
    }
  }
  return [...byId.values()].sort((a, b) => a.recordId.localeCompare(b.recordId));
}

const CATALOG: readonly LegislationEntry[] = buildCatalog();

function sectionFromCitation(citation: string): string | null {
  const m = citation.match(/סעיף\s+\S+/);
  return m ? m[0] : null;
}

function matchTerms(entry: LegislationEntry, plan: SearchPlan): string[] {
  const matched = new Set<string>();
  if (plan.refIds.includes(entry.recordId)) matched.add(entry.recordId);
  for (const t of plan.topics) if (entry.topics.includes(t)) matched.add(t);
  for (const q of plan.queryTerms) if (q.length >= 2 && entry.citationHe.includes(q)) matched.add(q);
  return [...matched];
}

function toCanonical(entry: LegislationEntry, matched: string[]): CanonicalSource {
  return {
    sourceId: "legislation",
    sourceKind: "legislation",
    recordId: entry.recordId,
    citationHe: entry.citationHe,
    titleHe: entry.citationHe,
    authorityLevel: "legislation",
    bindingClass: entry.binding ? "binding" : "persuasive",
    court: null,
    dateISO: null,
    sectionHe: sectionFromCitation(entry.citationHe),
    url: entry.url,
    verification: entry.verified ? "verified" : "unverified",
    usableForClaim: entry.verified,
    status: "unknown",
    topics: entry.topics,
    matchedTerms: matched,
    citationFrequency: 0,
    publisherHe: entry.url && entry.url.includes("knesset.gov.il") ? "מאגר החקיקה הלאומי — הכנסת" : null,
    provenanceHe: entry.verified ? "מקור חקיקה עם קישור רשמי" : "אזכור חקיקה — טעון אימות מול הנוסח המעודכן",
    limitationsHe: entry.verified ? [] : ["הנוסח טעון אימות מול מאגר החקיקה המעודכן"],
  };
}

export const legislationAdapter: KnowledgeSourceAdapter = {
  id: "legislation",
  kind: "legislation",
  labelHe: "חקיקה",
  available: true,
  async search(plan: SearchPlan): Promise<AdapterSearchResult> {
    const hits: { entry: LegislationEntry; matched: string[] }[] = [];
    for (const entry of CATALOG) {
      const matched = matchTerms(entry, plan);
      if (matched.length > 0) hits.push({ entry, matched });
    }
    // Deterministic: most matched terms first, then by refId.
    hits.sort((a, b) => b.matched.length - a.matched.length || a.entry.recordId.localeCompare(b.entry.recordId));
    const sources = hits.slice(0, MAX_RESULTS).map((h) => toCanonical(h.entry, h.matched));
    const notesHe = sources.length === 0 ? ["לא אותרה חקיקה תואמת בקורפוס"] : [];
    return { sourceId: "legislation", sourceKind: "legislation", matchedCount: hits.length, sources, notesHe };
  },
};
