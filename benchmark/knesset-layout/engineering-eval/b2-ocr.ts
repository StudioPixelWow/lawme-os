/**
 * LAW ME — shared Google Document AI OCR call for Path-B2. Splits a single page
 * locally (never sends the whole document), calls Document AI at the correct
 * regional endpoint, and returns raw text + a trimmed structured layout. Reads
 * credentials/config EXCLUSIVELY from env (never logged). Refuses cleanly when
 * credentials are absent (e.g. this sandbox) so callers can degrade gracefully.
 * Used by eng-google.ts (eval) and reprocess-hybrid.ts (production B2). No
 * fabricated output. published=0.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DocaiDocument } from "./b2-tables.ts";

export interface GoogleOcrConfig { project?: string; location?: string; processor?: string; credsPath?: string }
export function googleOcrConfigFromEnv(): GoogleOcrConfig {
  return { project: process.env.GCP_PROJECT, location: process.env.GCP_LOCATION, processor: process.env.GCP_DOCAI_PROCESSOR, credsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS };
}
export function googleOcrAvailable(c: GoogleOcrConfig = googleOcrConfigFromEnv()): boolean {
  return !!(c.project && c.location && c.processor && c.credsPath);
}

export interface GoogleOcrResult {
  text: string;
  layout: DocaiDocument;
  mean_confidence: number;   // 0..100
  latency_ms: number;
  token_count: number;
  line_count: number;
  block_count: number;
  processor_id: string;
}

const require = createRequire(import.meta.url);

function onePage(src: string, page: number): Buffer {
  const out = join(tmpdir(), `b2ocr-${process.pid}-${page}.pdf`);
  execFileSync("pdftk", [src, "cat", String(page), "output", out]);
  const b = readFileSync(out); try { execFileSync("rm", ["-f", out]); } catch { /**/ }
  return b;
}

/** Trim the Document AI response to the fields the structured B2 layer needs. */
export function trimLayout(document: any): DocaiDocument {
  return {
    text: document?.text ?? "",
    pages: (document?.pages ?? []).map((p: any) => ({
      pageNumber: p.pageNumber,
      dimension: p.dimension ? { width: p.dimension.width, height: p.dimension.height } : undefined,
      tables: p.tables ?? [],
      tokens: (p.tokens ?? []).map((t: any) => ({
        layout: {
          textAnchor: t.layout?.textAnchor,
          confidence: t.layout?.confidence,
          boundingPoly: t.layout?.boundingPoly ? { vertices: t.layout.boundingPoly.vertices, normalizedVertices: t.layout.boundingPoly.normalizedVertices } : undefined,
        },
      })),
    })),
  };
}

/** OCR a single page with Google Document AI. Throws if credentials are absent. */
export async function ocrPageWithGoogle(srcPath: string, page: number, cfg: GoogleOcrConfig = googleOcrConfigFromEnv()): Promise<GoogleOcrResult> {
  if (!googleOcrAvailable(cfg)) throw new Error("google_ocr_unavailable: missing GCP_PROJECT/GCP_LOCATION/GCP_DOCAI_PROCESSOR/GOOGLE_APPLICATION_CREDENTIALS");
  const { DocumentProcessorServiceClient } = require("@google-cloud/documentai").v1;
  const apiEndpoint = cfg.location && cfg.location !== "us" ? `${cfg.location}-documentai.googleapis.com` : undefined;
  const client = new DocumentProcessorServiceClient(apiEndpoint ? { apiEndpoint } : {});
  const name = `projects/${cfg.project}/locations/${cfg.location}/processors/${cfg.processor}`;
  const t0 = Date.now();
  const [res] = await client.processDocument({ name, rawDocument: { content: onePage(srcPath, page).toString("base64"), mimeType: "application/pdf" } });
  const latency = Date.now() - t0;
  const doc = res.document ?? {};
  const toks = (doc.pages ?? []).flatMap((p: any) => p.tokens ?? []);
  const conf = toks.length ? toks.reduce((a: number, t: any) => a + (t.layout?.confidence ?? 0), 0) / toks.length * 100 : 0;
  return {
    text: doc.text ?? "", layout: trimLayout(doc), mean_confidence: conf, latency_ms: latency,
    token_count: toks.length,
    line_count: (doc.pages ?? []).reduce((a: number, p: any) => a + (p.lines?.length ?? 0), 0),
    block_count: (doc.pages ?? []).reduce((a: number, p: any) => a + (p.blocks?.length ?? 0), 0),
    processor_id: cfg.processor!,
  };
}
