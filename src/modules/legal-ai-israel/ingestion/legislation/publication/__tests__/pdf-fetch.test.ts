/**
 * Tests for the SSRF-guarded PDF fetch policy + extraction pipeline.
 * The HTTP transport and PDF/OCR engines are injected — fully offline.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assertUrlAllowed,
  fetchPdf,
  fetchPdfWithRetry,
  DEFAULT_PDF_POLICY,
} from "../pdf-fetch.ts";
import type { HttpClient, HttpResponse } from "../pdf-fetch.ts";
import { extractPdf } from "../pdf-extract.ts";
import type { PdfEngines } from "../pdf-extract.ts";

const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35]); // "%PDF-1.5"
const okPdf: HttpClient = async () => ({
  status: 200,
  headers: { "content-type": "application/pdf" },
  body: PDF_BYTES,
});

test("SSRF guard rejects non-HTTPS, off-allowlist, IP, userinfo, ports", () => {
  assert.throws(() => assertUrlAllowed("http://fs.knesset.gov.il/a.pdf", DEFAULT_PDF_POLICY));
  assert.throws(() => assertUrlAllowed("https://evil.example/a.pdf", DEFAULT_PDF_POLICY));
  assert.throws(() => assertUrlAllowed("https://93.184.216.34/a.pdf", DEFAULT_PDF_POLICY));
  assert.throws(() => assertUrlAllowed("https://u:p@fs.knesset.gov.il/a.pdf", DEFAULT_PDF_POLICY));
  assert.throws(() => assertUrlAllowed("https://fs.knesset.gov.il:8443/a.pdf", DEFAULT_PDF_POLICY));
  assert.ok(assertUrlAllowed("https://fs.knesset.gov.il/9/law/x.PDF", DEFAULT_PDF_POLICY));
});

test("fetchPdf returns sha256 + bytes for a valid PDF", async () => {
  const res = await fetchPdf("https://fs.knesset.gov.il/9/law/x.PDF", okPdf);
  assert.ok(res.ok);
  if (res.ok) {
    assert.equal(res.size, 8);
    assert.match(res.sha256, /^[0-9a-f]{64}$/);
    assert.ok(res.contentType.includes("application/pdf"));
  }
});

test("rejects wrong content-type and missing magic bytes", async () => {
  const htmlClient: HttpClient = async () => ({ status: 200, headers: { "content-type": "text/html" }, body: PDF_BYTES });
  const r1 = await fetchPdf("https://fs.knesset.gov.il/a.PDF", htmlClient);
  assert.equal(r1.ok, false);

  const notPdf: HttpClient = async () => ({ status: 200, headers: { "content-type": "application/pdf" }, body: new Uint8Array([1, 2, 3, 4]) });
  const r2 = await fetchPdf("https://fs.knesset.gov.il/a.PDF", notPdf);
  assert.equal(r2.ok, false);
});

test("403/404/429 are non-retriable; 5xx and network are retriable", async () => {
  const mk = (status: number): HttpClient => async () => ({ status, headers: {} });
  for (const s of [403, 404, 429]) {
    const r = await fetchPdf("https://fs.knesset.gov.il/a.PDF", mk(s));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.retriable, false, `status ${s} must not retry`);
  }
  const r5 = await fetchPdf("https://fs.knesset.gov.il/a.PDF", mk(503));
  assert.equal(r5.ok, false);
  if (!r5.ok) assert.equal(r5.retriable, true);
});

test("redirects are followed and re-validated; off-allowlist redirect blocked", async () => {
  let hops = 0;
  const redirecting: HttpClient = async (url): Promise<HttpResponse> => {
    if (url.includes("fs.knesset.gov.il/start")) {
      hops += 1;
      return { status: 302, headers: {}, location: "https://fs.knesset.gov.il/final.PDF" };
    }
    return { status: 200, headers: { "content-type": "application/pdf" }, body: PDF_BYTES };
  };
  const ok = await fetchPdf("https://fs.knesset.gov.il/start", redirecting);
  assert.ok(ok.ok);
  assert.equal(hops, 1);

  const evilRedirect: HttpClient = async () => ({ status: 302, headers: {}, location: "https://evil.example/x.PDF" });
  const blocked = await fetchPdf("https://fs.knesset.gov.il/start", evilRedirect);
  assert.equal(blocked.ok, false);
});

test("retry only fires on retriable results and stops on success/hard error", async () => {
  let calls = 0;
  const flaky: HttpClient = async (): Promise<HttpResponse> => {
    calls += 1;
    if (calls < 3) return { status: 503, headers: {} };
    return { status: 200, headers: { "content-type": "application/pdf" }, body: PDF_BYTES };
  };
  const res = await fetchPdfWithRetry("https://fs.knesset.gov.il/a.PDF", flaky, DEFAULT_PDF_POLICY, {
    maxAttempts: 5,
    backoffMs: () => 0,
    sleep: async () => {},
  });
  assert.ok(res.ok);
  assert.equal(calls, 3);

  let calls404 = 0;
  const hard: HttpClient = async () => {
    calls404 += 1;
    return { status: 404, headers: {} };
  };
  const r404 = await fetchPdfWithRetry("https://fs.knesset.gov.il/a.PDF", hard, DEFAULT_PDF_POLICY, {
    maxAttempts: 5,
    backoffMs: () => 0,
    sleep: async () => {},
  });
  assert.equal(r404.ok, false);
  assert.equal(calls404, 1); // never retried
});

test("extraction uses text layer and only falls back to OCR when empty", async () => {
  const richText =
    'חוק לדוגמה, התשפ"ה-2025\n\n1. הגדרה\nבחוק זה, "אדם" — יחיד או תאגיד, לכל דבר ועניין. ' +
    'הוראה זו נכתבה כדי למלא את סף המינימום של מספר התווים הנדרש כדי שהטקסט ייחשב כבעל שכבת טקסט ' +
    'תקינה, ולכן אין להפעיל עליו OCR. הפִּסקה כוללת די והותר תוכן משפטי לדוגמה כדי לעבור את הסף הזה בבירור.';
  const engines: PdfEngines = {
    readTextLayer: async () => ({ text: richText, textLayerCoverage: 1, pageCount: 1 }),
    ocr: async () => ({ text: "OCR", meanConfidence: 0.9 }),
  };
  const res = await extractPdf(PDF_BYTES, engines);
  assert.equal(res.usedOcr, false);
  assert.ok(res.stagesRun.includes("structural"));
  assert.equal(res.status, "extracted");

  const scanned: PdfEngines = {
    readTextLayer: async () => ({ text: "", textLayerCoverage: 0, pageCount: 3 }),
    ocr: async () => ({ text: richText, meanConfidence: 0.72 }),
  };
  const res2 = await extractPdf(PDF_BYTES, scanned);
  assert.equal(res2.usedOcr, true);
  assert.equal(res2.status, "needs_review");
  assert.equal(res2.ocrConfidence, 0.72);
});

test("no text layer and no OCR engine → no_text, never fabricated", async () => {
  const engines: PdfEngines = {
    readTextLayer: async () => ({ text: "", textLayerCoverage: 0, pageCount: 2 }),
  };
  const res = await extractPdf(PDF_BYTES, engines);
  assert.equal(res.status, "no_text");
  assert.equal(res.rawText, "");
  assert.equal(res.usedOcr, false);
});
