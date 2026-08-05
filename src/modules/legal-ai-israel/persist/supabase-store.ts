/**
 * LEGAL AI ISRAEL — Supabase-backed LegalaiStore (service-role, DEV only).
 *
 * This is the ONLY networked part of persistence. It reads its credentials from
 * the operator's environment and never from committed code:
 *   SUPABASE_URL                 (or NEXT_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY    (service role — bypasses RLS for ingestion)
 *   LEGALAI_STORAGE_BUCKET       (optional; default "legalai-originals")
 *
 * One-time DEV setup the operator does in the Supabase dashboard (reversible):
 *   1. Settings → API → Exposed schemas: add `legalai`.
 *   2. Storage → create a PRIVATE bucket `legalai-originals`.
 * The service-role key must only ever point at the DEVELOPMENT project
 * (udispadsbxqicmawqcuk). Never production. Never commit the key.
 */
import { createClient } from "@supabase/supabase-js";
import type {
  LegalaiStore, DocumentRow, SectionRow, CaseCitationRow,
  StatuteCitationRow, DocumentSourceRow, DocumentVersionRow, WindowKey, WindowRow,
} from "./persist.ts";

function requireEnv(name: string, alt?: string): string {
  const v = process.env[name] ?? (alt ? process.env[alt] : undefined);
  if (!v) throw new Error(`missing env ${name}${alt ? ` (or ${alt})` : ""}`);
  return v;
}

function isoNow(): string {
  // Adapter runs on the operator's machine (not a workflow script), so a real
  // clock is available and appropriate for last_seen/completed timestamps.
  return new Date().toISOString();
}

export function createSupabaseLegalaiStore(): LegalaiStore {
  const url = requireEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const bucket = process.env.LEGALAI_STORAGE_BUCKET ?? "legalai-originals";

  const client = createClient(url, key, {
    db: { schema: "legalai" },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    async getSourceIdByCode(code) {
      const { data, error } = await client.from("legal_sources").select("id").eq("code", code).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? (data as { id: string }).id : null;
    },

    async findDocumentBySha(sourceId, sha256) {
      const { data, error } = await client
        .from("legal_documents").select("id")
        .eq("source_id", sourceId).eq("original_sha256", sha256).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? (data as { id: string }).id : null;
    },

    async uploadOriginal(path, bytes, mimeType) {
      const { error } = await client.storage.from(bucket).upload(path, bytes, {
        contentType: mimeType, upsert: false,
      });
      // A repeated upload of identical content is not a failure for our purposes.
      if (error && !/exists|duplicate/i.test(error.message)) throw new Error(error.message);
      return path;
    },

    async insertDocument(row: DocumentRow) {
      const { data, error } = await client.from("legal_documents").insert(row).select("id").single();
      if (error) throw new Error(error.message);
      return (data as { id: string }).id;
    },

    async insertSections(rows: SectionRow[]) {
      const { error } = await client.from("document_sections").insert(rows);
      if (error) throw new Error(error.message);
    },

    async insertCaseCitations(rows: CaseCitationRow[]) {
      const { error } = await client.from("case_citations").insert(rows);
      if (error) throw new Error(error.message);
    },

    async insertStatuteCitations(rows: StatuteCitationRow[]) {
      const { error } = await client.from("document_statute_citations").insert(rows);
      if (error) throw new Error(error.message);
    },

    async upsertDocumentSource(row: DocumentSourceRow) {
      const withSeen = { ...row, last_seen_at: isoNow() };
      const { error } = await client.from("legal_document_sources").upsert(withSeen, { onConflict: "source_id,source_url" });
      if (error) throw new Error(error.message);
    },

    async insertVersion(row: DocumentVersionRow) {
      const { error } = await client.from("legal_document_versions").upsert(row, { onConflict: "document_id,version_number" });
      if (error) throw new Error(error.message);
    },

    async getWindowStatus(key: WindowKey) {
      let q = client.from("source_discovery_windows").select("status").eq("source_id", key.sourceId);
      q = key.courtName === null ? q.is("court_name", null) : q.eq("court_name", key.courtName);
      q = key.proceedingType === null ? q.is("proceeding_type", null) : q.eq("proceeding_type", key.proceedingType);
      q = key.dateFrom === null ? q.is("date_from", null) : q.eq("date_from", key.dateFrom);
      q = key.dateTo === null ? q.is("date_to", null) : q.eq("date_to", key.dateTo);
      const { data, error } = await q.maybeSingle();
      if (error) throw new Error(error.message);
      return data ? (data as { status: string }).status : null;
    },

    async upsertWindow(row: WindowRow) {
      const dbRow = {
        source_id: row.source_id,
        court_name: row.court_name,
        proceeding_type: row.proceeding_type,
        date_from: row.date_from,
        date_to: row.date_to,
        cursor: row.cursor,
        status: row.status,
        results_count: row.results_count,
        discovered_count: row.discovered_count,
        downloaded_count: row.downloaded_count,
        completed_at: row.completed ? isoNow() : null,
      };
      const { error } = await client.from("source_discovery_windows")
        .upsert(dbRow, { onConflict: "source_id,court_name,proceeding_type,date_from,date_to" });
      if (error) throw new Error(error.message);
    },
  };
}
