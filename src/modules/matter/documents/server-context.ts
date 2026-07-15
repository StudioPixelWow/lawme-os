/**
 * Documents server context (Capability 1, Slice A). SERVER-ONLY.
 *
 * Resolves everything a document route needs to enforce access and read/write
 * durably: the resolved {organizationId, matterId}, a repository bound to the
 * service client, and the selected storage adapter.
 *
 * Storage mode is EXPLICIT (LAWME_DOCUMENT_STORAGE_MODE):
 *  - supabase_dev → durable. If a required credential/binding is missing, return
 *    { error: "misconfigured" } so the route FAILS CLEARLY. Never silently falls
 *    back to memory, never pretends an upload succeeded.
 *  - memory (default) → the in-memory dev adapter, local demo only (org-demo/demo).
 *
 * Access model: production derives org/matter from the authenticated session;
 * the demo resolves the durable context by slug and self-seeds. Either way the
 * route only ever operates within the resolved organization + matter, and RLS is
 * the second layer.
 */
import {
  documentStorageMode, persistenceConfigError, serviceClient,
} from "../persistence/supabase-server.ts";
import { resolveMatterContext, ensureDemoSeed, type MatterContext } from "../persistence/matter-context.ts";
import { MatterDocumentsRepository } from "./repository.ts";
import { selectDocumentStorage } from "./storage-select.ts";
import { documentStorage } from "./storage.ts";
import type { DocumentStorage } from "./storage.ts";

export interface PersistedContext {
  persisted: true;
  ctx: MatterContext;
  repo: MatterDocumentsRepository;
  storage: DocumentStorage;
}
export interface DevContext {
  persisted: false;
  organizationId: string;
  matterId: string;
  storage: DocumentStorage;
}
export type DocumentsContext =
  | PersistedContext
  | DevContext
  | { error: "forbidden" }
  | { error: "misconfigured"; detail: string };

const DEMO_SLUG = "demo";

export async function resolveDocumentsContext(param: string): Promise<DocumentsContext> {
  if (documentStorageMode() === "supabase_dev") {
    // fail-closed: never fall back to memory when durable storage is required
    const cfg = persistenceConfigError();
    if (cfg) return { error: "misconfigured", detail: cfg };
    const db = serviceClient();
    let ctx = await resolveMatterContext(db, param);
    if (!ctx && param === DEMO_SLUG) ctx = await ensureDemoSeed(db);
    if (!ctx) return { error: "forbidden" };
    return { persisted: true, ctx, repo: new MatterDocumentsRepository(db), storage: selectDocumentStorage() };
  }

  // memory mode — local/offline demo only
  if (param !== DEMO_SLUG) return { error: "forbidden" };
  return { persisted: false, organizationId: "org-demo", matterId: DEMO_SLUG, storage: documentStorage };
}
