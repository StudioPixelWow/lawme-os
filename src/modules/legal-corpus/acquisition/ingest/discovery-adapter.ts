/**
 * Discovery-mode retrieval over ingested-unverified records (Phase 1).
 *
 * Exposes freshly ingested corpus records to Legal Research as DISCOVERY ONLY:
 * every emitted source is `verification: "unverified"` and
 * `usableForClaim: false`. This is the structural guarantee that newly ingested
 * content can be FOUND but can never silently support a legal conclusion —
 * promotion to usable requires the editorial release gates.
 */
import type {
  KnowledgeSourceAdapter,
  AdapterSearchResult,
  CanonicalSource,
  SearchPlan,
  AuthorityLevel,
  BindingClass,
  SourceKind,
  SourceStatus,
} from "../../../legal-research/types.ts";
import type { CanonicalSourceRecord } from "../types.ts";

function authorityLevelFor(r: CanonicalSourceRecord): AuthorityLevel {
  switch (r.authorityTier) {
    case "binding_primary": return "legislation";
    case "persuasive_primary": return "regional";
    case "official_regulatory": return "guidance";
    default: return "secondary";
  }
}
function bindingFor(r: CanonicalSourceRecord): BindingClass {
  if (r.authorityTier === "binding_primary") return "binding";
  if (r.authorityTier === "persuasive_primary") return "persuasive";
  return "informative";
}
function sourceKindFor(r: CanonicalSourceRecord): SourceKind {
  if (r.authorityTier === "official_regulatory") return "ministry_guidance";
  if (r.authorityTier === "firm_internal") return "uploaded_document";
  return "legislation";
}
function statusFor(r: CanonicalSourceRecord): SourceStatus {
  switch (r.currentness) {
    case "current": return "current";
    case "historical": return "historical";
    case "superseded": return "repealed";
    default: return "unknown";
  }
}

function toCanonical(r: CanonicalSourceRecord, matched: readonly string[]): CanonicalSource {
  return {
    sourceId: "ingested-discovery",
    sourceKind: sourceKindFor(r),
    recordId: r.recordId,
    citationHe: r.titleHe ?? r.recordId,
    titleHe: r.titleHe ?? r.recordId,
    authorityLevel: authorityLevelFor(r),
    bindingClass: bindingFor(r),
    court: r.issuingBody,
    dateISO: r.effectiveDate ?? r.decisionDate ?? r.publicationDate,
    sectionHe: null,
    url: r.sourceUrl,
    verification: "unverified", // NEVER "verified" via this path
    usableForClaim: false,      // NEVER usable for a conclusion until promoted
    status: statusFor(r),
    topics: [],
    matchedTerms: matched,
    citationFrequency: 0,
    publisherHe: r.sourceOwner,
    provenanceHe: `${r.sourceOwner} · ${r.acquisitionMode} · ${r.verificationStatus}`,
    limitationsHe: ["רשומה שנקלטה וטרם אומתה — נגישה לגילוי בלבד, אינה מבססת מסקנה."],
  };
}

function matches(r: CanonicalSourceRecord, terms: readonly string[]): string[] {
  const hay = `${r.titleHe ?? ""} ${r.issuingBody ?? ""}`;
  return terms.filter((t) => t.trim().length > 0 && hay.includes(t));
}

/** Build a discovery adapter over an ingested record set. */
export function createIngestedDiscoveryAdapter(
  records: readonly CanonicalSourceRecord[],
): KnowledgeSourceAdapter {
  return {
    id: "ingested-discovery",
    kind: "legislation",
    labelHe: "רשומות שנקלטו (גילוי בלבד)",
    available: true,
    async search(plan: SearchPlan): Promise<AdapterSearchResult> {
      const terms = [...plan.queryTerms, ...plan.topics, ...plan.sections];
      const hits: CanonicalSource[] = [];
      for (const r of records) {
        // discovery is inclusive: match on terms, or return all when no terms
        const m = matches(r, terms);
        if (terms.length === 0 || m.length > 0) hits.push(toCanonical(r, m));
      }
      return {
        sourceId: "ingested-discovery",
        sourceKind: "legislation",
        matchedCount: hits.length,
        sources: hits,
        notesHe: [`רשומות גילוי שנקלטו: ${hits.length} (טרם אומתו)`],
      };
    },
  };
}
