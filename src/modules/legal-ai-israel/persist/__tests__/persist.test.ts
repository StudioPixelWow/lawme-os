import test from "node:test";
import assert from "node:assert/strict";
import { buildIngestArtifacts } from "../../ingest/pipeline.ts";
import type { IngestArtifacts } from "../../ingest/pipeline.ts";
import {
  persistJudgment, isWindowCompleted, checkpointWindow, UnknownSourceError,
} from "../persist.ts";
import type {
  LegalaiStore, DocumentRow, SectionRow, CaseCitationRow, StatuteCitationRow,
  DocumentSourceRow, DocumentVersionRow, WindowKey, WindowRow, JudgmentMetadata,
} from "../persist.ts";

// A judgment that cites two cases and a statute (drives sections/citations).
const JUDGMENT_TEXT = [
  'רע"א 51866-07-26 א. אומנים בביטחון בע"מ נ. הוועדה לרישוי',
  "לפני כב' השופט אלכס שטיין",
  "החלטה",
  'ראו רע"א 53625-07-26 וכן עש"א 11216-06-26.',
  "בהתאם לסעיף 6 לחוק זכות יוצרים, התשס\"ח-2007, הבקשה נדחית.",
].join("\n");

const RESTRICTED_TEXT = [
  'עמ"ק 12345-01-26 פלוני נ. פלונית',
  "חל איסור פרסום על שם הקטין ופרטיו המזהים.",
  "החלטה: הבקשה מתקבלת.",
].join("\n");

function artifactsFor(text: string): IngestArtifacts {
  return buildIngestArtifacts({
    sourceCode: "supreme_court",
    filename: "j.txt",
    bytes: new TextEncoder().encode(text),
    extractedText: text,
    sourceUrl: "https://supremedecisions.court.gov.il/Verdicts/Results",
    operatorAffirmsPublicAndLawful: true,
    sourceAccessApproved: true,
    parserConfidence: 0.8,
  });
}

const META: JudgmentMetadata = {
  caseNumberRaw: 'רע"א 51866-07-26',
  caseNumberNormalized: 'רע"א 51866-07-26',
  courtName: "בית המשפט העליון",
  courtLevel: "supreme",
  proceedingType: 'רע"א',
  decisionDate: "2026-08-05",
  documentType: "החלטה",
  title: null,
  partiesDisplay: 'א. אומנים בביטחון בע"מ נ. הוועדה לרישוי',
  publicationRestrictions: [],
};

interface Recorded {
  documents: DocumentRow[];
  sections: SectionRow[];
  caseCitations: CaseCitationRow[];
  statuteCitations: StatuteCitationRow[];
  sources: DocumentSourceRow[];
  versions: DocumentVersionRow[];
  uploads: { path: string; size: number }[];
  windows: WindowRow[];
}

function fakeStore(opts: { existingSha?: string; sourceId?: string | null } = {}): {
  store: LegalaiStore; rec: Recorded;
} {
  const rec: Recorded = {
    documents: [], sections: [], caseCitations: [], statuteCitations: [],
    sources: [], versions: [], uploads: [], windows: [],
  };
  const sourceId = opts.sourceId === undefined ? "src-supreme" : opts.sourceId;
  let counter = 0;
  const store: LegalaiStore = {
    async getSourceIdByCode() { return sourceId; },
    async findDocumentBySha(_sid, sha) { return opts.existingSha === sha ? "existing-doc" : null; },
    async uploadOriginal(path, bytes) { rec.uploads.push({ path, size: bytes.byteLength }); return path; },
    async insertDocument(row) { rec.documents.push(row); counter += 1; return `doc-${counter}`; },
    async insertSections(rows) { rec.sections.push(...rows); },
    async insertCaseCitations(rows) { rec.caseCitations.push(...rows); },
    async insertStatuteCitations(rows) { rec.statuteCitations.push(...rows); },
    async upsertDocumentSource(row) { rec.sources.push(row); },
    async insertVersion(row) { rec.versions.push(row); },
    async getWindowStatus(key: WindowKey) {
      const w = rec.windows.find((x) => x.date_from === key.dateFrom && x.date_to === key.dateTo);
      return w ? w.status : null;
    },
    async upsertWindow(row: WindowRow) {
      const i = rec.windows.findIndex((x) => x.date_from === row.date_from && x.date_to === row.date_to);
      if (i >= 0) rec.windows[i] = row; else rec.windows.push(row);
    },
  };
  return { store, rec };
}

function input(text: string) {
  const artifacts = artifactsFor(text);
  return {
    sourceCode: "supreme_court",
    sourceUrl: "https://supremedecisions.court.gov.il/Verdicts/Results",
    mimeType: "text/html",
    bytes: new TextEncoder().encode(text),
    artifacts,
    metadata: META,
  };
}

test("persistJudgment writes document + sections + citations + source + version", async () => {
  const { store, rec } = fakeStore();
  const res = await persistJudgment(store, input(JUDGMENT_TEXT));
  assert.equal(res.skipped, false);
  assert.equal(res.reason, "new");
  assert.equal(res.documentId, "doc-1");
  assert.equal(rec.documents.length, 1);
  assert.equal(rec.documents[0].status, "ingested_unverified");
  assert.equal(rec.documents[0].publication_status, "public");
  assert.ok(rec.sections.length >= 1);
  assert.ok(rec.caseCitations.length >= 1, "should extract at least one case citation");
  assert.equal(rec.sources.length, 1);
  assert.equal(rec.sources[0].is_canonical, true);
  assert.equal(rec.versions.length, 1);
  assert.equal(rec.versions[0].version_number, 1);
  assert.equal(rec.uploads.length, 1);
  assert.ok(rec.uploads[0].path.startsWith("supreme_court/"));
});

test("document is never written as published (publishing is separate)", async () => {
  const { store, rec } = fakeStore();
  await persistJudgment(store, input(JUDGMENT_TEXT));
  assert.notEqual(rec.documents[0].status, "published");
});

test("dedup: an already-stored sha is skipped, no document inserted", async () => {
  const built = artifactsFor(JUDGMENT_TEXT);
  const { store, rec } = fakeStore({ existingSha: built.sha256 });
  const res = await persistJudgment(store, input(JUDGMENT_TEXT));
  assert.equal(res.skipped, true);
  assert.equal(res.reason, "duplicate");
  assert.equal(res.documentId, "existing-doc");
  assert.equal(rec.documents.length, 0);
  assert.equal(rec.uploads.length, 0);
});

test("restricted document (איסור פרסום) is refused — confidential text never stored", async () => {
  const { store, rec } = fakeStore();
  const res = await persistJudgment(store, input(RESTRICTED_TEXT));
  assert.equal(res.skipped, true);
  assert.equal(res.reason, "restricted");
  assert.equal(rec.documents.length, 0);
  assert.equal(rec.uploads.length, 0, "must not upload a restricted original");
});

test("unknown source code throws (never invents a source)", async () => {
  const { store } = fakeStore({ sourceId: null });
  await assert.rejects(() => persistJudgment(store, input(JUDGMENT_TEXT)), UnknownSourceError);
});

test("case citations are de-duplicated by normalized value", async () => {
  const dupText = 'ראו ע"א 1234-01-20, וכן שוב ע"א 1234-01-20 באותו עניין.';
  const { store, rec } = fakeStore();
  await persistJudgment(store, input(dupText));
  const norms = rec.caseCitations.map((c) => c.cited_case_number_normalized);
  assert.equal(new Set(norms).size, norms.length, "no duplicate normalized citations");
});

test("window checkpoint: completed windows are detected for resume", async () => {
  const { store } = fakeStore();
  const key: WindowKey = {
    sourceId: "src-supreme", courtName: null, proceedingType: null,
    dateFrom: "2026-07-01", dateTo: "2026-07-31",
  };
  assert.equal(await isWindowCompleted(store, key), false);
  await checkpointWindow(store, key, { results: 500, discovered: 500, downloaded: 500, completed: true });
  assert.equal(await isWindowCompleted(store, key), true);
});

test("in-progress window is not treated as completed", async () => {
  const { store } = fakeStore();
  const key: WindowKey = {
    sourceId: "src-supreme", courtName: null, proceedingType: null,
    dateFrom: "2026-06-01", dateTo: "2026-06-30",
  };
  await checkpointWindow(store, key, { results: 100, discovered: 40, downloaded: 40, completed: false });
  assert.equal(await isWindowCompleted(store, key), false);
});
