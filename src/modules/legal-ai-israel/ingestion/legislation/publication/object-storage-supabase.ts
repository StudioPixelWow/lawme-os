/**
 * Supabase Storage adapter implementing the injected {@link StorageClient}
 * (current Epic Track B). Wraps `@supabase/supabase-js` `.storage.from(bucket)`
 * so the credentialed I/O lives here and the policy layer (object-storage.ts)
 * stays pure/testable. The service-role key is read from the environment by the
 * caller and NEVER embedded, logged, or shipped to the browser.
 *
 * Used by the operator upload runner (tools/legal-ingest/upload-pdfs.ts). It is
 * NOT imported into any browser bundle.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StorageClient } from "./object-storage.ts";

export function createSupabaseStorageClient(supabase: SupabaseClient): StorageClient {
  return {
    async exists(bucket, key) {
      const slash = key.lastIndexOf("/");
      const dir = slash === -1 ? "" : key.slice(0, slash);
      const name = slash === -1 ? key : key.slice(slash + 1);
      const { data, error } = await supabase.storage.from(bucket).list(dir, { search: name, limit: 1 });
      if (error) throw new Error(`storage.list failed: ${error.message}`);
      return (data ?? []).some((o) => o.name === name);
    },
    async put(bucket, key, bytes, contentType) {
      // upsert:false → content-addressed key means identical bytes never overwrite;
      // a genuine collision (same key, different bytes) would surface as an error.
      const { error } = await supabase.storage.from(bucket).upload(key, Buffer.from(bytes), {
        contentType,
        upsert: false,
        cacheControl: "3600",
      });
      if (error && !/exists/i.test(error.message)) throw new Error(`storage.upload failed: ${error.message}`);
    },
    async head(bucket, key) {
      const slash = key.lastIndexOf("/");
      const dir = slash === -1 ? "" : key.slice(0, slash);
      const name = slash === -1 ? key : key.slice(slash + 1);
      const { data, error } = await supabase.storage.from(bucket).list(dir, { search: name, limit: 1 });
      if (error) throw new Error(`storage.list failed: ${error.message}`);
      const obj = (data ?? []).find((o) => o.name === name);
      if (!obj) return null;
      const size = (obj.metadata?.size as number | undefined) ?? 0;
      const contentType = (obj.metadata?.mimetype as string | undefined) ?? "application/octet-stream";
      return { size, contentType };
    },
    async get(bucket, key) {
      const { data, error } = await supabase.storage.from(bucket).download(key);
      if (error) throw new Error(`storage.download failed: ${error.message}`);
      if (!data) return null;
      return new Uint8Array(await data.arrayBuffer());
    },
  };
}
