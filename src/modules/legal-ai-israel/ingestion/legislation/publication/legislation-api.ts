/**
 * Typed, Zod-validated client for the Knesset National Legislation content API.
 *
 *   GET https://www.knesset.gov.il/WebSiteApi/knessetapi/LegislationItem/
 *       GetLegislationLawItem?ItemId=<IsraelLawID>
 *
 * The endpoint returns a WCF DataContract XML document (no auth). `ItemId`
 * equals the OData `IsraelLawID` exactly — there is NO fuzzy resolution here.
 * The full statutory text is NOT inline: each amendment/publication row carries
 * a `filePath` pointing at the official ספר החוקים PDF on fs.knesset.gov.il.
 *
 * Design constraints (current Epic):
 *  - NO `any`. Every external field is validated by Zod before it is trusted.
 *  - The raw payload is untrusted MCP/network output: we parse defensively,
 *    coerce single-vs-array list shapes, and treat "", whitespace and `i:nil`
 *    uniformly as absent.
 *  - The network fetcher is injected so the parser/validator is fully offline
 *    testable against real captured fixtures.
 */
import { z } from "zod";
import { parseWcfXml } from "./wcf-xml.ts";

/** "", whitespace, or missing → null; otherwise trimmed string. */
const nullableText = z.preprocess((v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    const t = v.trim();
    return t.length === 0 ? null : t;
  }
  return v;
}, z.string().nullable());

/**
 * Unwrap a WCF list container to the array of its repeated child elements.
 * The real payload nests, e.g., `corrections > listCorrections >
 * iLegislationLawItemCorrectionResult[]`, and a single-element list is NOT an
 * array. We navigate the given wrapper keys, then take the single inner child
 * collection (element-name-agnostic) and coerce it to an array.
 */
function unwrapList(root: unknown, wrapperKeys: readonly string[]): unknown[] {
  let node: unknown = root;
  for (const key of wrapperKeys) {
    if (node === null || node === undefined || typeof node !== "object") return [];
    node = (node as Record<string, unknown>)[key];
  }
  if (node === null || node === undefined || node === "") return [];
  if (Array.isArray(node)) return node;
  if (typeof node === "object") {
    // The inner element (unknown tag name) is the sole child collection.
    const values = Object.values(node as Record<string, unknown>).filter(
      (v) => v !== null && v !== "" && v !== undefined,
    );
    if (values.length === 0) return [];
    const inner = values[0];
    return Array.isArray(inner) ? inner : [inner];
  }
  return [];
}

/** One amendment / publication row (a `LegislationCorrection`). */
export const CorrectionSchema = z
  .object({
    itemId: nullableText,
    name: nullableText,
    correctionType: nullableText, // ישיר | עקיף
    correctionNumber: nullableText, // ordinal within the law's amendment chain
    publicationDate: nullableText,
    publicationSeries: nullableText, // e.g. "ספר החוקים"
    magazineNumber: nullableText, // חוברת
    pageNumber: nullableText, // עמוד
    filePath: nullableText, // → official PDF on fs.knesset.gov.il
    fileType: nullableText,
    summaryLaw: nullableText,
  })
  .passthrough();
export type Correction = z.infer<typeof CorrectionSchema>;

export const GeneralSchema = z
  .object({
    hebSubject: nullableText,
    lawValidity: nullableText, // תקף | נושן | בטל
    publicationDate: nullableText,
    latestPublicationDate: nullableText,
    openBookUrl: nullableText, // OpenLawBook consolidated text (often absent)
    kolZchutUrl: nullableText,
    knsName: nullableText,
  })
  .passthrough();
export type General = z.infer<typeof GeneralSchema>;

// The real payload nests `corrections > listCorrections >
// iLegislationLawItemCorrectionResult[]` and `secondaryLawInstalled >
// iLegislationItemSecondaryLaw[]`. We unwrap element-name-agnostically.
const CorrectionsField = z.preprocess(
  (v) => unwrapList(v, ["listCorrections"]),
  z.array(CorrectionSchema),
);

const SecondaryField = z.preprocess(
  (v) => unwrapList(v, []),
  z.array(z.object({}).passthrough()),
);

export const LegislationLawItemSchema = z
  .object({
    general: GeneralSchema,
    corrections: CorrectionsField.optional().default([]),
    secondaryLawInstalled: SecondaryField.optional().default([]),
  })
  .passthrough();
export type LegislationLawItem = z.infer<typeof LegislationLawItemSchema>;

export interface ParsedLegislationLawItem {
  itemId: string;
  general: General;
  corrections: readonly Correction[];
  secondaryCount: number;
}

/** Validate an already-parsed envelope body into a typed law item. */
export function validateLegislationLawItem(
  itemId: string,
  body: unknown,
): ParsedLegislationLawItem {
  const parsed = LegislationLawItemSchema.parse(body);
  return {
    itemId,
    general: parsed.general,
    corrections: parsed.corrections,
    secondaryCount: parsed.secondaryLawInstalled.length,
  };
}

/**
 * Parse a raw WCF-XML response string and validate it. Throws (ZodError or the
 * XML parser's error) on any malformed/partial payload — never returns partial.
 */
export function parseLegislationLawItemXml(
  itemId: string,
  xml: string,
): ParsedLegislationLawItem {
  const envelope = parseWcfXml(xml);
  const keys = Object.keys(envelope);
  if (keys.length !== 1) {
    throw new Error(`legislation-api: expected a single root element, got ${keys.length}`);
  }
  const body = envelope[keys[0]];
  return validateLegislationLawItem(itemId, body);
}

export interface FetchOptions {
  /** Injected fetch of the raw XML for an ItemId (browser/operator supplies it). */
  fetchRawXml: (url: string) => Promise<string>;
  baseUrl?: string;
}

const DEFAULT_BASE =
  "https://www.knesset.gov.il/WebSiteApi/knessetapi/LegislationItem/GetLegislationLawItem";

/** IsraelLawID must be a positive integer string — no fuzzy/name resolution. */
export function assertItemId(itemId: string): string {
  if (!/^\d+$/.test(itemId)) {
    throw new Error(`legislation-api: ItemId must be a numeric IsraelLawID, got "${itemId}"`);
  }
  return itemId;
}

export function legislationLawItemUrl(itemId: string, baseUrl = DEFAULT_BASE): string {
  return `${baseUrl}?ItemId=${assertItemId(itemId)}`;
}

/** Fetch + parse + validate one law item via the injected fetcher. */
export async function fetchLegislationLawItem(
  itemId: string,
  opts: FetchOptions,
): Promise<ParsedLegislationLawItem> {
  const url = legislationLawItemUrl(itemId, opts.baseUrl);
  const xml = await opts.fetchRawXml(url);
  return parseLegislationLawItemXml(itemId, xml);
}
