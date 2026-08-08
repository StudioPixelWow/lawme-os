/**
 * LAW ME — shared Path-B2 page assembly. ONE place that turns a Google Document
 * AI result (raw text + structured layout) into the machine-derived B2 record:
 * table extraction (native or numeric-gated geometry), page classification,
 * reason codes, and the accept/needs_review/failed verdict. Used by both the
 * engineering-eval adapter (eng-google.ts) and the production hybrid reprocess
 * (reprocess-hybrid.ts) so they cannot drift. Pure. published=0.
 */
import { extractTables, tableDetection, tableToText, type DocaiDocument, type CanonicalTable } from "./b2-tables.ts";
import {
  classifyPage, assessTables, decideB2, numericRatio, hebrewShareText, semanticDuplication,
  type B2PageSignals, type PageClassification, type TableAssessment, type B2Verdict,
} from "./b2-quality.ts";
import { stripSpace } from "./eng-metrics.ts";

export interface B2AssembleInput {
  text: string;
  layout: DocaiDocument;
  mean_confidence: number;   // 0..100
  token_count?: number;
  line_count?: number;
  block_count?: number;
  ocr_error?: boolean;
  allowGeometryFallback?: boolean;
}

export interface B2PageAssembly {
  text: string;
  normalized_text: string;
  mean_confidence: number;
  unresolved: boolean;
  ocr_error: boolean;
  ocr_state: "content" | "sparse" | "likely_blank" | "ocr_failed" | "needs_review";
  chars: number;
  hebrew_share: number;      // %
  duplication: number;       // % (semantic, structural leaders removed)
  numeric_ratio: number;     // 0..1
  token_count: number;
  line_count: number;
  block_count: number;
  table_detection: ReturnType<typeof tableDetection>;
  table_count: number;
  table_source: "native" | "geometry" | "none";
  tables: CanonicalTable[];
  classification: PageClassification;
  table_assessment: TableAssessment;
  verdict: B2Verdict;
}

/** Deterministically assemble the B2 record from a Google OCR result. */
export function assembleB2Page(inp: B2AssembleInput): B2PageAssembly {
  const text = inp.text ?? "";
  const layout = inp.layout ?? { text: "", pages: [] };
  const nr = numericRatio(text);
  const tables = extractTables(layout, { allowGeometryFallback: inp.allowGeometryFallback ?? true, pageNumericRatio: nr });
  const det = tableDetection(tables);
  const sig: B2PageSignals = {
    char_count: stripSpace(text).length, token_count: inp.token_count, line_count: inp.line_count, block_count: inp.block_count,
    mean_confidence: inp.mean_confidence, ocr_error: !!inp.ocr_error, image_decoded: !inp.ocr_error,
  };
  const cls = classifyPage(sig);
  const tbl = assessTables(tables, { numeric_ratio: nr, has_flattened_text: stripSpace(text).length > 0 });
  const verdict = decideB2(cls, tbl);
  const table_source: "native" | "geometry" | "none" =
    det.source === "docai_tables" ? "native" : det.source === "geometry_reconstructed" ? "geometry" : "none";
  return {
    text,
    normalized_text: [text, ...tables.map(tableToText)].filter(Boolean).join("\n\n"),
    mean_confidence: +inp.mean_confidence.toFixed(2),
    unresolved: stripSpace(text).length === 0,
    ocr_error: !!inp.ocr_error,
    ocr_state: cls.state,
    chars: stripSpace(text).length,
    hebrew_share: +(hebrewShareText(text) * 100).toFixed(2),
    duplication: +(semanticDuplication(text) * 100).toFixed(2),
    numeric_ratio: +nr.toFixed(3),
    token_count: inp.token_count ?? 0,
    line_count: inp.line_count ?? 0,
    block_count: inp.block_count ?? 0,
    table_detection: det,
    table_count: det.number_of_tables,
    table_source,
    tables,
    classification: cls,
    table_assessment: tbl,
    verdict,
  };
}
