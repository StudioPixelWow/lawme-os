/**
 * Publication quality gates + Hebrew restriction-notice detection
 * (LEGAL AI ISRAEL — Phase 2).
 *
 * A document may NOT be published if any gate fails. Restriction detection
 * sends a document to MANUAL REVIEW — it never itself decides legal status.
 */

export interface PublishCandidate {
  sourceUrl: string | null;
  hasProvenance: boolean;
  originalSha256: string | null;
  extractedText: string;
  publicationStatus: "public" | "restricted" | "unknown";
  sourceAccessApproved: boolean;
  removedAtSource: boolean;
  parserConfidence: number;      // 0..1
  canonicalDedupPending: boolean;
  looksLikeCaptcha: boolean;
  looksLikeLogin: boolean;
  looksLikeError: boolean;
}

export interface GateResult {
  publishable: boolean;
  failedGates: readonly string[];
  needsManualReview: boolean;
  restrictionHits: readonly string[];
}

// Hebrew restriction-notice patterns (variants).
const RESTRICTION_PATTERNS: readonly { re: RegExp; label: string }[] = [
  { re: /צו\s+איסור\s+פרסום/, label: "צו איסור פרסום" },
  { re: /איסור\s+פרסום/, label: "איסור פרסום" },
  { re: /פרסום\s+אסור/, label: "פרסום אסור" },
  { re: /אין\s+לפרסם/, label: "אין לפרסם" },
  { re: /בדלתיים\s+סגורות/, label: "בדלתיים סגורות" },
  { re: /חסוי/, label: "חסוי" },
  { re: /קטין(?:ה|ים)?/, label: "קטין" },
  { re: /פרטים\s+מזהים\s+הושמטו/, label: "פרטים מזהים הושמטו" },
];

export function detectRestrictionNotices(text: string): string[] {
  if (!text) return [];
  const hits: string[] = [];
  for (const p of RESTRICTION_PATTERNS) if (p.re.test(text)) hits.push(p.label);
  return hits;
}

const DEFAULT_MIN_CONFIDENCE = 0.5;

export function evaluatePublishGates(
  c: PublishCandidate,
  minConfidence = DEFAULT_MIN_CONFIDENCE,
): GateResult {
  const failed: string[] = [];
  if (!c.sourceUrl) failed.push("no_source_url");
  if (!c.hasProvenance) failed.push("no_provenance");
  if (!c.originalSha256) failed.push("missing_hash");
  if (!c.extractedText || c.extractedText.trim().length === 0) failed.push("empty_text");
  if (c.looksLikeCaptcha) failed.push("captcha_page");
  if (c.looksLikeLogin) failed.push("login_page");
  if (c.looksLikeError) failed.push("error_page");
  if (c.publicationStatus !== "public") failed.push("publication_status_not_public");
  if (!c.sourceAccessApproved) failed.push("source_access_not_approved");
  if (c.removedAtSource) failed.push("removed_at_source");
  if (c.parserConfidence < minConfidence) failed.push("low_parser_confidence");
  if (c.canonicalDedupPending) failed.push("canonical_dedup_pending");

  const restrictionHits = detectRestrictionNotices(c.extractedText);
  if (restrictionHits.length > 0) failed.push("restriction_notice_detected");

  return {
    publishable: failed.length === 0,
    failedGates: failed,
    needsManualReview: restrictionHits.length > 0,
    restrictionHits,
  };
}
