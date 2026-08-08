/**
 * LAW ME permanent layout/extraction regression benchmark — manifest builder.
 *
 * Produces manifest-v1.json: a stratified, versioned set of ~140 real corpus
 * pages (from Object Storage / official PDFs) that becomes the IMMUTABLE ground
 * against which the deterministic extractor AND any candidate layout/OCR engine
 * are measured. Selection is deterministic (no randomness) so the manifest is
 * reproducible. Human ground truth is annotated separately, then frozen.
 *
 * NOTE: this only SELECTS pages + assigns a TENTATIVE stratum. The annotator
 * confirms the true stratum and fills ground truth. Do not tune any extractor
 * against this set until it is frozen.
 */
import { writeFileSync, mkdirSync } from "node:fs";

interface Pub { item: string; law: string; type: string; yr: number; pages: number; url: string; flag?: "low_conf" | "doubled_known"; doubledPages?: number[]; }

// Stratified pool (era × size × type) pulled from the dev corpus, plus known
// problem publications with specific diagnostic pages.
const POOL: Pub[] = [
  // pre-1970 old-font / mandate & early-state (glyph corruption, dense)
  { item: "2001883", law: "2000942", type: "original_enactment", yr: 1933, pages: 46, url: "https://fs.knesset.gov.il/0/law/0_lsr_563602.PDF" },
  { item: "2001831", law: "2000906", type: "original_enactment", yr: 1934, pages: 110, url: "https://fs.knesset.gov.il/0/law/0_lsr_560804.PDF" },
  { item: "2001943", law: "2000962", type: "original_enactment", yr: 1936, pages: 84, url: "https://fs.knesset.gov.il/0/law/0_lsr_563821.PDF" },
  { item: "148832", law: "2068884", type: "original_enactment", yr: 1958, pages: 144, url: "https://fs.knesset.gov.il/3/law/3_lsr_562443.pdf" },
  { item: "148830", law: "2068885", type: "original_enactment", yr: 1959, pages: 203, url: "https://fs.knesset.gov.il/3/law/3_lsr_562444.pdf" }, // old-font + budget tables
  // classic gazette marginal-caption (1950s–1990s)
  { item: "148862", law: "2068872", type: "original_enactment", yr: 1952, pages: 86, url: "https://fs.knesset.gov.il/2/law/2_lsr_595048.pdf" },
  { item: "147236", law: "2000223", type: "original_enactment", yr: 1953, pages: 1, url: "https://fs.knesset.gov.il/2/law/2_lsr_208235.PDF" },
  { item: "148847", law: "2068876", type: "original_enactment", yr: 1954, pages: 97, url: "https://fs.knesset.gov.il/2/law/2_lsr_560760.pdf" },
  { item: "2002229", law: "2000003", type: "amendment_law", yr: 1969, pages: 26, url: "https://fs.knesset.gov.il/6/law/6_lsr_311009.PDF" },
  { item: "148008", law: "2000916", type: "amendment_law", yr: 1969, pages: 25, url: "https://fs.knesset.gov.il/6/law/6_lsr_208977.PDF" },
  { item: "2002286", law: "2000923", type: "amendment_law", yr: 1981, pages: 53, url: "https://fs.knesset.gov.il/9/SecondaryLaw/9_scl_ei_546724.pdf" },
  { item: "147747", law: "2000944", type: "amendment_law", yr: 1983, pages: 23, url: "https://fs.knesset.gov.il/10/law/10_lsr_208725.PDF" },
  { item: "151426", law: "2000577", type: "original_enactment", yr: 1990, pages: 30, url: "https://fs.knesset.gov.il/12/law/12_lsr_210532.PDF" },
  // budget / schedule tables (dense tabular)
  { item: "151909", law: "2000036", type: "amendment_law", yr: 1988, pages: 194, url: "https://fs.knesset.gov.il/11/law/11_lsr_562722.pdf" },
  // modern two-column & complex-modern (2000s–2020s)
  { item: "88733", law: "2000002", type: "amendment_law", yr: 2003, pages: 111, url: "https://fs.knesset.gov.il/16/law/16_lsr_299931.pdf" },
  { item: "325830", law: "2000002", type: "amendment_law", yr: 2009, pages: 128, url: "https://fs.knesset.gov.il/18/law/18_lsr_301061.pdf" },
  { item: "336240", law: "2000005", type: "amendment_law", yr: 2011, pages: 88, url: "https://fs.knesset.gov.il/18/law/18_lsr_301172.pdf" },
  { item: "2161820", law: "2000002", type: "amendment_law", yr: 2021, pages: 372, url: "https://fs.knesset.gov.il/24/law/24_lsr_611801.pdf" }, // complex-modern + doubled
  { item: "2203821", law: "2000021", type: "amendment_law", yr: 2023, pages: 216, url: "https://fs.knesset.gov.il/25/law/25_lsr_2620741.pdf" },
  { item: "1046189", law: "2000944", type: "amendment_law", yr: 2025, pages: 120, url: "https://fs.knesset.gov.il/25/law/25_lsr_10503660.pdf" },
  { item: "1046679", law: "2245145", type: "original_enactment", yr: 2026, pages: 88, url: "https://fs.knesset.gov.il/25/law/25_lsr_14001342.pdf" },
  // short corrections/amendments (1–2 pp) across eras
  { item: "2068731", law: "2000906", type: "correction", yr: 1934, pages: 1, url: "https://fs.knesset.gov.il/0/law/0_lsr_560832.PDF" },
  { item: "146859", law: "2000928", type: "amendment_law", yr: 1953, pages: 1, url: "https://fs.knesset.gov.il/2/law/2_lsr_207891.PDF" },
  { item: "146848", law: "2000069", type: "correction", yr: 1967, pages: 1, url: "https://fs.knesset.gov.il/6/law/6_lsr_207881.PDF" },
  { item: "147100", law: "2000302", type: "amendment_law", yr: 1975, pages: 1, url: "https://fs.knesset.gov.il/8/law/8_lsr_208107.PDF" },
  { item: "150137", law: "2001411", type: "correction", yr: 1985, pages: 1, url: "https://fs.knesset.gov.il/11/law/11_lsr_210255.PDF" },
  { item: "157542", law: "2000976", type: "correction", yr: 1995, pages: 1, url: "https://fs.knesset.gov.il/13/law/13_lsr_211106.PDF" },
  { item: "130127", law: "2000546", type: "correction", yr: 2008, pages: 1, url: "https://fs.knesset.gov.il/17/law/17_lsr_300038.pdf" },
  { item: "2006669", law: "2009637", type: "original_enactment", yr: 2016, pages: 2, url: "https://fs.knesset.gov.il/20/law/20_lsr_362658.pdf" },
  { item: "2005826", law: "2000002", type: "correction", yr: 2018, pages: 2, url: "https://fs.knesset.gov.il/20/law/20_lsr_501326.pdf" },
  { item: "1046181", law: "2004623", type: "correction", yr: 2025, pages: 2, url: "https://fs.knesset.gov.il/25/law/25_lsr_9968222.pdf" },
  // clean classic marginal-caption reference examples (validated-good)
  { item: "148622", law: "2001410", type: "original_enactment", yr: 1967, pages: 9, url: "https://fs.knesset.gov.il/6/law/6_lsr_209577.PDF" },
  { item: "151413", law: "2000944", type: "amendment_law", yr: 1986, pages: 9, url: "https://fs.knesset.gov.il/11/law/11_lsr_210522.PDF" },
  { item: "148438", law: "2000965", type: "correction", yr: 1976, pages: 9, url: "https://fs.knesset.gov.il/8/law/8_lsr_209401.PDF" },
  // modern two-column & doubled text-layer
  { item: "122624", law: "2000245", type: "amendment_law", yr: 2006, pages: 9, url: "https://fs.knesset.gov.il/17/law/17_lsr_300021.pdf" },
  { item: "397094", law: "2000272", type: "correction", yr: 2010, pages: 9, url: "https://fs.knesset.gov.il/18/law/18_lsr_301279.pdf" },
  { item: "544591", law: "2000002", type: "correction", yr: 2016, pages: 8, url: "https://fs.knesset.gov.il/20/law/20_lsr_348674.pdf", flag: "doubled_known", doubledPages: [3] },
  { item: "568877", law: "2002391", type: "original_enactment", yr: 2016, pages: 184, url: "https://fs.knesset.gov.il/20/law/20_lsr_341025.pdf" },
  { item: "568878", law: "2000029", type: "amendment_law", yr: 2015, pages: 180, url: "https://fs.knesset.gov.il/20/law/20_lsr_316718.pdf" },
  // image / partial-text (low extraction confidence)
  { item: "151382", law: "2000529", type: "correction", yr: 1986, pages: 3, url: "https://fs.knesset.gov.il/11/law/11_lsr_210494.PDF", flag: "low_conf" },
  { item: "154516", law: "2000944", type: "correction", yr: 1993, pages: 3, url: "https://fs.knesset.gov.il/13/law/13_lsr_210983.PDF", flag: "low_conf" },
  { item: "174551", law: "2000553", type: "correction", yr: 1993, pages: 3, url: "https://fs.knesset.gov.il/13/law/13_lsr_211811.PDF", flag: "low_conf" },
];

/** Deterministic per-pub page picks + tentative stratum. */
function pagesFor(p: Pub): { page: number; stratum: string }[] {
  const old = p.yr < 1970, modern = p.yr >= 2010, budget = p.item === "151909" || p.item === "148830";
  const classify = (page: number): string => {
    if (p.flag === "low_conf") return "image_partial";
    if (p.doubledPages?.includes(page)) return "doubled_text_layer";
    if (budget && page >= 3) return "budget_table";
    if (old) return "old_font";
    if (page === 1) return "front_or_index";
    if (modern && p.pages >= 40) return "complex_modern";
    if (modern) return "modern_two_column";
    return "classic_marginal_caption";
  };
  if (p.pages <= 3) return Array.from({ length: p.pages }, (_, i) => ({ page: i + 1, stratum: classify(i + 1) }));
  // multi-page: page 1, an early body page, a middle page; long docs add a late page.
  // Old-font pubs are capped at 2 pages to avoid over-weighting.
  const picks = new Set<number>([1, Math.max(2, Math.floor(p.pages / 2))]);
  if (!old) picks.add(Math.min(3, p.pages));
  if (p.pages >= 40 && !old) picks.add(Math.floor(p.pages * 0.75));
  for (const dp of p.doubledPages ?? []) picks.add(dp);
  return [...picks].filter((n) => n >= 1 && n <= p.pages).sort((a, b) => a - b).map((page) => ({ page, stratum: classify(page) }));
}

const entries: Record<string, unknown>[] = [];
let id = 0;
for (const p of POOL) {
  for (const { page, stratum } of pagesFor(p)) {
    id += 1;
    entries.push({
      id: `bench-${String(id).padStart(3, "0")}`,
      stratum_tentative: stratum,
      publication_item_id: p.item,
      israel_law_id: p.law,
      publication_type: p.type,
      year: p.yr,
      page_count: p.pages,
      page_number: page,
      source_url: p.url,
    });
  }
}

const manifest = {
  benchmark: "knesset-layout",
  version: "v1-draft",
  status: "DRAFT — page selection only; ground truth pending; NOT frozen",
  created_note: "stamp on freeze",
  page_count: entries.length,
  strata: [...new Set(entries.map((e) => e.stratum_tentative))].sort(),
  policy: "Immutable once frozen. Do NOT tune any extractor against this set before freeze. Ground truth is human-annotated and independent of any extractor output.",
  entries,
};

mkdirSync("benchmark/knesset-layout", { recursive: true });
writeFileSync("benchmark/knesset-layout/manifest-v1.json", JSON.stringify(manifest, null, 2));
process.stdout.write(`manifest: ${entries.length} pages across ${POOL.length} publications\n`);
const byStratum: Record<string, number> = {};
for (const e of entries) byStratum[e.stratum_tentative as string] = (byStratum[e.stratum_tentative as string] ?? 0) + 1;
process.stdout.write(JSON.stringify(byStratum, null, 2) + "\n");
