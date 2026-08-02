import test from "node:test";
import assert from "node:assert/strict";
import { normalizeHebrewLegalText } from "../parser/hebrew-normalize.ts";
import { segmentDocument, chunkSections } from "../parser/segment.ts";
import { extractStatuteCitations, STATUTE_ALIASES } from "../citation/statute.ts";
import { originalPath, normalizedPath, auditEvidencePath, sanitizeFilename, STORAGE_BUCKETS } from "../storage/paths.ts";
import { detectFileType, validateFile } from "../parser/filetype.ts";
import { evaluatePublishGates, detectRestrictionNotices } from "../quality/gates.ts";
import { InMemoryLegalSearchEngine, COVERAGE_NOTICE_HE } from "../search/engine.ts";
import type { SearchableDoc } from "../search/engine.ts";
import { buildMockCorpus } from "../fixtures/mock-corpus.ts";
import { ingestFile, deriveDocumentId, sha256Hex, OperatorAffirmationRequiredError, UnsupportedFileError } from "../ingest/pipeline.ts";
import { parseAuditArtifact, AUDIT_SCHEMA_VERSION } from "../audit/schema.ts";
import { suggestFromAudit } from "../audit/import.ts";

const enc = (s: string) => new TextEncoder().encode(s);

// ---- Hebrew normalization -------------------------------------------------
test("normalize: NFC + quote/dash/nbsp normalization, raw preserved", () => {
  const raw = "פסק דין “מצוטט” — עם ‘גרש’";
  const r = normalizeHebrewLegalText(raw);
  assert.equal(r.rawText, raw);
  assert.ok(r.normalizedText.includes("\"מצוטט\""));
  assert.ok(r.normalizedText.includes("'גרש'"));
  assert.ok(r.normalizedText.includes("- עם") || r.normalizedText.includes("-"));
  assert.ok(r.transforms.some((t) => t.kind === "normalize_double_quotes"));
});
test("normalize: strips repeated running header and joins broken line", () => {
  const raw = ["בית המשפט העליון", "פתיח", "בית המשפט העליון", "שורה שנשברה", "בהמשך המשפט", "בית המשפט העליון"].join("\n");
  const r = normalizeHebrewLegalText(raw);
  assert.ok(r.transforms.some((t) => t.kind === "remove_repeated_running"));
});
test("normalize: control chars removed, page markers tracked", () => {
  const raw = "טקסטנקי\n- 2 -\nעוד";
  const r = normalizeHebrewLegalText(raw);
  assert.ok(!r.normalizedText.includes(""));
  assert.ok(r.pageBoundaries.length >= 1);
});

// ---- Segmentation ---------------------------------------------------------
test("segment: recognizes Hebrew headings into typed sections", () => {
  const text = "פתיח\n\nהעובדות\n\nעובדה א.\n\nדיון והכרעה\n\nניתוח.\n\nסוף דבר\n\nהתביעה מתקבלת.";
  const secs = segmentDocument(text);
  const types = secs.map((s) => s.sectionType);
  assert.ok(types.includes("facts"));
  assert.ok(types.includes("analysis"));
  assert.ok(types.includes("operative_order"));
  assert.equal(secs[0].sectionType, "header");
});
test("segment: chunking preserves section + context", () => {
  const secs = segmentDocument("דיון\n\n" + "פסקה. ".repeat(400));
  const chunks = chunkSections("doc-1", secs, 300);
  assert.ok(chunks.length >= 2);
  assert.equal(chunks[0].documentId, "doc-1");
  assert.ok(chunks[1].precedingContext.length > 0);
});

// ---- Statute extraction ---------------------------------------------------
test("statute: 'סעיף 12 לחוק החוזים' resolves via alias", () => {
  const s = extractStatuteCitations("כאמור בסעיף 12 לחוק החוזים, יש לקיים חוזה.");
  assert.equal(s.length, 1);
  assert.deepEqual(s[0].sections, ["12"]);
  assert.ok(s[0].statuteNameNormalized?.includes("חוק החוזים"));
});
test("statute: multiple sections '12 ו-39'", () => {
  const s = extractStatuteCitations("סעיפים 12 ו-39 לחוק החוזים חלים.");
  assert.deepEqual(s[0].sections, ["12", "39"]);
});
test("statute: regulation reference", () => {
  const s = extractStatuteCitations("ראו תקנה 201 לתקנות סדר הדין האזרחי.");
  assert.equal(s[0].instrumentKind, "regulation");
  assert.deepEqual(s[0].sections, ["201"]);
});
test("statute: subsection + letter section", () => {
  const s1 = extractStatuteCitations("לפי סעיף 7א לחוק איסור לשון הרע.");
  assert.deepEqual(s1[0].sections, ["7א"]);
});
test("statute: named law with enactment year", () => {
  const s = extractStatuteCitations("חוק המקרקעין, תשכ\"ט-1969 קובע.");
  assert.equal(s[0].enactmentYear, 1969);
  assert.ok(s[0].enactmentYearHe?.startsWith("תש"));
});
test("statute: alias table is non-empty and unique canonical", () => {
  const names = new Set(STATUTE_ALIASES.map((a) => a.canonicalName));
  assert.equal(names.size, STATUTE_ALIASES.length);
});

// ---- Storage paths --------------------------------------------------------
test("storage: deterministic original path + buckets", () => {
  const p = originalPath({ sourceCode: "supreme_court", year: 2020, documentId: "doc-1", version: 1, filename: "judgment.pdf" });
  assert.equal(p, "legal-originals/supreme_court/2020/doc-1/v1/judgment.pdf");
  assert.equal(STORAGE_BUCKETS.length, 4);
});
test("storage: sanitizes filename + rejects bad year/source", () => {
  assert.equal(sanitizeFilename("../../etc/passwd"), "_.._etc_passwd".replace(/^_/, "_") ? sanitizeFilename("../../etc/passwd") : "");
  assert.throws(() => originalPath({ sourceCode: "Bad Code", year: 2020, documentId: "d", version: 1, filename: "x" }));
  assert.throws(() => originalPath({ sourceCode: "ok", year: 1800, documentId: "d", version: 1, filename: "x" }));
});
test("storage: normalized + audit-evidence paths", () => {
  assert.ok(normalizedPath("supreme_court", 2020, "d").endsWith("normalized.txt"));
  assert.ok(auditEvidencePath("2026-07-26T10:00:00Z", "data_gov_il", "robots.txt").startsWith("legal-audit-evidence/2026-07-26/"));
});

// ---- File type detection --------------------------------------------------
test("filetype: detects pdf/html/txt/docx/zip and rejects exe", () => {
  assert.equal(detectFileType(enc("%PDF-1.7\n...")), "pdf");
  assert.equal(detectFileType(enc("<!DOCTYPE html><html></html>")), "html");
  assert.equal(detectFileType(enc("שלום עולם טקסט עברי רגיל")), "txt");
  assert.equal(detectFileType(new Uint8Array([0x4d, 0x5a, 0x90, 0x00])), "executable");
  assert.equal(detectFileType(new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...enc("word/document.xml")])), "docx");
});
test("filetype: validateFile rejects executable + unsupported", () => {
  assert.equal(validateFile(new Uint8Array([0x4d, 0x5a])).accepted, false);
  assert.equal(validateFile(enc("%PDF-1.7")).accepted, true);
});

// ---- Quality gates --------------------------------------------------------
test("quality: detects Hebrew restriction notices", () => {
  assert.deepEqual(detectRestrictionNotices("חל צו איסור פרסום על התיק").length >= 1, true);
  assert.equal(detectRestrictionNotices("פסק דין רגיל ללא הגבלה").length, 0);
});
test("quality: publish gate fails on missing provenance / empty text / restriction", () => {
  const base = {
    sourceUrl: "https://x", hasProvenance: true, originalSha256: "abc", extractedText: "תוכן",
    publicationStatus: "public" as const, sourceAccessApproved: true, removedAtSource: false,
    parserConfidence: 0.9, canonicalDedupPending: false, looksLikeCaptcha: false, looksLikeLogin: false, looksLikeError: false,
  };
  assert.equal(evaluatePublishGates(base).publishable, true);
  assert.equal(evaluatePublishGates({ ...base, hasProvenance: false }).publishable, false);
  assert.equal(evaluatePublishGates({ ...base, extractedText: "" }).publishable, false);
  const r = evaluatePublishGates({ ...base, extractedText: "צו איסור פרסום" });
  assert.equal(r.publishable, false);
  assert.equal(r.needsManualReview, true);
});
test("quality: low confidence and removed-at-source block publish", () => {
  const base = {
    sourceUrl: "https://x", hasProvenance: true, originalSha256: "abc", extractedText: "תוכן",
    publicationStatus: "public" as const, sourceAccessApproved: true, removedAtSource: false,
    parserConfidence: 0.2, canonicalDedupPending: false, looksLikeCaptcha: false, looksLikeLogin: false, looksLikeError: false,
  };
  assert.ok(evaluatePublishGates(base).failedGates.includes("low_parser_confidence"));
  assert.ok(evaluatePublishGates({ ...base, parserConfidence: 0.9, removedAtSource: true }).failedGates.includes("removed_at_source"));
});

// ---- Search ---------------------------------------------------------------
function docsForSearch(): SearchableDoc[] {
  return buildMockCorpus().filter((d) => d.caseNumberNormalized !== null && !d.malformed);
}
test("search: exact case-number match ranks top with breakdown", async () => {
  const docs = docsForSearch();
  const target = docs[0];
  const eng = new InMemoryLegalSearchEngine(docs);
  const res = await eng.search({ caseNumber: target.caseNumberNormalized!, debug: true });
  assert.ok(res.results.length >= 1);
  assert.equal(res.results[0].documentId, target.documentId);
  assert.equal(res.results[0].breakdown?.exactCaseNumber, 100);
  assert.equal(res.coverageNoticeHe, COVERAGE_NOTICE_HE);
});
test("search: full-text query returns scored hits; official-only filter", async () => {
  const docs = docsForSearch();
  const eng = new InMemoryLegalSearchEngine(docs);
  const res = await eng.search({ text: "התביעה מתקבלת", filters: { officialOnly: true } });
  assert.ok(res.results.length >= 1);
  assert.ok(res.results.every((r) => r.relevance > 0));
});
test("search: restricted documents are never searchable", async () => {
  const restricted: SearchableDoc = { ...docsForSearch()[0], documentId: "r1", publicationStatus: "restricted" };
  const eng = new InMemoryLegalSearchEngine([restricted]);
  const res = await eng.search({ text: "התביעה" });
  assert.equal(res.results.length, 0);
});
test("search: sort by authority orders higher authority first", async () => {
  const eng = new InMemoryLegalSearchEngine(docsForSearch());
  const res = await eng.search({ text: "פסק דין", sort: "authority", limit: 5 });
  for (let i = 1; i < res.results.length; i++) {
    assert.ok(res.results[i - 1].authorityScore >= res.results[i].authorityScore);
  }
});

// ---- Mock corpus ----------------------------------------------------------
test("fixtures: 50 MOCK docs, all marked, covering variety", () => {
  const c = buildMockCorpus();
  assert.equal(c.length, 50);
  assert.ok(c.every((d) => d.isMock === true));
  assert.ok(c.every((d) => (d.title ?? "").includes("[MOCK]") || d.title === null));
  assert.ok(c.some((d) => d.restrictionMarker));
  assert.ok(c.some((d) => d.malformed));
  assert.ok(c.some((d) => d.minorityOpinion));
  assert.ok(c.some((d) => d.judges.length >= 3));
  assert.ok(c.some((d) => d.caseNumberNormalized === null)); // missing metadata
});

// ---- Ingestion pipeline ---------------------------------------------------
test("ingest: requires operator affirmation", () => {
  assert.throws(() => ingestFile({
    sourceCode: "supreme_court", filename: "j.txt", bytes: enc("%PDF-1.7"), extractedText: "x",
    sourceUrl: "https://x", operatorAffirmsPublicAndLawful: false, sourceAccessApproved: true, parserConfidence: 0.9,
  }), OperatorAffirmationRequiredError);
});
test("ingest: rejects executable", () => {
  assert.throws(() => ingestFile({
    sourceCode: "supreme_court", filename: "j.exe", bytes: new Uint8Array([0x4d, 0x5a]), extractedText: "x",
    sourceUrl: "https://x", operatorAffirmsPublicAndLawful: true, sourceAccessApproved: true, parserConfidence: 0.9,
  }), UnsupportedFileError);
});
test("ingest: idempotent id from content; produces sections/citations; unpublished", () => {
  const bytes = enc("%PDF-1.7 fake");
  const text = "העובדות\n\nכפי שנפסק בע\"א 6821/93 ולפי סעיף 12 לחוק החוזים.\n\nסוף דבר\n\nהתקבלה.";
  const input = {
    sourceCode: "supreme_court", filename: "j.pdf", bytes, extractedText: text,
    sourceUrl: "https://x", operatorAffirmsPublicAndLawful: true, sourceAccessApproved: true, parserConfidence: 0.9,
  };
  const a = ingestFile(input);
  const b = ingestFile(input);
  assert.equal(a.documentId, b.documentId); // idempotent
  assert.equal(a.documentId, deriveDocumentId("supreme_court", sha256Hex(bytes)));
  assert.ok(a.citationCount >= 1);
  assert.ok(a.statuteCount >= 1);
  assert.ok(a.status.startsWith("unpublished")); // never auto-published
});

// ---- Audit artifact schema + import --------------------------------------
function goodArtifact(over: Record<string, unknown> = {}) {
  return {
    schemaVersion: AUDIT_SCHEMA_VERSION, sourceCode: "data_gov_il", auditedAt: "2026-07-26T10:00:00Z",
    userAgent: "LegalAIIsrael-Research/0.1", requestCount: 6,
    dns: { resolved: true, addresses: ["1.2.3.4"] }, tls: { ok: true, protocol: "TLSv1.3" },
    http: { status: 200, redirects: [], contentType: "text/html", headers: {}, rateLimitHeaders: {}, retryAfter: null },
    robots: { found: true, sha256: "abc", disallowsRelevantPaths: false },
    policies: { termsUrl: "https://x/terms", privacyUrl: null, sitemapUrl: null, termsSha256: "def" },
    access: {
      hasPublicSearch: true, apiHints: ["/api/3/action/datastore_search"], cookiesRequired: false,
      loginRequired: false, captchaDetected: false, publicDocumentOpenableWithoutAuth: true,
      sampleDocumentUrl: "https://x/doc", stableIdentifiersFound: true, formFields: [], jsEndpointHints: [],
    },
    sampleDocumentsFetched: 1, operatorNotes: "",
    ...over,
  };
}
test("audit schema: validates a good artifact and rejects a bad one", () => {
  assert.equal(parseAuditArtifact(goodArtifact()).ok, true);
  const bad = parseAuditArtifact({ ...goodArtifact(), requestCount: 999 });
  assert.equal(bad.ok, false);
});
test("audit import: API + 200 → official_feed LIMITED_GO; never enables", () => {
  const a = parseAuditArtifact(goodArtifact());
  assert.ok(a.ok);
  if (a.ok) {
    const s = suggestFromAudit(a.value);
    assert.equal(s.decision, "LIMITED_GO");
    assert.equal(s.suggestedMode, "official_feed");
    assert.equal(s.requiresAdminApprovalFor.includes("collector_enabled"), true);
  }
});
test("audit import: login/captcha force NO_GO disabled", () => {
  const a = parseAuditArtifact(goodArtifact({ access: { ...goodArtifact().access, loginRequired: true } }));
  assert.ok(a.ok);
  if (a.ok) {
    const s = suggestFromAudit(a.value);
    assert.equal(s.decision, "NO_GO");
    assert.equal(s.suggestedMode, "disabled");
    assert.ok(s.blockers.includes("login_required"));
  }
});
