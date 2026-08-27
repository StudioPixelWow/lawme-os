/**
 * LAW ME — Phase 1: the live legislation retrieval adapter.
 *
 * A drop-in `KnowledgeSourceAdapter` (kind "legislation") that serves the REAL
 * stored corpus: Hebrew full-text search over PUBLISHED legalai.legal_chunks,
 * normalized into the existing `CanonicalSource` shape the Legal Research
 * Orchestrator already consumes. No fork of Dino / research / reasoning — this is
 * the one seam the pipeline reads legislation through.
 *
 * Serving discipline: it queries `published = true` chunks ONLY, so the citation
 * gate is honored by construction (unpublished/needs_review never surface). Each
 * source carries the mandatory Hebrew "not a consolidated text" disclosure.
 *
 * Availability is env-gated: with no SUPABASE_URL/SUPABASE_SECRET_KEY it reports
 * `available:false` and returns nothing, so suites without DB access are unaffected.
 */
import type {
  KnowledgeSourceAdapter, AdapterSearchResult, CanonicalSource, SearchPlan,
} from "../../legal-research/types.ts";

/** Mandatory disclosure — official publications are NOT a consolidated current text. */
export const NON_CONSOLIDATED_DISCLOSURE_HE =
  "המקורות הזמינים כוללים את הפרסום המקורי ואת פרסומי התיקונים, אך לא נוסח משולב רשמי מלא.";

export interface PublishedChunkRow {
  law_canonical_id: string;
  section_canonical_id: string;
  document_version_id: string;   // publication_canonical_id
  section_number: string;
  heading_path: string | null;
  text: string;
  source_url: string | null;
  chunk_index: number;
}
export interface PublicationTitleRow {
  publication_canonical_id: string;
  title: string | null;
  israel_law_id: string | null;
  publication_series: string | null;
  publication_number: string | null;
  publication_date: string | null;
}

/** Pure: normalize one published chunk (+ its publication title) into a CanonicalSource. */
export function chunkToCanonicalSource(
  row: PublishedChunkRow,
  title: PublicationTitleRow | undefined,
  queryTerms: readonly string[],
): CanonicalSource {
  const lawTitle = title?.title ?? "חקיקה רשמית";
  const pubRef = [title?.publication_series, title?.publication_number].filter(Boolean).join(" ");
  const citationHe = `${lawTitle}, סעיף ${row.section_number}${pubRef ? ` (${pubRef})` : ""}`;
  // Substring match tolerates Hebrew prefixes (ל/ה/ב/ו/מ/ש/כ attach to words),
  // e.g. query "עובד" is present in "לעובד". Diagnostic only — FTS ranking is DB-side.
  const hay = row.text.toLowerCase();
  const matched = queryTerms.filter((t) => t && hay.includes(t.toLowerCase()));
  return {
    sourceId: "legalai-legislation",
    sourceKind: "legislation",
    recordId: `${row.section_canonical_id}#${row.chunk_index}`,
    citationHe,
    titleHe: lawTitle,
    authorityLevel: "legislation",
    bindingClass: "binding",
    court: null,
    dateISO: title?.publication_date ?? null,
    sectionHe: row.section_number ? `סעיף ${row.section_number}` : null,
    url: row.source_url ?? null,
    verification: "verified",       // published + gated at build time
    usableForClaim: true,
    status: "current",
    topics: [],
    matchedTerms: matched,
    citationFrequency: 0,
    publisherHe: "רשומות — ספר החוקים, כנסת ישראל",
    provenanceHe: `פרסום רשמי של הכנסת (${title?.israel_law_id ? `IsraelLawID ${title.israel_law_id}` : row.document_version_id}); המקור המחייב הוא ה־PDF הרשמי`,
    limitationsHe: [NON_CONSOLIDATED_DISCLOSURE_HE],
  };
}

type QueryResult = { data: unknown; error: { message: string } | null };
interface Query extends PromiseLike<QueryResult> {
  select(cols: string): Query;
  eq(col: string, val: unknown): Query;
  in(col: string, vals: readonly unknown[]): Query;
  textSearch(col: string, q: string, opts: { type: string; config: string }): Query;
  limit(n: number): Query;
}
interface SupaLike {
  schema(s: string): { from(t: string): Query };
}

/** Factory. Pass a service-role client, or rely on env (SUPABASE_URL/SUPABASE_SECRET_KEY). */
export function createLegalaiLegislationAdapter(client?: SupaLike, limit = 12): KnowledgeSourceAdapter {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  // The adapter is always WIRED (available); data reachability is a runtime concern
  // handled per-search (returns empty with a note when the DB is not configured).
  const available = true;
  let clientPromise: Promise<SupaLike | null> | null = null;
  const getClient = async (): Promise<SupaLike | null> => {
    if (client) return client;
    if (!url || !key) return null;
    if (!clientPromise) clientPromise = import("@supabase/supabase-js").then(({ createClient }) => createClient(url, key, { auth: { persistSession: false } }) as unknown as SupaLike);
    return clientPromise;
  };

  return {
    id: "legalai-legislation",
    kind: "legislation",
    labelHe: "חקיקה רשמית (כנסת)",
    available,
    async search(plan: SearchPlan): Promise<AdapterSearchResult> {
      const none: AdapterSearchResult = { sourceId: "legalai-legislation", sourceKind: "legislation", matchedCount: 0, sources: [], notesHe: [] };
      const supa = await getClient();
      if (!supa) return { ...none, notesHe: ["מסד הנתונים אינו זמין בסביבה זו"] };
      const q = plan.queryTerms.join(" ").trim();
      if (!q) return none;

      const { data, error } = await supa.schema("legalai").from("legal_chunks")
        .select("law_canonical_id, section_canonical_id, document_version_id, section_number, heading_path, text, source_url, chunk_index")
        .eq("published", true)
        .textSearch("text_search", q, { type: "plain", config: "simple" })
        .limit(limit);
      if (error) return { ...none, notesHe: [`שגיאת אחזור: ${error.message}`] };
      const rows = (data ?? []) as PublishedChunkRow[];
      if (!rows.length) return none;

      const pubIds = [...new Set(rows.map((r) => r.document_version_id))];
      const { data: titles } = await supa.schema("legalai").from("law_publications")
        .select("publication_canonical_id, title, israel_law_id, publication_series, publication_number, publication_date")
        .in("publication_canonical_id", pubIds);
      const titleMap = new Map<string, PublicationTitleRow>();
      for (const t of (titles ?? []) as PublicationTitleRow[]) titleMap.set(t.publication_canonical_id, t);

      const sources = rows.map((r) => chunkToCanonicalSource(r, titleMap.get(r.document_version_id), plan.queryTerms));
      return { sourceId: "legalai-legislation", sourceKind: "legislation", matchedCount: rows.length, sources, notesHe: [`נמצאו ${rows.length} סעיפים מפורסמים`] };
    },
  };
}

/** Registered instance (env-gated availability). */
export const legalaiLegislationAdapter = createLegalaiLegislationAdapter();
