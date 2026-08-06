#!/usr/bin/env node
/**
 * OPERATOR upload runner (current Epic Track B, physical step).
 *
 * Run this from an environment that has BOTH:
 *   - network access to fs.knesset.gov.il (the PDF bytes), and
 *   - network access to the dev Supabase project + its SERVICE_ROLE key.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node --experimental-strip-types tools/legal-ingest/upload-pdfs.ts
 *   (or `node --env-file=.env.local ...` — the repo's .env.local already targets
 *    the authorized dev project udispadsbxqicmawqcuk.)
 *
 * For each pending object it: SSRF-guard-fetches the PDF, validates
 * content-type + %PDF- magic + size, checks the SHA-256 against the REGISTERED
 * hash (mismatch → quarantined, never uploaded), uploads content-addressed
 * (dedup; no overwrite), round-trip verifies (HEAD + full byte re-hash), and
 * flips stored_objects → verified. No retry on 403/404/429. Idempotent: an
 * already-verified object is skipped; the same SHA is a no-op.
 *
 * NOTE: this session's sandbox is air-gapped from both hosts, so this file is
 * shipped to be RUN BY THE OPERATOR — it is not executed in-session.
 */
import { createClient } from "@supabase/supabase-js";
import { fetchPdfWithRetry, DEFAULT_PDF_POLICY } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/pdf-fetch.ts";
import type { HttpClient, HttpResponse } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/pdf-fetch.ts";
import { storePdf } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/object-storage.ts";
import { createSupabaseStorageClient } from "../../src/modules/legal-ai-israel/ingestion/legislation/publication/object-storage-supabase.ts";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  process.stderr.write("upload-pdfs: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required in env\n");
  process.exit(2);
}

const CONCURRENCY = 2;

/** node fetch → pdf-fetch's HttpClient (manual redirects; pdf-fetch re-validates each hop). */
const nodeHttp: HttpClient = async (url, signal): Promise<HttpResponse> => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), signal.timeoutMs);
  try {
    const res = await fetch(url, { redirect: "manual", signal: ctrl.signal });
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k] = v; });
    if (res.status >= 300 && res.status < 400) {
      return { status: res.status, headers, location: res.headers.get("location") ?? undefined };
    }
    const body = new Uint8Array(await res.arrayBuffer());
    return { status: res.status, headers, body };
  } finally {
    clearTimeout(t);
  }
};

interface PendingRow {
  sha256: string; object_key: string; israel_law_id: string;
  publication_item_id: string; pdf_url: string; size_bytes: number;
}

async function main(): Promise<void> {
  const supabase = createClient(SUPABASE_URL!, SERVICE_KEY!, { auth: { persistSession: false } });
  const storage = createSupabaseStorageClient(supabase);

  // Pending objects (one per distinct sha256).
  const { data: pending, error } = await supabase
    .from("stored_objects")
    .select("sha256,object_key,size_bytes,storage_status")
    .eq("storage_status", "pending");
  if (error || !pending) throw error ?? new Error("no pending objects");

  // Resolve source url + ids per sha from law_publications.
  const rows: PendingRow[] = [];
  for (const o of pending) {
    const { data: pub } = await supabase
      .from("law_publications")
      .select("israel_law_id,publication_item_id,pdf_url")
      .eq("pdf_sha256", o.sha256)
      .not("pdf_url", "is", null)
      .limit(1)
      .maybeSingle();
    if (pub?.pdf_url) {
      rows.push({ sha256: o.sha256, object_key: o.object_key, israel_law_id: pub.israel_law_id, publication_item_id: pub.publication_item_id, pdf_url: pub.pdf_url, size_bytes: o.size_bytes });
    }
  }

  const metrics = { pending: rows.length, uploaded: 0, verified: 0, deduped: 0, failed: 0, checksumMismatch: 0, bytes: 0 };

  async function processOne(r: PendingRow): Promise<void> {
    const fetched = await fetchPdfWithRetry(r.pdf_url, nodeHttp, DEFAULT_PDF_POLICY, {
      maxAttempts: 3, backoffMs: (a) => 500 * a, sleep: (ms) => new Promise((res) => setTimeout(res, ms)),
    });
    if (!fetched.ok) { metrics.failed += 1; return; }
    // Checksum against the REGISTERED sha; mismatch → quarantine, never upload.
    if (fetched.sha256 !== r.sha256) {
      metrics.checksumMismatch += 1;
      await supabase.from("stored_objects").update({ storage_status: "quarantined", provenance: { reason: "checksum_mismatch", observed_sha: fetched.sha256 } }).eq("sha256", r.sha256);
      return;
    }
    const stored = await storePdf(storage, r.israel_law_id, r.publication_item_id, fetched.bytes, { expectedSha256: r.sha256 });
    if (stored.status !== "verified") { metrics.failed += 1; await supabase.from("stored_objects").update({ storage_status: "failed" }).eq("sha256", r.sha256); return; }
    if (stored.deduped) metrics.deduped += 1; else { metrics.uploaded += 1; metrics.bytes += fetched.size; }
    metrics.verified += 1;
    const now = new Date().toISOString();
    await supabase.from("stored_objects").update({ storage_status: "verified", uploaded_at: now, verified_at: now }).eq("sha256", r.sha256);
  }

  // Bounded concurrency.
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    await Promise.all(rows.slice(i, i + CONCURRENCY).map(processOne));
  }

  // Record an ingestion run for the upload.
  await supabase.from("ingestion_runs").insert({ kind: "pdf_upload", metrics }).then(() => {}, () => {});
  process.stdout.write(JSON.stringify(metrics, null, 2) + "\n");
}

main().catch((e) => { process.stderr.write(`upload-pdfs failed: ${(e as Error).message}\n`); process.exit(1); });
