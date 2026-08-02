/**
 * Supreme Court collector (LEGAL AI ISRAEL) — built against the REAL, audited
 * contract of supremedecisions.court.gov.il (captured via a public browser
 * session: one search, no login, no CAPTCHA, no bypass).
 *
 * CONTRACT (verified 2026-08-02):
 *  - Discovery: POST /Home/SearchVerdicts
 *      headers: Content-Type: application/json, X-Requested-With: XMLHttpRequest
 *      body: { document: {... date window via PublishFrom/PublishTo, SearchText:[] ...}, lan:1 }
 *      → returns an HTML results partial containing, per judgment, links:
 *        /Home/Download?path=NetVerdicts/{y}/{m}/{d}/{case}&fileName={hash}&type={2|4|5}
 *  - Download: GET /Home/Download?...&type=2 (HTML) | 4 (PDF) | 5 (WORD)
 *
 * Judgment text is §6-exempt from copyright. Extends BaseCollector so the
 * enabled+mode guard applies. HTTP is injected → unit-testable offline.
 *
 * IMPORTANT FINDING (2026-08-02): the site is ANTI-BOT protected. A real browser
 * search works, but SERVER-SIDE programmatic POSTs to SearchVerdicts receive a
 * "חסימת בקשה לא מורשית" block page (HTTP 200). We do NOT bypass this (no token
 * spoofing, no challenge defeat). audit()/discover() detect the block and fail
 * closed. The lawful route for this source is public browser automation (which
 * the operator approves) or an official data-feed request — see the audit doc.
 */
import { BaseCollector } from "../base.ts";
import type { CollectorConfig } from "../base.ts";
import type {
  SourceAuditResult, DiscoveryBatch, DiscoveredItem, SourceMetadata,
  DownloadedDocument, NormalizedLegalMetadata,
} from "../types.ts";
import { sha256Hex } from "../../ingest/pipeline.ts";

const BASE = "https://supremedecisions.court.gov.il";

export interface SupremeHttp {
  /** POST JSON, return the response body as text (the endpoint returns HTML). */
  postForHtml(url: string, body: unknown): Promise<{ status: number; text: string }>;
  /** GET binary (a judgment document). */
  getBytes(url: string): Promise<{ bytes: Uint8Array; contentType: string | null }>;
}

const defaultHttp: SupremeHttp = {
  async postForHtml(url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-requested-with": "XMLHttpRequest",
        "user-agent": "LegalAIIsrael-Research/0.1",
      },
      body: JSON.stringify(body),
    });
    return { status: res.status, text: await res.text() };
  },
  async getBytes(url) {
    const res = await fetch(url, { headers: { "user-agent": "LegalAIIsrael-Research/0.1" } });
    if (!res.ok) throw new Error(`download http ${res.status}`);
    return { bytes: new Uint8Array(await res.arrayBuffer()), contentType: res.headers.get("content-type") };
  },
};

/** Build the SearchVerdicts request body for a date window (empty text = all). */
export function buildSearchBody(fromISO: string, toISO: string): unknown {
  return {
    document: {
      Year: null, Month: null, CaseNum: null, Technical: null, fromPages: null, toPages: null,
      dateType: 1, PublishFrom: fromISO, PublishTo: toISO, publishDate: 8,
      translationDateType: 1, translationPublishFrom: fromISO, translationPublishTo: toISO, translationPublishDate: 8,
      SearchText: [], Judges: null,
      Parties: [{ Text: "", textOperator: 2, option: "2", Inverted: false, Synonym: false, NearDistance: 3, MatchOrder: false, CaseNum: null }],
      Old: false, JudgesOperator: 2, Judgment: null, Type: null, CodeTypes: [], CodeJudges: [],
      Inyan: null, CodeInyan: [], AllSubjects: [{ Subject: null, SubSubject: null, SubSubSubject: null }],
      CodeSub2: [], Category1: null, Category3: null, CodeCategory3: [], OldMainNumFormat: false,
      Volume: null, Subjects: null, SubSubjects: null, SubSubSubjects: null,
    },
    lan: 1,
  };
}

export interface VerdictRef {
  path: string;
  fileName: string;
}

export class SupremeCourtBlockedError extends Error {
  constructor() {
    super("supremedecisions.court.gov.il blocked the programmatic request (anti-bot). Not bypassed.");
    this.name = "SupremeCourtBlockedError";
  }
}

/** The site returns a "חסימת בקשה לא מורשית" page (HTTP 200) to programmatic
 *  requests. Detect it so we never treat a block as a success — and never try
 *  to defeat it (that would be bypassing a protection mechanism). */
export function isBlockPage(html: string): boolean {
  return /חסימת\s*בקשה|לא\s*מורשית/.test(html);
}

/** Parse the results HTML for unique judgment references (via the type=2 links). */
export function parseVerdictRefs(html: string): VerdictRef[] {
  const re = /Home\/Download\?path=([^&"'\s]+)&fileName=([^&"'\s]+)&type=2/g;
  const seen = new Set<string>();
  const out: VerdictRef[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const path = decodeURIComponent(m[1]);
    const fileName = m[2];
    const key = `${path}|${fileName}`;
    if (!seen.has(key)) { seen.add(key); out.push({ path, fileName }); }
  }
  return out;
}

function downloadUrl(ref: VerdictRef, type: 2 | 4 | 5): string {
  return `${BASE}/Home/Download?path=${encodeURIComponent(ref.path)}&fileName=${ref.fileName}&type=${type}`;
}

export class SupremeCourtCollector extends BaseCollector {
  private readonly http: SupremeHttp;
  constructor(config: CollectorConfig, http: SupremeHttp = defaultHttp) {
    super(config);
    this.http = http;
  }

  async audit(): Promise<SourceAuditResult> {
    try {
      // A tiny 1-day window probe — success = the search endpoint is reachable.
      const body = buildSearchBody("2026-07-31T00:00:00.000Z", "2026-08-01T00:00:00.000Z");
      const { status, text } = await this.http.postForHtml(`${BASE}/Home/SearchVerdicts`, body);
      // HTTP 200 is NOT success here: the site returns a block page (200) to
      // programmatic access. Verified: server-side requests are anti-bot blocked.
      if (isBlockPage(text)) {
        return {
          reachable: true, hasPublicApi: false, apiKind: "rest", requiresLogin: false, hasCaptcha: false,
          robotsChecked: false, robotsAllowsPath: "unknown", termsChecked: false,
          automatedAccessStatus: "prohibited", decision: "NO_GO",
          notesHe: "האתר חוסם גישה תוכנתית ל-API (anti-bot). דפדפן אמיתי עובד; אין לעקוף. מסלול חוקי: אוטומציית דפדפן ציבורית או בקשת feed רשמי.",
        };
      }
      const hasResults = status === 200 && /Home\/Download/.test(text);
      return {
        reachable: status === 200, hasPublicApi: hasResults, apiKind: "rest", requiresLogin: false, hasCaptcha: false,
        robotsChecked: false, robotsAllowsPath: "unknown", termsChecked: false,
        automatedAccessStatus: hasResults ? "apparently_allowed" : "unclear",
        decision: hasResults ? "LIMITED_GO" : "NO_GO",
        notesHe: hasResults ? "SearchVerdicts החזיר תוצאות עם קישורי הורדה." : `לא זוהו תוצאות (status ${status}).`,
      };
    } catch (e) {
      return {
        reachable: false, hasPublicApi: false, apiKind: "rest", requiresLogin: false, hasCaptcha: false,
        robotsChecked: false, robotsAllowsPath: "unknown", termsChecked: false,
        automatedAccessStatus: "unclear", decision: "NO_GO", notesHe: `שגיאה: ${String((e as Error).message)}`,
      };
    }
  }

  protected async doDiscover(cursor?: string): Promise<DiscoveryBatch> {
    // cursor encodes the date window "fromISO|toISO"; default = last 7 days is
    // set by the runner, not here. Without a cursor we cannot invent a window.
    if (!cursor) throw new Error("discover requires a date-window cursor 'fromISO|toISO'");
    const [fromISO, toISO] = cursor.split("|");
    const body = buildSearchBody(fromISO, toISO);
    const { status, text } = await this.http.postForHtml(`${BASE}/Home/SearchVerdicts`, body);
    // Never treat the anti-bot block page as an empty result — surface it.
    if (isBlockPage(text)) throw new SupremeCourtBlockedError();
    if (status !== 200) return { items: [], nextCursor: null, windowLabel: `${fromISO}..${toISO} (status ${status})` };
    const refs = parseVerdictRefs(text);
    const items: DiscoveredItem[] = refs.map((r) => ({
      externalId: `${r.path}|${r.fileName}`,
      url: downloadUrl(r, 2),
      caseNumberRaw: null, // resolved from the document text by the pipeline
      courtName: "בית המשפט העליון",
      proceedingType: null,
      decisionDate: null,
    }));
    return { items, nextCursor: null, windowLabel: `${fromISO}..${toISO} (${items.length})` };
  }

  protected async doDownload(item: DiscoveredItem): Promise<DownloadedDocument> {
    const [path, fileName] = (item.externalId ?? "").split("|");
    if (!path || !fileName) throw new Error("bad verdict ref");
    const url = downloadUrl({ path, fileName }, 2); // HTML text layer
    const { bytes, contentType } = await this.http.getBytes(url);
    return { bytes, mimeType: contentType ?? "text/html", sha256: sha256Hex(bytes), sourceUrl: url };
  }

  protected async doNormalizeMetadata(metadata: SourceMetadata): Promise<NormalizedLegalMetadata> {
    void metadata;
    return {
      caseNumberNormalized: null, courtName: "בית המשפט העליון", courtLevel: "supreme",
      decisionDate: null, documentType: "judgment",
      publicationAllowed: true, // official Supreme Court publication, §6-exempt
      eligibleForPublicCorpus: false, // enters ingested_unverified until reviewed
    };
  }
}

export function createSupremeCourtDiscoveryCollector(http?: SupremeHttp): SupremeCourtCollector {
  // discovery-mode default: metadata/discovery only; downloads need a download mode.
  return new SupremeCourtCollector({ code: "supreme_court", mode: "public_search_pilot", enabled: true }, http);
}
